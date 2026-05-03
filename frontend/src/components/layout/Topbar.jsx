import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../../app/AppContext";

export default function Topbar({ title, description }) {
  const { apiBase, logout, session, setSidebarOpen } = useAppContext();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <div className="topbar-row">
          <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <span className="hamburger-icon" />
          </button>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="status-pill">
          <span />
          System status: optimal
        </div>
        <div className="api-pill">{apiBase || "Proxy mode"}</div>
        <button className="icon-button" type="button" aria-label="Notifications">
          <span className="bell-icon" />
        </button>
        <Link className="user-chip" to="/profile">
          <span className="avatar-icon" />
          <div>
            <strong>{session?.fullName || session?.email}</strong>
            <small>{session?.organization || "Profile workspace"}</small>
          </div>
        </Link>
        <button className="logout-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
