import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppContext } from "../app/AppContext";
import { cropService, priceService, reverseGeocode, weatherService } from "../services/api";
import { formatCurrency, formatDateShort, formatPercent } from "../utils/formatters";

const defaultCoordinates = { latitude: 11.0168, longitude: 76.9558 };

function mapPointToCoordinates(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

  return {
    latitude: Number((6 + (1 - y) * 30).toFixed(5)),
    longitude: Number((68 + x * 30).toFixed(5)),
    x: x * 100,
    y: y * 100,
  };
}

function fallbackAnalysis(coordinates, location) {
  const latitude = Number(coordinates.latitude || defaultCoordinates.latitude);
  const longitude = Number(coordinates.longitude || defaultCoordinates.longitude);
  const temperature = Number((27 + Math.abs(latitude % 5)).toFixed(1));
  const rainfall = Number((110 + Math.abs(longitude % 7) * 22).toFixed(1));
  const moisture = Math.round(36 + (rainfall % 24));
  const nitrogen = Math.round(58 + (moisture % 18));
  const phosphorus = Math.round(36 + (temperature % 12));
  const potassium = Math.round(48 + (rainfall % 20));

  const crops = [
    {
      crop: "Cotton",
      score: 0.92,
      riskScore: 0.24,
      riskLevel: "LOW",
      reason: "Strong alignment with current pH, heat range, and projected rainfall.",
      limitation: "Watch irrigation demand if soil moisture drops below 35%.",
    },
    {
      crop: "Maize",
      score: 0.85,
      riskScore: 0.32,
      riskLevel: "MEDIUM",
      reason: "Good secondary option with moderate nitrogen support.",
      limitation: "Needs tighter nutrient management than the top crop.",
    },
    {
      crop: "Sorghum",
      score: 0.78,
      riskScore: 0.38,
      riskLevel: "MEDIUM",
      reason: "Resilient in warmer conditions and lower rainfall windows.",
      limitation: "Lower market upside in the current comparison set.",
    },
    {
      crop: "Groundnut",
      score: 0.74,
      riskScore: 0.44,
      riskLevel: "MEDIUM",
      reason: "Acceptable fit for loamy fields with steady potassium.",
      limitation: "Not best because humidity raises pest and disease exposure.",
    },
  ];

  return {
    weather: {
      city: location.city,
      temperature,
      humidity: 65,
      rainfall,
      source: "Local fallback",
    },
    crop: {
      soilType: "Loam",
      rainfall,
      temperature,
      city: location.city,
      recommendedCrops: crops,
      soilSnapshot: {
        ph: 6.5,
        moisture,
        nitrogen,
        phosphorus,
        potassium,
        source: "Estimated NPK fallback",
      },
    },
  };
}

