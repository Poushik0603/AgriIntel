# market-data-service ingestion

Fetches real mandi (wholesale market) prices from the Government of
India's Agmarknet open dataset on data.gov.in and loads them into
`market-data-service`'s `crop_price_history` table, so the price
prediction model has real data to train on instead of the hand-seeded
`crop_base_prices` rows in `price-service`.

## Get an API key (manual, one-time)

1. Register a free account at https://www.data.gov.in
2. Sign in → My Account → API Keys → generate a key
3. Export it as `DATA_GOV_IN_API_KEY`

The public demo key that appears in tutorials online is capped at ~10
records per request and is not usable for real ingestion — you need your
own key.

## Run

```
cd backend/market-data-service/ingestion
pip install -r requirements.txt
export DATA_GOV_IN_API_KEY=your-key-here      # or `set` on Windows cmd
export MARKET_DATA_SERVICE_URL=http://localhost:8085   # default; override for docker-compose (http://market-data-service:8085)
python fetch_agmarknet_prices.py
```

Safe to re-run: it checks `market-data-service` for existing
(crop, market, date) records in the fetched date range and skips
duplicates before inserting. The `crop_price_history` table also has a DB
unique constraint on `(crop_name, market_name, record_date)` as a second
line of defense.

## Scheduling

No in-repo scheduler exists yet. Run this daily via cron
(`0 6 * * * cd .../ingestion && python fetch_agmarknet_prices.py`) or
Windows Task Scheduler. Adding an automated scheduler inside the
application is a reasonable future improvement, not implemented here.

## Data mapping

Agmarknet commodity names are mapped to AgriIntel's crop names in
`CROP_NAME_MAP` in `fetch_agmarknet_prices.py` (e.g. `Bajra(Pearl
Millet/Cumbu)` → `Millet`, `Jowar(Sorghum)` → `Sorghum`). Records with a
non-numeric or zero `modal_price`, missing `arrival_date`, or unmapped
commodity are dropped.
