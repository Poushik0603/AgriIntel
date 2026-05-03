import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAppContext } from "../../app/AppContext";

const pageDescriptions = {
  "/dashboard": "Analyze regional stability and monitor active crop deployments.",
  "/workspace": "Run location-first agronomy analysis, crop scoring, price movement, and notes.",
  "/market-intelligence": "Global commodity tracking and predictive analytics.",
  "/reports": "Review saved field reports and export-ready analysis notes.",
  "/profile": "Keep account, company, and profile completion details current.",
};

const pageTitles = {
  "/dashboard": "Intelligence Hub",
  "/workspace": "Environmental Foundation",
  "/market-intelligence": "Market Intelligence",
  "/reports": "Reports",
  "/profile": "Profile",
};

function basePath(pathname) {
  if (pathname.startsWith("/workspace")) {
    return "/workspace";
  }
  return pathname;
}

export default function AppShell() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useAppContext();
  const currentPath = basePath(location.pathname);

  return (
    <div className="saas-shell">
      <Sidebar />
      <div className={`shell-overlay ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className="shell-main">
        <Topbar title={pageTitles[currentPath]} description={pageDescriptions[currentPath]} />
        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
