# ml-crop-service

Standalone Python/FastAPI microservice that does ML-based crop suitability
inference for AgriIntel. It owns no database and does not register with
Eureka — it is a plain internal HTTP service that the Java `crop-service`
calls for scoring, falling back to its own rule-based logic if this service
is unreachable or doesn't cover a requested crop.

## Data source

`training/data/Crop_recommendation.csv` is the public Kaggle "Crop
Recommendation Dataset" (N, P, K, temperature, humidity, ph, rainfall →
crop label; 22 crop classes, ~2200 rows), originally listed on Kaggle under
a CC0/public-domain license. This copy was pulled from a GitHub mirror
(`Gladiator07/Harvestify`, which is GPL-3 licensed for its own code) because
Kaggle requires authentication to download directly. **Verify the dataset's
license terms against the current Kaggle listing before relying on this in
a production/distributed build.**

Only 3 of AgriIntel's 7 supported crops (Rice, Maize, Cotton) exist in this
dataset's label space. Millet, Wheat, Sorghum, and Groundnut are not
covered — `crop-service` keeps using its existing rule-based scoring for
those. See `metadata.json`'s `covered_crops`/`uncovered_crops` after
training.

## Train the model

```
cd backend/ml-crop-service
python -m venv .venv
.venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python training/train_model.py
```

This produces `models/crop_model_v1.joblib` and `models/metadata.json`.
Re-run whenever the dataset or training script changes. The trained
artifact is committed to the repo so `docker build` works without
requiring every developer to retrain first — if you'd rather build the
artifact in CI instead, that's a reasonable alternative not implemented
here.

## Run locally

```
uvicorn app.main:app --reload --port 8000
```

```
curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d "{\"nitrogen\":62,\"phosphorus\":40,\"potassium\":55,\"temperature\":28,\"humidity\":65,\"ph\":6.4,\"rainfall\":120}"
curl http://localhost:8000/health
```

## Docker

```
docker build -t ml-crop-service .
docker run -p 8000:8000 ml-crop-service
```

Or via `docker-compose up` from `backend/` (see `../docker-compose.yml`).
