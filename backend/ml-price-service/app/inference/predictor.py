import json
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.models.schema import PredictResponse


class ModelArtifactError(RuntimeError):
    pass


class PricePredictor:
    """Serves predictions from whichever model family training assigned to
    each crop (see backend/ml-price-service/training/train_model.py). A crop
    is either backed by a per-crop Prophet time-series model or by the
    shared tabular regression model, per metadata.json's `crop_model_types`.
    Crops with neither are reported as uncovered so price-service falls
    back to its own rule-based prediction.
    """

    def __init__(self, models_dir: Path, metadata_path: Path):
        if not metadata_path.exists():
            raise ModelArtifactError(
                f"Model metadata not found at {metadata_path}. Run training/train_model.py first."
            )

        self.metadata = json.loads(metadata_path.read_text())
        self.model_version: str = self.metadata["model_version"]
        self.crop_model_types: dict[str, str] = self.metadata["crop_model_types"]
        self.covered_crops: list[str] = sorted(self.crop_model_types.keys())

        self._time_series_models: dict[str, object] = {}
        self._regression_model = None
        self._regression_feature_order: list[str] | None = None
        self._regression_trailing_avg: dict[tuple[str, str], float] | None = None

        for crop, model_type in self.crop_model_types.items():
            if model_type == "time_series":
                path = models_dir / f"prophet_{crop.lower()}.joblib"
                if not path.exists():
                    raise ModelArtifactError(f"Missing time-series artifact for {crop} at {path}")
                self._time_series_models[crop] = joblib.load(path)

        if any(t == "regression" for t in self.crop_model_types.values()):
            regression_path = models_dir / "price_regression_v1.joblib"
            if not regression_path.exists():
                raise ModelArtifactError(f"Missing regression artifact at {regression_path}")
            self._regression_model = joblib.load(regression_path)
            self._regression_feature_order = self.metadata["regression_feature_order"]
            self._regression_trailing_avg = {
                tuple(key.split("||")): value
                for key, value in self.metadata["regression_trailing_avg"].items()
            }

    def predict(self, crop: str, market_name: str, target_date: date, candidate_crops: list[str]) -> PredictResponse:
        candidate_set = set(candidate_crops)
        covered = sorted(candidate_set & set(self.covered_crops))
        uncovered = sorted(candidate_set - set(self.covered_crops))

        model_type = self.crop_model_types.get(crop)
        if model_type is None:
            raise ValueError(f"Crop '{crop}' is not covered by this model")

        if model_type == "time_series":
            predicted_price, confidence = self._predict_time_series(crop, target_date)
        else:
            predicted_price, confidence = self._predict_regression(crop, market_name, target_date)

        return PredictResponse(
            model_version=self.model_version,
            crop=crop,
            predicted_price=predicted_price,
            confidence=confidence,
            model_type=model_type,
            covered_crops=covered,
            uncovered_crops=uncovered,
        )

    def _predict_time_series(self, crop: str, target_date: date) -> tuple[float, float]:
        model = self._time_series_models[crop]
        future = pd.DataFrame({"ds": [pd.Timestamp(target_date)]})
        forecast = model.predict(future)
        row = forecast.iloc[0]
        predicted_price = max(float(row["yhat"]), 0.0)
        interval_width = float(row["yhat_upper"]) - float(row["yhat_lower"])
        confidence = max(0.0, min(1.0, 1.0 - (interval_width / (predicted_price * 2 + 1e-6))))
        return predicted_price, confidence

    def _predict_regression(self, crop: str, market_name: str, target_date: date) -> tuple[float, float]:
        trailing_avg = self._regression_trailing_avg.get((crop, market_name))
        if trailing_avg is None:
            trailing_avg = self._regression_trailing_avg.get((crop, "__crop_avg__"), 0.0)

        month = target_date.month
        season = _season_for_month(month)
        feature_row = {
            "month": month,
            "day_of_year": target_date.timetuple().tm_yday,
            "season_summer": 1 if season == "Summer" else 0,
            "season_winter": 1 if season == "Winter" else 0,
            "trailing_avg_price": trailing_avg,
        }
        vector = np.array([[feature_row[name] for name in self._regression_feature_order]])
        predicted_price = max(float(self._regression_model.predict(vector)[0]), 0.0)
        return predicted_price, 0.6


def _season_for_month(month: int) -> str:
    if 3 <= month <= 6:
        return "Summer"
    if month >= 11 or month <= 2:
        return "Winter"
    return "Monsoon"
