import { useState } from "react";
import { useAppContext } from "../app/AppContext";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import AlertState from "../components/ui/AlertState";
import EmptyState from "../components/ui/EmptyState";
import { cropService } from "../services/api";

const initialForm = {
  soilType: "",
  rainfall: "",
  temperature: "",
  city: "",
};

export default function CropRecommendationPage() {
  const { apiBase, session } = useAppContext();
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function validate() {
    const nextErrors = {};
    if (!form.soilType.trim()) {
      nextErrors.soilType = "Soil type is required.";
    }
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setError("");

    if (Object.keys(nextErrors).length) {
      return;
    }

    setLoading(true);
    try {
      const response = await cropService.recommend(
        {
          soilType: form.soilType,
          rainfall: form.rainfall ? Number(form.rainfall) : null,
          temperature: form.temperature ? Number(form.temperature) : null,
          city: form.city || null,
        },
        apiBase,
        session?.token
      );
      setResult(response);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-grid two-column">
      <Card title="Recommendation inputs" subtitle="Provide field conditions directly, or let the service use city weather to fill in missing climate values.">
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Soil type" helper="Examples: clay, loam, black soil." error={errors.soilType}>
            <input value={form.soilType} onChange={(event) => setForm({ ...form, soilType: event.target.value })} placeholder="Loam" />
          </Field>

          <Field label="Rainfall" optional helper="Leave blank to infer from city weather.">
            <input type="number" value={form.rainfall} onChange={(event) => setForm({ ...form, rainfall: event.target.value })} placeholder="200" />
          </Field>

          <Field label="Temperature" optional helper="Leave blank to infer from city weather.">
            <input type="number" value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} placeholder="29" />
          </Field>

          <Field label="City" optional helper="Used for weather enrichment when rainfall or temperature is missing.">
            <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Chennai" />
          </Field>

          <div className="button-row">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Recommending..." : "Get recommendation"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(initialForm)}>
              Reset
            </Button>
          </div>
        </form>

        <AlertState message={error} />
      </Card>

      <Card title="Recommendation output" subtitle="A clearer response surface for advisor and planning workflows.">
        {result ? (
          <div className="stack-gap">
            <div className="insight-grid">
              <div className="insight-stat">
                <span>Soil type</span>
                <strong>{result.soilType}</strong>
              </div>
              <div className="insight-stat">
                <span>Rainfall</span>
                <strong>{result.rainfall} mm</strong>
              </div>
              <div className="insight-stat">
                <span>Temperature</span>
                <strong>{result.temperature} deg C</strong>
              </div>
              <div className="insight-stat">
                <span>City</span>
                <strong>{result.city || "Not provided"}</strong>
              </div>
            </div>

            <div className="recommendation-panel">
              <span>Recommended crops</span>
              <strong>{result.recommendedCrops.join(", ")}</strong>
            </div>
          </div>
        ) : (
          <EmptyState title="No recommendation yet" message="Submit field conditions to preview the crop service result here." />
        )}
      </Card>
    </div>
  );
}
