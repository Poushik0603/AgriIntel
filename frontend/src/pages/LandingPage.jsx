import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav">
          <div className="landing-brand">
            <span className="brand-mark small" />
            <strong>AgriIntel</strong>
          </div>
          <div className="landing-links">
            <Link to="/login">Login</Link>
            <Link className="landing-outline" to="/signup">
              Try now
            </Link>
          </div>
        </nav>

        <div className="landing-content">
          <p className="eyebrow">Midnight Harvest intelligence grid</p>
          <h1>AgriIntel</h1>
          <p>
            A decision workspace for marking land, reading climate and soil signals, ranking crops, forecasting price
            movement, and turning analysis into field-ready reports.
          </p>
          <div className="landing-actions">
            <Link className="primary-link" to="/signup">
              Try now
            </Link>
            <Link className="quiet-link" to="/login">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="landing-signal-panel">
          <div>
            <span>Crop fit</span>
            <strong>92%</strong>
          </div>
          <div>
            <span>Risk state</span>
            <strong>Medium</strong>
          </div>
          <div>
            <span>Profile</span>
            <strong>High</strong>
          </div>
        </div>
      </section>

      <section className="landing-strip">
        <article>
          <span>01</span>
          <h2>Map the field</h2>
          <p>Capture coordinates, resolve the region, and bind the dashboard to a real farm location.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Rank the crop</h2>
          <p>Blend weather, soil composition, estimated NPK, and risk into a sorted recommendation set.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Forecast value</h2>
          <p>Move the chosen crop into market intelligence and compare predicted price signals.</p>
        </article>
      </section>
    </main>
  );
}
