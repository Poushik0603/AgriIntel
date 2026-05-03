import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider } from "./app/AppContext";
import AppShell from "./components/layout/AppShell";
import { useAppContext } from "./app/AppContext";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MarketDataPage = lazy(() => import("./pages/MarketDataPage"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function ProtectedRoute({ children }) {
  const { session } = useAppContext();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Suspense fallback={<div className="route-loading">Loading workspace...</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<AuthPage mode="register" />} />
            <Route path="/login" element={<AuthPage mode="login" />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/workspace/:dashboardId" element={<WorkspacePage />} />
              <Route path="/market-intelligence" element={<MarketDataPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              <Route path="/weather" element={<Navigate to="/workspace" replace />} />
              <Route path="/crop-recommendation" element={<Navigate to="/workspace" replace />} />
              <Route path="/price-prediction" element={<Navigate to="/market-intelligence" replace />} />
              <Route path="/market-data" element={<Navigate to="/market-intelligence" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppProvider>
    </BrowserRouter>
  );
}
