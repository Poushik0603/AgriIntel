"""Offline training script for the crop ML model.

Not imported by the running FastAPI service. Run manually whenever the
dataset or model configuration changes:

    cd backend/ml-crop-service
    pip install -r requirements.txt
    python training/train_model.py

Produces models/crop_model_v1.joblib and models/metadata.json.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split

SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

from app.models.schema import DEFAULT_CANDIDATE_CROPS  # noqa: E402

DATA_PATH = SERVICE_ROOT / "training" / "data" / "Crop_recommendation.csv"
MODEL_PATH = SERVICE_ROOT / "models" / "crop_model_v1.joblib"
METADATA_PATH = SERVICE_ROOT / "models" / "metadata.json"
MODEL_VERSION = "v1"

FEATURE_ORDER = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
RANDOM_STATE = 42


def main() -> None:
    import pandas as pd

    df = pd.read_csv(DATA_PATH)

    X = df[FEATURE_ORDER]
    y = df["label"].str.strip().str.title()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = float(model.score(X_test, y_test))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    print(f"Test accuracy: {accuracy:.4f}")
    print(f"Test macro-F1: {macro_f1:.4f}")
    print(classification_report(y_test, y_pred, zero_division=0))

    all_class_labels = sorted(model.classes_.tolist())
    covered_crops = sorted(set(all_class_labels) & set(DEFAULT_CANDIDATE_CROPS))
    uncovered_crops = sorted(set(DEFAULT_CANDIDATE_CROPS) - set(covered_crops))

    print(f"Covered crops (in Kaggle label space): {covered_crops}")
    print(f"Uncovered crops (fall back to rule-based scoring): {uncovered_crops}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    metadata = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "feature_order": FEATURE_ORDER,
        "all_class_labels": all_class_labels,
        "covered_crops": covered_crops,
        "metrics": {
            "accuracy": accuracy,
            "macro_f1": macro_f1,
            "classification_report": report,
        },
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2))

    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()
