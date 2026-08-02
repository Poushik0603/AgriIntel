import json
from pathlib import Path

import joblib
import numpy as np

from app.models.schema import CropPrediction, PredictResponse


class ModelArtifactError(RuntimeError):
    pass


class CropPredictor:
    def __init__(self, model_path: Path, metadata_path: Path):
        if not model_path.exists():
            raise ModelArtifactError(
                f"Model artifact not found at {model_path}. Run training/train_model.py first."
            )
        if not metadata_path.exists():
            raise ModelArtifactError(
                f"Model metadata not found at {metadata_path}. Run training/train_model.py first."
            )

        self.model = joblib.load(model_path)
        self.metadata = json.loads(metadata_path.read_text())
        self.model_version: str = self.metadata["model_version"]
        self.feature_order: list[str] = self.metadata["feature_order"]

        model_classes = sorted(self.model.classes_.tolist())
        metadata_classes = sorted(self.metadata["all_class_labels"])
        if model_classes != metadata_classes:
            raise ModelArtifactError(
                "Model artifact classes do not match metadata.json all_class_labels; "
                "artifact and metadata are out of sync. Retrain with training/train_model.py."
            )

    def predict(
        self,
        nitrogen: float,
        phosphorus: float,
        potassium: float,
        temperature: float,
        humidity: float,
        ph: float,
        rainfall: float,
        candidate_crops: list[str],
    ) -> PredictResponse:
        feature_values = {
            "N": nitrogen,
            "P": phosphorus,
            "K": potassium,
            "temperature": temperature,
            "humidity": humidity,
            "ph": ph,
            "rainfall": rainfall,
        }
        vector = np.array([[feature_values[name] for name in self.feature_order]])

        probabilities = self.model.predict_proba(vector)[0]
        class_labels = self.model.classes_

        candidate_set = set(candidate_crops)
        covered_crops = sorted(candidate_set & set(class_labels))
        uncovered_crops = sorted(candidate_set - set(class_labels))

        predictions = [
            CropPrediction(crop=str(label), probability=float(prob))
            for label, prob in zip(class_labels, probabilities)
            if label in covered_crops
        ]
        predictions.sort(key=lambda p: p.probability, reverse=True)

        return PredictResponse(
            model_version=self.model_version,
            predictions=predictions,
            covered_crops=covered_crops,
            uncovered_crops=uncovered_crops,
        )
