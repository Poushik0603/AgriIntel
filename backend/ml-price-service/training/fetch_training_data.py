"""Export crop_price_history from market-data-service to a local CSV for
training. Not imported by the running FastAPI service — run manually
whenever you want to retrain on the latest ingested data:

    cd backend/ml-price-service
    pip install -r requirements.txt
    MARKET_DATA_SERVICE_URL=http://localhost:8085 python training/fetch_training_data.py

Produces training/data/crop_price_history.csv.
"""

import csv
import os
from pathlib import Path

import requests

MARKET_DATA_SERVICE_URL = os.environ.get("MARKET_DATA_SERVICE_URL", "http://localhost:8085")
OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "crop_price_history.csv"


def main() -> None:
    response = requests.get(f"{MARKET_DATA_SERVICE_URL}/market-data", timeout=60)
    response.raise_for_status()
    rows = response.json()

    if not rows:
        print("No rows returned from market-data-service. Run the ingestion pipeline first.")
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["cropName", "price", "marketName", "recordDate"]
    with OUTPUT_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row[key] for key in fieldnames})

    print(f"Wrote {len(rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
