import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppContext } from "../app/AppContext";
import { marketDataService, priceService } from "../services/api";
import { formatCurrency, formatDateShort } from "../utils/formatters";

const defaultContracts = [
  { cropName: "Wheat", marketName: "CBOT", price: 684, recordDate: "2026-03-20" },
  { cropName: "Maize", marketName: "NCDEX", price: 452, recordDate: "2026-04-12" },
  { cropName: "Soybeans", marketName: "MATIF", price: 1190, recordDate: "2026-04-22" },
  { cropName: "Cotton", marketName: "MCX", price: 712, recordDate: "2026-04-28" },
];

export default function MarketDataPage() {
  const [searchParams] = useSearchParams();
  const { apiBase, session } = useAppContext();
  const [crop, setCrop] = useState(searchParams.get("crop") || "Rice");
  const [prediction, setPrediction] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cropFromQuery = searchParams.get("crop");
    if (cropFromQuery) {
      setCrop(cropFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    marketDataService
      .list(apiBase, session?.token)
      .then((response) => {
        if (!cancelled) {
          setRecords(Array.isArray(response) && response.length ? response : defaultContracts);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecords(defaultContracts);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, session?.token]);

  async function runPrediction(event) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await priceService.predict(crop, apiBase, session?.token);
      setPrediction(Array.isArray(response) ? response[0] : response);
    } catch (submitError) {
      setPrediction(null);
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop]);

  const trendBars = useMemo(() => {
    const source = records.length ? records : defaultContracts;
    return source.slice(-8).map((item) => ({
      label: item.cropName,
      value: Number(item.price || 0),
    }));
  }, [records]);

  const predictionBars = prediction
    ? [
        { label: "Base", value: Number(prediction.basePrice || 0) },
        { label: "Predicted", value: Number(prediction.predictedPrice || 0) },
      ]
    : [];

  return (
    <div className="market-page">
      <section className="market-layout">
        <div className="market-main">
          <form className="market-filters" onSubmit={runPrediction}>
            <label>
              Crop
              <select value={crop} onChange={(event) => setCrop(event.target.value)}>
                <option value="Rice">Rice</option>
                <option value="Wheat">Wheat</option>
                <option value="Millet">Millet</option>
                <option value="Cotton">Cotton</option>
                <option value="Maize">Maize</option>
                <option value="Sorghum">Sorghum</option>
                <option value="Groundnut">Groundnut</option>
              </select>
            </label>
            <label>
              Horizon
              <select defaultValue="90">
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 180 days</option>
              </select>
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Predicting..." : "Run prediction"}
            </button>
          </form>

          {error ? <div className="workspace-message error">{error}</div> : null}

          <article className="contracts-card">
            <div className="section-heading">
              <h2>Active Contracts</h2>
              <span className="filter-icon" />
            </div>
            <div className="contract-table">
              <div className="contract-row header">
                <span>Crop</span>
                <span>Market</span>
                <span>Price</span>
                <span>Contract date</span>
              </div>
              {(records.length ? records : defaultContracts).slice(0, 6).map((item, index) => (
                <div className="contract-row" key={`${item.cropName}-${item.marketName}-${index}`}>
                  <span>
                    <i />
                    {item.cropName}
                  </span>
                  <span>{item.marketName}</span>
                  <span>{formatCurrency(item.price)}</span>
                  <span>{formatDateShort(item.recordDate)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="prediction-card">
            <div>
              <span>Selected crop price prediction</span>
              <h2>{prediction ? formatCurrency(prediction.predictedPrice) : "Awaiting service"}</h2>
              <p>
                {prediction
                  ? `${prediction.crop} forecast for ${prediction.season}. Base price is ${formatCurrency(prediction.basePrice)}.`
                  : "Run a crop prediction to compare base and predicted values."}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={predictionBars}>
                <XAxis dataKey="label" stroke="#7d8982" />
                <YAxis stroke="#7d8982" />
                <Tooltip />
                <Bar dataKey="value" fill="#b7dccd" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>
        </div>

        <aside className="market-side">
          <article>
            <div className="section-heading">
              <h2>Trend Intelligence</h2>
              <span className="trend-icon" />
            </div>
            <p>
              {crop} prices show a guarded upward bias as weather, freight, and projected yield signals move through
              the model.
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={trendBars}>
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="#9fbdb1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="confidence-row">
              <span>Confidence score</span>
              <strong>{prediction?.confidence ? `${prediction.confidence}%` : "88.4%"}</strong>
            </div>
          </article>

          <article>
            <div className="section-heading">
              <h2>Market Alerts</h2>
            </div>
            <div className="alert-card">
              <strong>Logistics delay</strong>
              <p>Regional freight pressure may affect short-term delivery windows.</p>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
