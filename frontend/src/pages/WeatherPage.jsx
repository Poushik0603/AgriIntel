import { useState } from "react";
import { useAppContext } from "../app/AppContext";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import AlertState from "../components/ui/AlertState";
import EmptyState from "../components/ui/EmptyState";
import { weatherService } from "../services/api";

export default function WeatherPage() {
  const { apiBase, session } = useAppContext();
  const [city, setCity] = useState("Chennai");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await weatherService.getByCity(city, apiBase, session?.token);
      setResult(response);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-grid two-column">
        <Card title="Weather query" subtitle="Retrieve the current city weather profile from the weather microservice.">
          <form className="form-grid" onSubmit={handleSubmit}>
            <Field label="City" helper="Try Chennai, Delhi, or Mumbai for seeded responses.">
              <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Enter city name" />
            </Field>

            <div className="button-row">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Loading..." : "Fetch weather"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCity("Chennai")}>
                Use Chennai
              </Button>
            </div>
          </form>

          <AlertState message={error} onRetry={handleSubmit} />
        </Card>

        <Card title="Weather response" subtitle="A cleaner operational summary for agronomy and crop workflows.">
          {loading ? (
            <div className="stack-gap">
              <Skeleton className="metric-skeleton" />
              <Skeleton className="metric-skeleton" />
              <Skeleton className="metric-skeleton" />
            </div>
          ) : result ? (
            <div className="stats-grid">
              <div className="metric-card compact">
                <span className="metric-label">City</span>
                <strong>{result.city}</strong>
              </div>
              <div className="metric-card compact">
                <span className="metric-label">Temperature</span>
                <strong>{result.temperature} deg C</strong>
              </div>
              <div className="metric-card compact">
                <span className="metric-label">Humidity</span>
                <strong>{result.humidity}%</strong>
              </div>
              <div className="metric-card compact">
                <span className="metric-label">Rainfall</span>
                <strong>{result.rainfall} mm</strong>
              </div>
            </div>
          ) : (
            <EmptyState title="No weather response yet" message="Submit a city to preview the weather service response in this redesigned page." />
          )}
        </Card>
      </div>
    </div>
  );
}
