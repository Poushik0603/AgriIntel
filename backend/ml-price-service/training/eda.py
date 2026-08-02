"""Exploratory data analysis over crop_price_history.csv — run this BEFORE
writing/tuning train_model.py. It answers the question train_model.py's
model choice depends on: does this crop's price history have enough
date-ordered depth and real autocorrelation to justify a time-series model
(Prophet), or is it still too sparse and better served by the pooled
tabular regression fallback?

    cd backend/ml-price-service
    python training/fetch_training_data.py   # if not already run
    python training/eda.py

Writes plots to training/eda_output/ and prints a decision table to
stdout. Nothing here is imported by the running service or by
train_model.py — it's a one-time (or occasional re-run) human-in-the-loop
step; train_model.py's MODEL_ASSIGNMENT_OVERRIDES constant is where you
act on what this script shows you.

Decision rule (see plan/README for full rationale):
  - >= MIN_POINTS_FOR_TIME_SERIES date-ordered points for a crop, spanning
    >= MIN_DATE_SPAN_DAYS days, with |ACF(lag=7)| >= ACF_THRESHOLD
    -> time-series candidate
  - otherwise -> regression fallback
"""

import sys
from pathlib import Path

import pandas as pd

DATA_PATH = Path(__file__).resolve().parent / "data" / "crop_price_history.csv"
OUTPUT_DIR = Path(__file__).resolve().parent / "eda_output"

MIN_POINTS_FOR_TIME_SERIES = 30
MIN_DATE_SPAN_DAYS = 60
ACF_THRESHOLD = 0.2


def load_data() -> pd.DataFrame:
    if not DATA_PATH.exists():
        print(f"{DATA_PATH} not found. Run training/fetch_training_data.py first.")
        sys.exit(1)
    df = pd.read_csv(DATA_PATH, parse_dates=["recordDate"])
    df = df.sort_values("recordDate")
    return df


def crop_level_series(df: pd.DataFrame, crop: str) -> pd.Series:
    crop_df = df[df["cropName"] == crop]
    daily = crop_df.groupby("recordDate")["price"].mean()
    return daily


def acf_at_lag(series: pd.Series, lag: int) -> float | None:
    if len(series) <= lag + 1:
        return None
    from statsmodels.tsa.stattools import acf

    values = series.values
    result = acf(values, nlags=lag, fft=True)
    return float(result[lag])


def plot_series(series: pd.Series, crop: str) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(10, 4))
    series.plot(ax=ax, marker="o", markersize=3)
    ax.set_title(f"{crop}: mean daily price (all markets)")
    ax.set_xlabel("date")
    ax.set_ylabel("price")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / f"{crop.lower()}_timeplot.png")
    plt.close(fig)

    if len(series) > 10:
        try:
            from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

            fig, axes = plt.subplots(1, 2, figsize=(12, 4))
            plot_acf(series.values, ax=axes[0], lags=min(20, len(series) // 2))
            plot_pacf(series.values, ax=axes[1], lags=min(20, len(series) // 2))
            fig.suptitle(f"{crop}: ACF / PACF")
            fig.tight_layout()
            fig.savefig(OUTPUT_DIR / f"{crop.lower()}_acf_pacf.png")
            plt.close(fig)
        except Exception as e:
            print(f"  (skipped ACF/PACF plot for {crop}: {e})")


def main() -> None:
    df = load_data()
    crops = sorted(df["cropName"].unique())

    print(f"Loaded {len(df)} rows spanning {df['recordDate'].min().date()} to {df['recordDate'].max().date()}")
    print(f"Crops: {crops}\n")

    print("Row counts and coverage per crop x market:")
    coverage = df.groupby(["cropName", "marketName"]).agg(
        n_rows=("price", "size"),
        first_date=("recordDate", "min"),
        last_date=("recordDate", "max"),
    ).reset_index()
    coverage["span_days"] = (coverage["last_date"] - coverage["first_date"]).dt.days
    print(coverage.to_string(index=False))
    print()

    print(f"{'Crop':<12} {'n_points':>9} {'span_days':>10} {'acf_lag7':>10}  Recommendation")
    print("-" * 70)
    decisions = {}
    for crop in crops:
        series = crop_level_series(df, crop)
        n_points = len(series)
        span_days = (series.index.max() - series.index.min()).days if n_points > 1 else 0
        lag7 = acf_at_lag(series, 7)
        lag7_display = f"{lag7:.2f}" if lag7 is not None else "n/a"

        qualifies = (
            n_points >= MIN_POINTS_FOR_TIME_SERIES
            and span_days >= MIN_DATE_SPAN_DAYS
            and lag7 is not None
            and abs(lag7) >= ACF_THRESHOLD
        )
        recommendation = "time_series" if qualifies else "regression"
        decisions[crop] = recommendation

        print(f"{crop:<12} {n_points:>9} {span_days:>10} {lag7_display:>10}  {recommendation}")

        plot_series(series, crop)

    print(f"\nPlots written to {OUTPUT_DIR}/")
    print("\nSuggested MODEL_ASSIGNMENT_OVERRIDES for training/train_model.py (edit manually — this is a recommendation, not an automatic write):")
    print(decisions)


if __name__ == "__main__":
    main()
