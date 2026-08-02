"""Offline training script for the price prediction model(s).

Not imported by the running FastAPI service. Run manually whenever the
dataset changes:

    cd backend/ml-price-service
    pip install -r requirements.txt
    python training/fetch_training_data.py
    python training/eda.py             # inspect training/eda_output/, decide per-crop model type
    python training/train_model.py

Produces, in models/:
  - prophet_<crop>.joblib      for each crop assigned "time_series"
  - price_regression_v1.joblib for the pooled regression model, if any crop
                                is assigned "regression"
  - metadata.json               model_version, crop_model_types, feature
                                order, trailing averages, metrics

MODEL_ASSIGNMENT_OVERRIDES below should be set from eda.py's printed
recommendation after you've looked at training/eda_output/ plots — it is
intentionally a manual, reviewed step rather than an automatic decision,
since a bad automatic call (e.g. fitting Prophet to 12 noisy points) fails
silently at serving time otherwise. Any crop not listed here defaults to
"regression".
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

from app.models.schema import DEFAULT_CANDIDATE_CROPS  # noqa: E402

DATA_PATH = SERVICE_ROOT / "training" / "data" / "crop_price_history.csv"
MODELS_DIR = SERVICE_ROOT / "models"
METADATA_PATH = MODELS_DIR / "metadata.json"
MODEL_VERSION = "v1"

# Fill in from `python training/eda.py`'s printed recommendation, e.g.:
# MODEL_ASSIGNMENT_OVERRIDES = {"Rice": "time_series", "Cotton": "regression"}
MODEL_ASSIGNMENT_OVERRIDES: dict[str, str] = {}

TEST_HOLDOUT_DAYS = 30
REGRESSION_FEATURE_ORDER = ["month", "day_of_year", "season_summer", "season_winter", "trailing_avg_price"]


def season_for_month(month: int) -> str:
    if 3 <= month <= 6:
        return "Summer"
    if month >= 11 or month <= 2:
        return "Winter"
    return "Monsoon"


def time_based_split(df: pd.DataFrame, date_col: str, holdout_days: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Train on everything before the cutoff, test on everything after —
    never a random split, which would leak future prices into training
    and produce misleadingly optimistic offline metrics for a forecasting task.
    """
    cutoff = df[date_col].max() - pd.Timedelta(days=holdout_days)
    train = df[df[date_col] <= cutoff]
    test = df[df[date_col] > cutoff]
    return train, test


def train_time_series(df: pd.DataFrame, crop: str) -> dict:
    from prophet import Prophet

    crop_df = df[df["cropName"] == crop]
    daily = crop_df.groupby("recordDate", as_index=False)["price"].mean()
    daily = daily.rename(columns={"recordDate": "ds", "price": "y"}).sort_values("ds")

    train_df, test_df = time_based_split(daily.rename(columns={"ds": "recordDate"}), "recordDate", TEST_HOLDOUT_DAYS)
    train_df = train_df.rename(columns={"recordDate": "ds"})
    test_df = test_df.rename(columns={"recordDate": "ds"})

    model = Prophet()
    model.fit(train_df[["ds", "y"]])

    metrics = {}
    if not test_df.empty:
        forecast = model.predict(test_df[["ds"]])
        y_true = test_df["y"].values
        y_pred = forecast["yhat"].values
        metrics = {
            "mae": float(mean_absolute_error(y_true, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
            "test_points": int(len(test_df)),
        }
    else:
        metrics = {"note": "insufficient data for a held-out test window"}

    # Refit on full series so the served model uses all available history.
    model_full = Prophet()
    model_full.fit(daily[["ds", "y"]])

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_full, MODELS_DIR / f"prophet_{crop.lower()}.joblib")

    print(f"[{crop}] time_series trained on {len(train_df)} pts, tested on {len(test_df)} pts: {metrics}")
    return metrics


def build_regression_features(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    df = df.copy()
    df["month"] = df["recordDate"].dt.month
    df["day_of_year"] = df["recordDate"].dt.dayofyear
    season = df["month"].apply(season_for_month)
    df["season_summer"] = (season == "Summer").astype(int)
    df["season_winter"] = (season == "Winter").astype(int)

    # Trailing average price per (crop, market) computed on the training
    # window only, to avoid leaking future prices into the feature.
    trailing = df.groupby(["cropName", "marketName"])["price"].mean()
    df["trailing_avg_price"] = df.apply(
        lambda row: trailing.get((row["cropName"], row["marketName"]), df["price"].mean()), axis=1
    )

    trailing_avg_by_key = {f"{crop}||{market}": float(v) for (crop, market), v in trailing.items()}
    crop_avg = df.groupby("cropName")["price"].mean()
    for crop, v in crop_avg.items():
        trailing_avg_by_key[f"{crop}||__crop_avg__"] = float(v)

    return df, trailing_avg_by_key


def train_regression(df: pd.DataFrame, crops: list[str]) -> tuple[dict, dict]:
    regression_df = df[df["cropName"].isin(crops)].copy()
    regression_df, trailing_avg_by_key = build_regression_features(regression_df)

    train_df, test_df = time_based_split(regression_df, "recordDate", TEST_HOLDOUT_DAYS)

    X_train = train_df[REGRESSION_FEATURE_ORDER]
    y_train = train_df["price"]

    model = RandomForestRegressor(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)

    metrics = {}
    if not test_df.empty:
        X_test = test_df[REGRESSION_FEATURE_ORDER]
        y_test = test_df["price"]
        y_pred = model.predict(X_test)
        metrics = {
            "mae": float(mean_absolute_error(y_test, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
            "test_points": int(len(test_df)),
        }
    else:
        metrics = {"note": "insufficient data for a held-out test window"}

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / "price_regression_v1.joblib")

    print(f"Regression trained on {len(train_df)} pts, tested on {len(test_df)} pts: {metrics}")
    return metrics, trailing_avg_by_key


def main() -> None:
    if not DATA_PATH.exists():
        print(f"{DATA_PATH} not found. Run training/fetch_training_data.py first.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH, parse_dates=["recordDate"])
    available_crops = sorted(set(df["cropName"].unique()) & set(DEFAULT_CANDIDATE_CROPS))

    crop_model_types = {
        crop: MODEL_ASSIGNMENT_OVERRIDES.get(crop, "regression")
        for crop in available_crops
    }

    time_series_crops = [c for c, t in crop_model_types.items() if t == "time_series"]
    regression_crops = [c for c, t in crop_model_types.items() if t == "regression"]

    all_metrics = {"time_series": {}, "regression": None}

    for crop in time_series_crops:
        all_metrics["time_series"][crop] = train_time_series(df, crop)

    trailing_avg_by_key = {}
    if regression_crops:
        all_metrics["regression"], trailing_avg_by_key = train_regression(df, regression_crops)

    metadata = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "crop_model_types": crop_model_types,
        "regression_feature_order": REGRESSION_FEATURE_ORDER,
        "regression_trailing_avg": trailing_avg_by_key,
        "metrics": all_metrics,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2, default=str))

    print(f"\nCrop model assignment: {crop_model_types}")
    print(f"Saved metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()
