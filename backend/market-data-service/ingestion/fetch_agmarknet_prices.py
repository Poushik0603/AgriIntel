"""Fetch daily mandi prices from the data.gov.in Agmarknet API and load
them into market-data-service's crop_price_history table.

Run manually or on a schedule (see README.md in this directory):

    cd backend/market-data-service/ingestion
    pip install -r requirements.txt
    DATA_GOV_IN_API_KEY=... python fetch_agmarknet_prices.py

Dedup: before inserting, existing records for the date range are fetched
from market-data-service and any (crop, market, date) triple already
present is skipped. The service also enforces a DB-level unique
constraint on (crop_name, market_name, record_date) as a second guard.
"""

import logging
import os
import sys
from datetime import date, datetime, timedelta

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fetch_agmarknet_prices")

AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
AGMARKNET_URL = f"https://api.data.gov.in/resource/{AGMARKNET_RESOURCE_ID}"

# Agmarknet commodity name -> AgriIntel crop name
CROP_NAME_MAP = {
    "Rice": "Rice",
    "Paddy(Dhan)(Common)": "Rice",
    "Wheat": "Wheat",
    "Bajra(Pearl Millet/Cumbu)": "Millet",
    "Cotton": "Cotton",
    "Maize": "Maize",
    "Jowar(Sorghum)": "Sorghum",
    "Groundnut": "Groundnut",
}

PAGE_SIZE = 500

MARKET_DATA_SERVICE_URL = os.environ.get("MARKET_DATA_SERVICE_URL", "http://localhost:8085")
DATA_GOV_IN_API_KEY = os.environ.get("DATA_GOV_IN_API_KEY")


def fetch_commodity_records(commodity: str, api_key: str) -> list[dict]:
    records = []
    offset = 0
    while True:
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": PAGE_SIZE,
            "offset": offset,
            "filters[commodity]": commodity,
        }
        response = requests.get(AGMARKNET_URL, params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
        page_records = payload.get("records", [])
        if not page_records:
            break
        records.extend(page_records)
        offset += PAGE_SIZE
        if len(page_records) < PAGE_SIZE:
            break
    return records


def parse_arrival_date(raw: str) -> date | None:
    try:
        return datetime.strptime(raw, "%d/%m/%Y").date()
    except (ValueError, TypeError):
        return None


def to_crop_price_history(record: dict) -> dict | None:
    crop_name = CROP_NAME_MAP.get(record.get("commodity"))
    if crop_name is None:
        return None

    record_date = parse_arrival_date(record.get("arrival_date"))
    if record_date is None:
        return None

    market_name = record.get("market")
    if not market_name:
        return None

    try:
        price = float(record.get("modal_price"))
    except (TypeError, ValueError):
        return None
    if price <= 0:
        return None

    return {
        "cropName": crop_name,
        "price": price,
        "marketName": market_name,
        "recordDate": record_date.isoformat(),
    }


def fetch_existing_keys(from_date: date, to_date: date) -> set[tuple[str, str, str]]:
    response = requests.get(
        f"{MARKET_DATA_SERVICE_URL}/market-data",
        params={"fromDate": from_date.isoformat(), "toDate": to_date.isoformat()},
        timeout=30,
    )
    response.raise_for_status()
    return {
        (row["cropName"], row["marketName"], row["recordDate"])
        for row in response.json()
    }


def ingest(rows: list[dict]) -> int:
    if not rows:
        return 0
    response = requests.post(f"{MARKET_DATA_SERVICE_URL}/market-data/ingest", json=rows, timeout=60)
    response.raise_for_status()
    return response.json()["inserted"]


def main() -> None:
    if not DATA_GOV_IN_API_KEY:
        logger.error("DATA_GOV_IN_API_KEY is not set. Register at https://www.data.gov.in for a key.")
        sys.exit(1)

    all_rows: list[dict] = []
    for commodity in CROP_NAME_MAP:
        logger.info("Fetching %s from Agmarknet", commodity)
        records = fetch_commodity_records(commodity, DATA_GOV_IN_API_KEY)
        logger.info("  %d raw records", len(records))
        for record in records:
            row = to_crop_price_history(record)
            if row is not None:
                all_rows.append(row)

    if not all_rows:
        logger.info("No usable records fetched; nothing to ingest.")
        return

    dates = [datetime.fromisoformat(r["recordDate"]).date() for r in all_rows]
    from_date, to_date = min(dates), max(dates)
    logger.info("Checking for existing records between %s and %s", from_date, to_date)
    existing_keys = fetch_existing_keys(from_date, to_date)

    new_rows = [
        row for row in all_rows
        if (row["cropName"], row["marketName"], row["recordDate"]) not in existing_keys
    ]
    logger.info("%d new rows out of %d fetched (skipped %d duplicates)",
                len(new_rows), len(all_rows), len(all_rows) - len(new_rows))

    inserted = ingest(new_rows)
    logger.info("Inserted %d rows into crop_price_history", inserted)


if __name__ == "__main__":
    main()
