import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../app/AppContext";
import { weatherService } from "../services/api";
import { formatDateShort } from "../utils/formatters";

const statusClass = {
  "High Risk": "danger",
  Medium: "warning",
  Optimal: "success",
  Review: "muted",
  Pending: "muted",
};

function MiniBars({ seed = 4 }) {
  return (
    <div className="mini-bars" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} style={{ height: `${24 + ((index + seed) % 5) * 8}px` }} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { apiBase, createDashboard, dashboardSyncing, dashboards, session } = useAppContext();
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let cancelled = false;
    weatherService
      .getByCity("Chennai", apiBase, session?.token)
      .then((response) => {
        if (!cancelled) {
          setWeather(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeather({ city: "Chennai", temperature: 32, humidity: 68, rainfall: 140 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, session?.token]);

  async function handleNewDashboard() {
    const dashboard = await createDashboard();
    navigate(`/workspace/${dashboard.id}`);
  }

  const profileCompletion = Math.max(10, Number(session?.profileCompletion || 0));

  return (
    <div className="dashboard-page">
      <section className="hub-grid">
        <article className="launch-panel">
          <div>
            <h2>Ready for new analysis?</h2>
            <p>Deploy a new precision monitoring dashboard to track custom metric sets across designated zones.</p>
          </div>
          <button className="new-dashboard-button" type="button" onClick={handleNewDashboard}>
            <span className="plus-icon" />
            New Dashboard
          </button>
          <div className="profile-progress">
            <div>
              <span>Profile completion</span>
              <strong>Profile strength: {profileCompletion >= 75 ? "High" : profileCompletion >= 50 ? "Medium" : "Low"}</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
        </article>

        <article className="weather-tile">
          <div className="tile-location">
            <span className="pin-icon" />
            <strong>{weather?.city || "Chennai"}, TN</strong>
            <Link to="/workspace">Change location</Link>
          </div>
          <div className="weather-main">
            <strong className="temperature-value">
              <span>{Math.round(weather?.temperature ?? 32)}</span>
              <small>&deg;C</small>
            </strong>
            <span>Humidity {Math.round(weather?.humidity ?? 68)}%</span>
            <small>Rising slightly</small>
          </div>
          <div className="tile-divider" />
          <p>Current region shows moderate agricultural stability.</p>
          <div className="risk-pill warning">Risk snapshot: Medium</div>
        </article>
      </section>

      <section className="recent-section">
        <div className="section-heading">
          <div>
            <h2>Recent Deployments</h2>
            <p>{dashboardSyncing ? "Syncing dashboards..." : "Dashboards created by your account"}</p>
          </div>
          <Link to="/workspace">View archive</Link>
        </div>

        {!dashboards.length ? (
          <div className="empty-deployments">
            <h3>No dashboard has been created.</h3>
            <p>Create a new dashboard to begin land discovery, crop recommendation, price prediction, and notes.</p>
            <button className="new-dashboard-button" type="button" onClick={handleNewDashboard}>
              <span className="plus-icon" />
              New Dashboard
            </button>
          </div>
        ) : (
          <div className="deployment-grid">
            {dashboards.slice(0, 6).map((dashboard, index) => {
              const status = dashboard.riskSnapshot === "Pending" ? dashboard.status : dashboard.riskSnapshot;
              return (
                <Link className="deployment-card" to={`/workspace/${dashboard.id}`} key={dashboard.id}>
                  <div className="card-kicker">Sector {index + 1}A</div>
                  <div className={`status-badge ${statusClass[status] || "muted"}`}>{status}</div>
                  <h3>{dashboard.location}</h3>
                  <p>{dashboard.title}</p>
                  <MiniBars seed={index + 2} />
                  <footer>
                    <span>Last updated: {formatDateShort(dashboard.updatedAt || dashboard.createdAt)}</span>
                    <span className="copy-icon" />
                  </footer>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
