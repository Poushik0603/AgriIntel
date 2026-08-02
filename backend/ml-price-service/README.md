# ml-price-service

Standalone Python/FastAPI microservice that does ML-based crop price
prediction for AgriIntel. It owns no database and does not register with
Eureka — it is a plain internal HTTP service that the Java `price-service`
calls for prediction, falling back to its own seasonal-multiplier logic if
this service is unreachable or doesn't cover a requested crop.

## Data source

Training data comes from `market-data-service`'s `crop_price_history`
table, which is populated by the ingestion pipeline at
`backend/market-data-service/ingestion/` (pulls real mandi prices from the
Government of India's Agmarknet open dataset). See that directory's
README for how to run ingestion.

## Model

Price is fundamentally a time-series problem (today's price is correlated
with yesterday's), but time-series models (Prophet) only fit reliably with
real per-crop depth of history. Whether a given crop has enough history is
an empirical question answered by `training/eda.py`, not assumed — so
each crop is independently assigned either a Prophet time-series model or
the shared `RandomForestRegressor` fallback, recorded in
`models/metadata.json`'s `crop_model_types`. Crops with neither model
(never ingested) are reported to `price-service` as uncovered, which
falls back to its own rule-based prediction.

## Train the model

```
cd backend/ml-price-service
python -m venv .venv
.venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt

python training/fetch_training_data.py   # exports crop_price_history.csv from market-data-service
python training/eda.py                   # inspect training/eda_output/ plots + printed recommendation
# edit training/train_model.py's MODEL_ASSIGNMENT_OVERRIDES based on the eda.py recommendation
python training/train_model.py
```

This produces `models/prophet_<crop>.joblib` per time-series-assigned
crop, `models/price_regression_v1.joblib` if any crop uses the regression
fallback, and `models/metadata.json`. Re-run whenever the ingested data
changes meaningfully. Unlike `ml-crop-service`, these model artifacts are
**not** committed to the repo (real price data + regularly retrained
models don't belong in git history) — see `.gitignore`.

## Run locally

```
uvicorn app.main:app --reload --port 8000
```

```
curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d "{\"crop\":\"Rice\",\"market_name\":\"Nashik\",\"target_date\":\"2026-09-01\"}"
curl http://localhost:8000/health
```

## Docker

```
docker build -t ml-price-service .
docker run -p 8001:8000 ml-price-service
```

Or via `docker-compose up` from `backend/` (see `../docker-compose.yml`).
Note the model must be trained (`models/` populated) before building the
image, since the Dockerfile copies `models/` in as-is.
