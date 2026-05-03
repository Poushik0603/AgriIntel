import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppContext } from "../app/AppContext";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import AlertState from "../components/ui/AlertState";
import EmptyState from "../components/ui/EmptyState";
import { priceService } from "../services/api";
import { formatCurrency } from "../utils/formatters";

export default function PricePredictionPage() {
  const { apiBase, session } = useAppContext();
  const [crop, setCrop] = useState("Rice");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await priceService.predict(crop, apiBase, session?.token);
      setResult(response);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { label: "Base", value: Number(result.basePrice) },
      { label: "Predicted", value: Number(result.predictedPrice) },
    ];
  }, [result]);

  return (
    <div className="page-grid two-column">
      <Card title="Price prediction request" subtitle="Pick a crop from the seeded catalog and compare its predicted seasonal value.">
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Crop" helper="The backend is seeded with Rice, Wheat, and Millet.">
            <select value={crop} onChange={(event) => setCrop(event.target.value)}>
              <option value="Rice">Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Millet">Millet</option>
            </select>
          </Field>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Predicting..." : "Run prediction"}
          </Button>
        </form>

        <AlertState message={error} />
      </Card>

      <Card title="Prediction analysis" subtitle="A concise financial view with seasonal context.">
        {result ? (
          <div className="stack-gap">
            <div className="badge-row">
              <Badge tone="success">{result.season}</Badge>
              <Badge>{result.crop}</Badge>
            </div>

            <div className="insight-grid">
              <div className="insight-stat">
                <span>Base price</span>
                <strong>{formatCurrency(result.basePrice)}</strong>
              </div>
              <div className="insight-stat">
                <span>Predicted price</span>
                <strong>{formatCurrency(result.predictedPrice)}</strong>
              </div>
            </div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="label" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1F7A63" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyState title="No prediction yet" message="Run a price request to compare the base and predicted values on this page." />
        )}
      </Card>
    </div>
  );
}