function normalizeRecommendation(item, index) {
  if (typeof item === "string") {
    return {
      crop: item,
      score: Math.max(0.55, 0.92 - index * 0.08),
      riskScore: Math.min(0.68, 0.22 + index * 0.09),
      riskLevel: index === 0 ? "LOW" : "MEDIUM",
      reason: "Recommended by the crop service for the current field baseline.",
      limitation: index === 0 ? "Best current option." : "Ranked below the top crop because one or more field signals are weaker.",
    };
  }

  return {
    crop: item.crop,
    score: Number(item.score || 0),
    riskScore: Number(item.riskScore ?? Math.max(0.12, 1 - Number(item.score || 0))),
    riskLevel: item.riskLevel || (Number(item.score || 0) > 0.85 ? "LOW" : "MEDIUM"),
    reason: item.reason || "Recommended by the crop service for the current field baseline.",
    limitation:
      item.limitation ||
      (index === 0 ? "Best current option." : "Ranked below the top crop because one or more field signals are weaker."),
  };
}

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { dashboardId } = useParams();
  const { apiBase, createDashboard, dashboards, session, updateDashboard } = useAppContext();
  const [search, setSearch] = useState("");
  const [coordinates, setCoordinates] = useState({ ...defaultCoordinates, x: 52, y: 40 });
  const [location, setLocation] = useState({ label: "Coimbatore Region", city: "Coimbatore", source: "Default field" });
  const [analysis, setAnalysis] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [priceResult, setPriceResult] = useState(null);
  const [reportNotes, setReportNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [message, setMessage] = useState("");

  const filteredDashboards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return dashboards;
    }
    return dashboards.filter((item) =>
      [item.title, item.location, ...(item.recommendedCrops || [])].join(" ").toLowerCase().includes(term)
    );
  }, [dashboards, search]);

  const activeDashboard = useMemo(() => {
    if (!dashboards.length) {
      return null;
    }
    return dashboards.find((item) => String(item.id) === String(dashboardId)) || dashboards[0];
  }, [dashboardId, dashboards]);

  const recommendations = useMemo(
    () => (analysis?.crop?.recommendedCrops || []).map(normalizeRecommendation),
    [analysis]
  );

  const selectedRecommendation = recommendations.find((item) => item.crop === selectedCrop) || recommendations[0];

  useEffect(() => {
    if (activeDashboard) {
      setReportNotes(activeDashboard.reportNotes || "");
      if (activeDashboard.coordinates) {
        setCoordinates({ ...activeDashboard.coordinates, x: activeDashboard.coordinates.x || 52, y: activeDashboard.coordinates.y || 40 });
      }
    }
  }, [activeDashboard]);

  useEffect(() => {
    if (!selectedCrop && recommendations.length) {
      setSelectedCrop(recommendations[0].crop);
    }
  }, [recommendations, selectedCrop]);

  useEffect(() => {
    if (!selectedCrop) {
      setPriceResult(null);
      return;
    }

    let cancelled = false;
    priceService
      .predict(selectedCrop, apiBase, session?.token)
      .then((response) => {
        if (!cancelled) {
          setPriceResult(Array.isArray(response) ? response[0] : response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPriceResult(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase, selectedCrop, session?.token]);

  async function handleCreateDashboard() {
    const dashboard = await createDashboard();
    navigate(`/workspace/${dashboard.id}`);
  }

  function handleMapClick(event) {
    setCoordinates(mapPointToCoordinates(event));
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setMessage("Device location is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
          x: 52,
          y: 40,
        });
        setMessage("Device coordinates captured.");
      },
      () => setMessage("Could not access device location.")
    );
  }

  async function runLandDiscovery() {
    if (!activeDashboard) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const geocode = await reverseGeocode(coordinates.latitude, coordinates.longitude);
      setLocation(geocode);

      const weather = await weatherService.getByLocation(
        { latitude: coordinates.latitude, longitude: coordinates.longitude, city: geocode.city },
        apiBase,
        session?.token
      );

      const crop = await cropService.recommend(
        {
          soilType: "Loam",
          city: geocode.city,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          rainfall: weather?.rainfall ?? null,
          temperature: weather?.temperature ?? null,
        },
        apiBase,
        session?.token
      );

      const nextAnalysis = { weather, crop };
      setAnalysis(nextAnalysis);

      const cropNames = (crop.recommendedCrops || []).map((item) => (typeof item === "string" ? item : item.crop));
      const normalized = (crop.recommendedCrops || []).map(normalizeRecommendation);
      const topRisk = normalized[0]?.riskLevel === "LOW" ? "Optimal" : normalized[0]?.riskLevel === "HIGH" ? "High Risk" : "Medium";

      await updateDashboard(activeDashboard.id, {
        location: geocode.label,
        coordinates,
        selectedCrops: cropNames.slice(0, 1),
        recommendedCrops: cropNames,
        riskSnapshot: topRisk,
        status: topRisk,
        insights: [
          `Weather baseline for ${geocode.city}: ${Math.round(weather.temperature)} deg C, ${Math.round(weather.humidity)}% humidity, ${Math.round(weather.rainfall)} mm rainfall.`,
          `Top crop recommendation: ${cropNames[0] || "Unavailable"}.`,
          `Soil source: ${crop.soilSnapshot?.source || "Estimated profile"}.`,
        ],
      });
    } catch {
      const geocode = { ...location, source: "Fallback after service error" };
      const nextAnalysis = fallbackAnalysis(coordinates, geocode);
      setAnalysis(nextAnalysis);
      setMessage("Live services were unavailable, so the workspace used the local agronomy fallback.");
      await updateDashboard(activeDashboard.id, {
        location: geocode.label,
        coordinates,
        selectedCrops: [nextAnalysis.crop.recommendedCrops[0].crop],
        recommendedCrops: nextAnalysis.crop.recommendedCrops.map((item) => item.crop),
        riskSnapshot: "Medium",
        status: "Medium",
        insights: [
          `Fallback weather baseline for ${geocode.city}: ${nextAnalysis.weather.temperature} deg C.`,
          `Top crop recommendation: ${nextAnalysis.crop.recommendedCrops[0].crop}.`,
          "NPK values were approximated from climate and coordinate signals.",
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes() {
    if (!activeDashboard) {
      return;
    }
    setSavingNotes(true);
    await updateDashboard(activeDashboard.id, { reportNotes });
    setSavingNotes(false);
    setMessage("Report notes saved.");
  }

  function moveToPricePrediction() {
    navigate(`/market-intelligence?crop=${encodeURIComponent(selectedCrop || selectedRecommendation?.crop || "Rice")}`);
  }

  const weather = analysis?.weather;
  const soil = analysis?.crop?.soilSnapshot;
  const priceChart = priceResult
    ? [
        { label: "Base", value: Number(priceResult.basePrice || 0) },
        { label: "Predicted", value: Number(priceResult.predictedPrice || 0) },
      ]
    : [];

  if (!activeDashboard) {
    return (
      <div className="workspace-empty">
        <h2>No dashboard has been created.</h2>
        <p>Create a dashboard first, then run land discovery and crop recommendation from this workspace.</p>
        <button className="new-dashboard-button" type="button" onClick={handleCreateDashboard}>
          <span className="plus-icon" />
          New Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <aside className="workspace-archive">
        <div className="workspace-search">
          <span className="search-icon" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search analytics dashboards" />
        </div>
        <button className="new-dashboard-button compact" type="button" onClick={handleCreateDashboard}>
          <span className="plus-icon" />
          New Dashboard
        </button>
        <div className="archive-list">
          {filteredDashboards.map((dashboard) => (
            <Link
              key={dashboard.id}
              className={`archive-item ${String(activeDashboard.id) === String(dashboard.id) ? "active" : ""}`}
              to={`/workspace/${dashboard.id}`}
            >
              <strong>{dashboard.title}</strong>
              <span>{dashboard.location}</span>
              <small>{formatDateShort(dashboard.updatedAt || dashboard.createdAt)}</small>
            </Link>
          ))}
        </div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-toolbar">
          <div>
            <p className="eyebrow">Analytics workspace</p>
            <h2>{activeDashboard.title}</h2>
          </div>
          <button className="new-dashboard-button" type="button" onClick={runLandDiscovery} disabled={loading}>
            <span className="pin-icon" />
            {loading ? "Analyzing land..." : "Find your land"}
          </button>
        </div>

        <section className="map-panel">
          <div className="interactive-map" onClick={handleMapClick} role="button" tabIndex={0}>
            <span className="map-marker" style={{ left: `${coordinates.x || 52}%`, top: `${coordinates.y || 40}%` }} />
            <div className="map-grid-lines" />
          </div>
          <div className="map-side">
            <span>Marked coordinates</span>
            <strong>
              {coordinates.latitude}, {coordinates.longitude}
            </strong>
            <p>{location.label}</p>
            <small>{location.source}</small>
            <div className="button-row">
              <button type="button" onClick={useDeviceLocation}>
                Use device location
              </button>
              <button type="button" onClick={runLandDiscovery} disabled={loading}>
                Run analysis
              </button>
            </div>
          </div>
        </section>

        {message ? <div className="workspace-message">{message}</div> : null}

        <div className="foundation-grid">
          <article className="metric-block weather-block">
            <div className="metric-head">
              <span>Current weather</span>
              <span className="sun-icon" />
            </div>
            <strong>{Math.round(weather?.temperature ?? 28)}deg C</strong>
            <p>
              {weather
                ? `Humidity at ${Math.round(weather.humidity)}%, rainfall baseline ${Math.round(weather.rainfall)} mm.`
                : "Run land discovery to fetch weather from the backend service."}
            </p>
            <small>Source: {weather?.source || "Awaiting analysis"}</small>
          </article>

          <article className="metric-block soil-block">
            <div className="metric-head">
              <span>Soil composition baseline</span>
              <span className="flask-icon" />
            </div>
            <div className="soil-grid">
              <div>
                <strong>{soil?.ph ?? "6.5"}</strong>
                <span>pH level</span>
              </div>
              <div>
                <strong>{soil?.moisture ?? "--"}%</strong>
                <span>Moisture</span>
              </div>
              <div>
                <strong>{soil?.nitrogen ?? "--"}</strong>
                <span>Nitrogen</span>
              </div>
              <div>
                <strong>{soil?.phosphorus ?? "--"}</strong>
                <span>Phosphorus</span>
              </div>
              <div>
                <strong>{soil?.potassium ?? "--"}</strong>
                <span>Potassium</span>
              </div>
            </div>
            <small>{soil?.source || "SoilGrids/estimated NPK appears after analysis."}</small>
          </article>
        </div>

        <section className="recommendation-section">
          <div className="section-heading">
            <h2>System Recommendations</h2>
            <p>Based on {location.city || "field"} profile</p>
          </div>
          <div className="recommendation-grid">
            {(recommendations.length ? recommendations : activeDashboard.recommendedCrops.map(normalizeRecommendation)).map((item, index) => (
              <button
                className={`recommendation-card ${selectedCrop === item.crop ? "selected" : ""}`}
                type="button"
                key={`${item.crop}-${index}`}
                onClick={() => setSelectedCrop(item.crop)}
              >
                <h3>{item.crop}</h3>
                <strong>{formatPercent(item.score)} suitability</strong>
                <p>{item.reason}</p>
                <small>{item.limitation}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="deep-dive">
          <div className="section-heading">
            <h2>Deep-Dive Insights</h2>
            <button type="button" onClick={moveToPricePrediction} disabled={!selectedRecommendation}>
              Move to price prediction
            </button>
          </div>

          <div className="deep-grid">
            <div className="risk-score">
              <span>Selected crop</span>
              <h3>{selectedRecommendation?.crop || "Select crop"}</h3>
              <div className="risk-meter">
                <span style={{ width: `${Math.round((1 - (selectedRecommendation?.riskScore || 0.5)) * 100)}%` }} />
              </div>
              <strong>Risk score: {Math.round((selectedRecommendation?.riskScore || 0) * 100)}</strong>
              <p>{selectedRecommendation?.riskLevel || "Pending"} risk level</p>
            </div>

            <div className="price-preview">
              <span>Price projection</span>
              {priceResult ? (
                <>
                  <strong>{formatCurrency(priceResult.predictedPrice)}</strong>
                  <p>
                    {priceResult.crop} in {priceResult.season}
                  </p>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={priceChart}>
                      <XAxis dataKey="label" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="value" fill="#b7dccd" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p>Price service will appear here after a crop is selected.</p>
              )}
            </div>

            <div className="insight-list">
              <span>Analysis breakdown and risk factors</span>
              {(activeDashboard.insights || []).map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="notes-panel">
          <div className="section-heading">
            <h2>Report Notes</h2>
            <button type="button" onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? "Saving..." : "Save report"}
            </button>
          </div>
          <textarea
            value={reportNotes}
            onChange={(event) => setReportNotes(event.target.value)}
            placeholder="Write the final report based on the analytics, selected crop, risk score, price projection, and field context."
          />
        </section>
      </section>
    </div>
  );
}
