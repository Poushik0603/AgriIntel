import { useEffect, useState } from "react";

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "" : "http://localhost:8090");

const marketFormDefaults = {
  cropName: "",
  price: "",
  marketName: "",
  recordDate: "",
};

async function apiRequest(path, options = {}, baseUrl = DEFAULT_API_BASE) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || "Request failed";
    throw new Error(message);
  }

  return data;
}

function SectionCard({ eyebrow, title, description, children }) {
  return (
    <section className="card">
      <p className="eyebrow">{eyebrow}</p>
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [authMode, setAuthMode] = useState("login");
  const [token, setToken] = useState(() => localStorage.getItem("agriintel_token") || "");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("agriintel_email") || "");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("agriintel_role") || "");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "USER",
  });
  const [authState, setAuthState] = useState({ loading: false, message: "", error: "" });

  const [weatherCity, setWeatherCity] = useState("Chennai");
  const [weatherData, setWeatherData] = useState(null);
  const [weatherState, setWeatherState] = useState({ loading: false, error: "" });

  const [cropForm, setCropForm] = useState({
    soilType: "",
    rainfall: "",
    temperature: "",
    city: "",
  });
  const [cropResult, setCropResult] = useState(null);
  const [cropState, setCropState] = useState({ loading: false, error: "" });

  const [priceCrop, setPriceCrop] = useState("Rice");
  const [priceData, setPriceData] = useState(null);
  const [priceState, setPriceState] = useState({ loading: false, error: "" });

  const [marketForm, setMarketForm] = useState(marketFormDefaults);
  const [marketItems, setMarketItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [marketState, setMarketState] = useState({ loading: false, error: "", message: "" });

  useEffect(() => {
    localStorage.setItem("agriintel_token", token);
    localStorage.setItem("agriintel_email", userEmail);
    localStorage.setItem("agriintel_role", userRole);
  }, [token, userEmail, userRole]);

  useEffect(() => {
    fetchMarketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthState({ loading: true, message: "", error: "" });

    try {
      const path = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        authMode === "register"
          ? authForm
          : { email: authForm.email, password: authForm.password };

      const response = await apiRequest(
        path,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        apiBase
      );

      setToken(response.token || "");
      setUserEmail(response.email || "");
      setUserRole(response.role || "");
      setAuthState({
        loading: false,
        message: authMode === "register" ? "Account created and signed in." : "Signed in successfully.",
        error: "",
      });
    } catch (error) {
      setAuthState({ loading: false, message: "", error: error.message });
    }
  }

  async function fetchWeather(event) {
    if (event) {
      event.preventDefault();
    }

    setWeatherState({ loading: true, error: "" });
    try {
      const response = await apiRequest(`/weather?city=${encodeURIComponent(weatherCity)}`, {}, apiBase);
      setWeatherData(response);
      setWeatherState({ loading: false, error: "" });
    } catch (error) {
      setWeatherState({ loading: false, error: error.message });
    }
  }

  async function fetchPricePrediction(event) {
    if (event) {
      event.preventDefault();
    }

    setPriceState({ loading: true, error: "" });
    try {
      const response = await apiRequest(`/price/predict?crop=${encodeURIComponent(priceCrop)}`, {}, apiBase);
      setPriceData(response);
      setPriceState({ loading: false, error: "" });
    } catch (error) {
      setPriceState({ loading: false, error: error.message });
    }
  }

  async function handleCropRecommendation(event) {
    event.preventDefault();
    setCropState({ loading: true, error: "" });

    try {
      const payload = {
        soilType: cropForm.soilType,
        rainfall: cropForm.rainfall === "" ? null : Number(cropForm.rainfall),
        temperature: cropForm.temperature === "" ? null : Number(cropForm.temperature),
        city: cropForm.city || null,
      };

      const response = await apiRequest(
        "/crop/recommend",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        apiBase
      );

      setCropResult(response);
      setCropState({ loading: false, error: "" });
    } catch (error) {
      setCropState({ loading: false, error: error.message });
    }
  }

  async function fetchMarketData() {
    setMarketState((current) => ({ ...current, loading: true, error: "", message: "" }));
    try {
      const response = await apiRequest("/market-data", {}, apiBase);
      setMarketItems(response || []);
      setMarketState({ loading: false, error: "", message: "" });
    } catch (error) {
      setMarketState({ loading: false, error: error.message, message: "" });
    }
  }

  async function handleMarketSubmit(event) {
    event.preventDefault();
    setMarketState({ loading: true, error: "", message: "" });

    const payload = {
      cropName: marketForm.cropName,
      price: Number(marketForm.price),
      marketName: marketForm.marketName,
      recordDate: marketForm.recordDate,
    };

    try {
      await apiRequest(
        editingId ? `/market-data/${editingId}` : "/market-data",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
        apiBase
      );

      await fetchMarketData();
      setMarketForm(marketFormDefaults);
      setEditingId(null);
      setMarketState({
        loading: false,
        error: "",
        message: editingId ? "Market record updated." : "Market record added.",
      });
    } catch (error) {
      setMarketState({ loading: false, error: error.message, message: "" });
    }
  }

  async function deleteMarketItem(id) {
    setMarketState({ loading: true, error: "", message: "" });
    try {
      await apiRequest(
        `/market-data/${id}`,
        {
          method: "DELETE",
        },
        apiBase
      );
      await fetchMarketData();
      setMarketState({ loading: false, error: "", message: "Market record deleted." });
    } catch (error) {
      setMarketState({ loading: false, error: error.message, message: "" });
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setMarketForm({
      cropName: item.cropName,
      price: item.price,
      marketName: item.marketName,
      recordDate: item.recordDate,
    });
  }

  function signOut() {
    setToken("");
    setUserEmail("");
    setUserRole("");
    setAuthState({ loading: false, message: "Signed out locally.", error: "" });
  }

  const displayedApiBase = apiBase || "Vite proxy -> http://localhost:8090";

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AgriIntel Platform</p>
          <h1>One React workspace for all your agriculture microservices.</h1>
          <p className="hero-text">
            Monitor weather snapshots, generate crop recommendations, predict seasonal prices,
            manage market records, and test authentication from a single frontend connected through
            the API gateway.
          </p>
          <div className="hero-stats">
            <Stat label="Gateway" value={displayedApiBase} />
            <Stat label="Services" value="5 live modules" />
            <Stat label="Focus" value="Farm intelligence" />
          </div>
        </div>

        <div className="hero-panel">
          <label htmlFor="apiBase">Gateway base URL</label>
          <input
            id="apiBase"
            value={apiBase}
            onChange={(event) => setApiBase(event.target.value)}
            placeholder="Blank in dev uses Vite proxy"
          />
          <p>
            Use the API gateway URL in production. During `vite` development, the included proxy
            already forwards service calls to `http://localhost:8090`.
          </p>
        </div>
      </header>

      <div className="dashboard-grid">
        <SectionCard
          eyebrow="User Service"
          title="Authentication"
          description="Register or log in against the user microservice and keep the issued JWT in local storage."
        >
          <div className="tab-row">
            <button
              className={authMode === "login" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          <form className="form-grid" onSubmit={handleAuthSubmit}>
            {authMode === "register" ? (
              <label>
                Full name
                <input
                  value={authForm.fullName}
                  onChange={(event) => setAuthForm({ ...authForm, fullName: event.target.value })}
                  required
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                required
              />
            </label>

            {authMode === "register" ? (
              <label>
                Role
                <select
                  value={authForm.role}
                  onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
            ) : null}

            <button type="submit" disabled={authState.loading}>
              {authState.loading ? "Submitting..." : authMode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="status-panel">
            <p><strong>Signed in as:</strong> {userEmail || "No active session"}</p>
            <p><strong>Role:</strong> {userRole || "Not set"}</p>
            <p><strong>JWT:</strong> {token ? `${token.slice(0, 28)}...` : "Not issued yet"}</p>
            {token ? (
              <button type="button" className="ghost-button" onClick={signOut}>
                Clear local session
              </button>
            ) : null}
          </div>

          {authState.message ? <p className="success-text">{authState.message}</p> : null}
          {authState.error ? <p className="error-text">{authState.error}</p> : null}
        </SectionCard>

        <SectionCard
          eyebrow="Weather Service"
          title="City Weather"
          description="Fetch current demo weather profiles to support crop decisions and backend integration checks."
        >
          <form className="form-inline" onSubmit={fetchWeather}>
            <input
              value={weatherCity}
              onChange={(event) => setWeatherCity(event.target.value)}
              placeholder="Enter city"
            />
            <button type="submit" disabled={weatherState.loading}>
              {weatherState.loading ? "Loading..." : "Fetch weather"}
            </button>
          </form>

          <div className="chip-row">
            {["Chennai", "Delhi", "Mumbai"].map((city) => (
              <button key={city} type="button" className="chip" onClick={() => setWeatherCity(city)}>
                {city}
              </button>
            ))}
          </div>

          {weatherData ? (
            <div className="result-grid">
              <Stat label="City" value={weatherData.city} />
              <Stat label="Temperature" value={`${weatherData.temperature} C`} />
              <Stat label="Humidity" value={`${weatherData.humidity}%`} />
              <Stat label="Rainfall" value={`${weatherData.rainfall} mm`} />
            </div>
          ) : (
            <p className="muted">No weather request made yet.</p>
          )}

          {weatherState.error ? <p className="error-text">{weatherState.error}</p> : null}
        </SectionCard>

        <SectionCard
          eyebrow="Crop Service"
          title="Crop Recommendation"
          description="Submit soil and climate data directly, or let the service enrich rainfall and temperature from the city weather service."
        >
          <form className="form-grid" onSubmit={handleCropRecommendation}>
            <label>
              Soil type
              <input
                value={cropForm.soilType}
                onChange={(event) => setCropForm({ ...cropForm, soilType: event.target.value })}
                placeholder="Clay, loam, sandy..."
                required
              />
            </label>

            <label>
              Rainfall (optional)
              <input
                type="number"
                value={cropForm.rainfall}
                onChange={(event) => setCropForm({ ...cropForm, rainfall: event.target.value })}
                placeholder="Leave blank to infer"
              />
            </label>

            <label>
              Temperature (optional)
              <input
                type="number"
                value={cropForm.temperature}
                onChange={(event) => setCropForm({ ...cropForm, temperature: event.target.value })}
                placeholder="Leave blank to infer"
              />
            </label>

            <label>
              City (optional)
              <input
                value={cropForm.city}
                onChange={(event) => setCropForm({ ...cropForm, city: event.target.value })}
                placeholder="Chennai"
              />
            </label>

            <button type="submit" disabled={cropState.loading}>
              {cropState.loading ? "Recommending..." : "Get recommendation"}
            </button>
          </form>

          {cropResult ? (
            <div className="recommendation">
              <div className="result-grid">
                <Stat label="Soil" value={cropResult.soilType} />
                <Stat label="Rainfall" value={`${cropResult.rainfall} mm`} />
                <Stat label="Temperature" value={`${cropResult.temperature} C`} />
                <Stat label="City" value={cropResult.city || "Not provided"} />
              </div>
              <div className="highlight-box">
                <span>Recommended Crops</span>
                <strong>{cropResult.recommendedCrops.join(", ")}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">The service currently returns Rice, Wheat, or Millet based on rainfall and temperature.</p>
          )}

          {cropState.error ? <p className="error-text">{cropState.error}</p> : null}
        </SectionCard>

        <SectionCard
          eyebrow="Price Service"
          title="Seasonal Price Prediction"
          description="Use the seeded crop catalog to compare the stored base price with the season-adjusted predicted price."
        >
          <form className="form-inline" onSubmit={fetchPricePrediction}>
            <select value={priceCrop} onChange={(event) => setPriceCrop(event.target.value)}>
              <option value="Rice">Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Millet">Millet</option>
            </select>
            <button type="submit" disabled={priceState.loading}>
              {priceState.loading ? "Calculating..." : "Predict price"}
            </button>
          </form>

          {priceData ? (
            <div className="result-grid">
              <Stat label="Crop" value={priceData.crop} />
              <Stat label="Season" value={priceData.season} />
              <Stat label="Base Price" value={`Rs. ${priceData.basePrice}`} />
              <Stat label="Predicted" value={`Rs. ${priceData.predictedPrice}`} />
            </div>
          ) : (
            <p className="muted">Base prices are seeded for Rice, Wheat, and Millet.</p>
          )}

          {priceState.error ? <p className="error-text">{priceState.error}</p> : null}
        </SectionCard>

        <SectionCard
          eyebrow="Market Data Service"
          title="Market Price Records"
          description="Create, edit, refresh, and delete crop market entries through the CRUD service."
        >
          <form className="form-grid" onSubmit={handleMarketSubmit}>
            <label>
              Crop name
              <input
                value={marketForm.cropName}
                onChange={(event) => setMarketForm({ ...marketForm, cropName: event.target.value })}
                required
              />
            </label>

            <label>
              Price
              <input
                type="number"
                step="0.01"
                value={marketForm.price}
                onChange={(event) => setMarketForm({ ...marketForm, price: event.target.value })}
                required
              />
            </label>

            <label>
              Market name
              <input
                value={marketForm.marketName}
                onChange={(event) => setMarketForm({ ...marketForm, marketName: event.target.value })}
                required
              />
            </label>

            <label>
              Record date
              <input
                type="date"
                value={marketForm.recordDate}
                onChange={(event) => setMarketForm({ ...marketForm, recordDate: event.target.value })}
                required
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={marketState.loading}>
                {marketState.loading ? "Saving..." : editingId ? "Update record" : "Add record"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setMarketForm(marketFormDefaults);
                  setEditingId(null);
                }}
              >
                Reset
              </button>
              <button type="button" className="ghost-button" onClick={fetchMarketData}>
                Refresh list
              </button>
            </div>
          </form>

          {marketState.message ? <p className="success-text">{marketState.message}</p> : null}
          {marketState.error ? <p className="error-text">{marketState.error}</p> : null}

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Crop</th>
                  <th>Price</th>
                  <th>Market</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {marketItems.length ? (
                  marketItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.cropName}</td>
                      <td>Rs. {item.price}</td>
                      <td>{item.marketName}</td>
                      <td>{item.recordDate}</td>
                      <td className="table-actions">
                        <button type="button" className="chip" onClick={() => startEdit(item)}>
                          Edit
                        </button>
                        <button type="button" className="chip danger-chip" onClick={() => deleteMarketItem(item.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No market records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
