import { NavLink } from "react-router-dom";
import { useAppContext } from "../../app/AppContext";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: "grid" },
  { label: "Analysis Workspace", path: "/workspace", icon: "chart" },
  { label: "Market Intelligence", path: "/market-intelligence", icon: "globe" },
  { label: "Reports", path: "/reports", icon: "report" },
  { label: "Profile", path: "/profile", icon: "user" },
];

export default function Sidebar() {
  const { dashboards, sidebarOpen, setSidebarOpen } = useAppContext();

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>
        <div>
          <strong>AgriIntel</strong>
          <p>Midnight Harvest</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className={`nav-icon ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-metric">
        <span>Active dashboards</span>
        <strong>{dashboards.length}</strong>
      </div>

      <div className="sidebar-footer">
        <button type="button">Export Dataset</button>
        <p>Settings</p>
        <p>Support</p>
      </div>
    </aside>
  );
}
