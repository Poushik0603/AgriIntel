INSERT INTO crop_base_prices (crop_name, base_price)
SELECT * FROM (SELECT 'Rice', 2000.00) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM crop_base_prices WHERE crop_name = 'Rice');

INSERT INTO crop_base_prices (crop_name, base_price)
SELECT * FROM (SELECT 'Wheat', 1800.00) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM crop_base_prices WHERE crop_name = 'Wheat');

INSERT INTO crop_base_prices (crop_name, base_price)
SELECT * FROM (SELECT 'Millet', 1600.00) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM crop_base_prices WHERE crop_name = 'Millet');

INSERT INTO crop_base_prices (crop_name, base_price)
SELECT * FROM (SELECT 'Cotton', 2100.00) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM crop_base_prices WHERE crop_name = 'Cotton');

INSERT INTO crop_base_prices (crop_name, base_price)
SELECT * FROM (SELECT 'Maize', 1450.00) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM crop_base_prices WHERE crop_name = 'Maize');

INSERT INTO crop_base_prices (crop_name, base_price)
SELECT * FROM (SELECT 'Sorghum', 1320.00) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM crop_base_prices WHERE crop_name = 'Sorghum');

INSERT INTO crop_base_prices (crop_name, base_price)
SELECT * FROM (SELECT 'Groundnut', 2350.00) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM crop_base_prices WHERE crop_name = 'Groundnut');
