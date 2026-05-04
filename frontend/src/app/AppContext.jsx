import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  authService,
  getDefaultApiBase,
  getStoredSession,
  profileService,
  scenarioService,
  storageKeys,
} from "../services/api";

const AppContext = createContext(null);

const dashboardPlaceholder = {
  selectedCrops: ["Unselected"],
  recommendedCrops: ["Awaiting analysis"],
  insights: ["Dashboard initialized. Run land discovery to generate recommendations."],
};

function safeRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function ownerKeyFor(session) {
  if (session?.id) {
    return `user-${session.id}`;
  }
  return `email-${String(session?.email || "guest").toLowerCase()}`;
}

function fallbackUserId(session) {
  if (session?.id) {
    return Number(session.id);
  }

  return String(session?.email || "guest")
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 1000);
}

function readDashboardStore() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.dashboards) || "{}");
  } catch {
    return {};
  }
}

function loadLocalDashboards(session) {
  const store = readDashboardStore();
  return store[ownerKeyFor(session)] || [];
}

function saveLocalDashboards(session, dashboards) {
  const store = readDashboardStore();
  store[ownerKeyFor(session)] = dashboards;
  localStorage.setItem(storageKeys.dashboards, JSON.stringify(store));
}

function normalizeSession(response) {
  return {
    id: response.id,
    token: response.token,
    email: response.email,
    role: response.role,
    fullName: response.fullName || response.email?.split("@")[0] || "AgriIntel user",
    organization: response.organization || "",
    workAddress: response.workAddress || "",
    profileCompletion: response.profileCompletion ?? 50,
  };
}

function normalizeScenario(item, session) {
  const createdAt = item.createdAt || new Date().toISOString();
  const recommendedCrops = item.recommendedCrops?.length ? item.recommendedCrops : dashboardPlaceholder.recommendedCrops;
  const coordinates =
    item.coordinates ||
    (item.latitude !== null && item.latitude !== undefined && item.longitude !== null && item.longitude !== undefined
      ? {
          latitude: item.latitude,
          longitude: item.longitude,
          x: item.markerX ?? 52,
          y: item.markerY ?? 40,
        }
      : null);

  return {
    id: String(item.id || safeRandomId()),
    remoteId: item.id || null,
    ownerKey: ownerKeyFor(session),
    title: item.title || `${item.location || "Field"} Analysis`,
    location: item.location || "Unmapped field",
    status: item.status || (recommendedCrops[0] === "Awaiting analysis" ? "Review" : "Optimal"),
    riskSnapshot: item.riskSnapshot || "Pending",
    selectedCrops: item.selectedCrops?.length ? item.selectedCrops : dashboardPlaceholder.selectedCrops,
    recommendedCrops,
    insights: item.insights?.length ? item.insights : dashboardPlaceholder.insights,
    reportNotes: item.reportNotes || "",
    coordinates,
    createdAt,
    updatedAt: item.updatedAt || createdAt,
  };
}

function serializeScenario(dashboard, session) {
  return {
    userId: fallbackUserId(session),
    title: dashboard.title,
    location: dashboard.location || "Unmapped field",
    status: dashboard.status || "Review",
    riskSnapshot: dashboard.riskSnapshot || "Pending",
    selectedCrops: dashboard.selectedCrops?.length ? dashboard.selectedCrops : dashboardPlaceholder.selectedCrops,
    recommendedCrops: dashboard.recommendedCrops?.length
      ? dashboard.recommendedCrops
      : dashboardPlaceholder.recommendedCrops,
    insights: dashboard.insights?.length ? dashboard.insights : dashboardPlaceholder.insights,
    reportNotes: dashboard.reportNotes || "",
    latitude: dashboard.coordinates?.latitude ?? null,
    longitude: dashboard.coordinates?.longitude ?? null,
    markerX: dashboard.coordinates?.x ?? null,
    markerY: dashboard.coordinates?.y ?? null,
  };
}

export function AppProvider({ children }) {
  const [apiBase, setApiBaseState] = useState(getDefaultApiBase);
  const [session, setSession] = useState(getStoredSession);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboards, setDashboards] = useState([]);
  const [dashboardSyncing, setDashboardSyncing] = useState(false);

  function setApiBase(value) {
    setApiBaseState(value);
    localStorage.setItem(storageKeys.apiBase, value);
  }

  async function login(payload) {
    const response = await authService.login(payload, apiBase);
    const nextSession = normalizeSession(response);
    setSession(nextSession);
    localStorage.setItem(storageKeys.session, JSON.stringify(nextSession));
    return response;
  }

  async function register(payload) {
    const response = await authService.register(payload, apiBase);
    const nextSession = normalizeSession(response);
    setSession(nextSession);
    localStorage.setItem(storageKeys.session, JSON.stringify(nextSession));
    return response;
  }

  function logout() {
    setSession(null);
    setDashboards([]);
    localStorage.removeItem(storageKeys.session);
  }

  const refreshProfile = useCallback(async () => {
    if (!session?.token) {
      return null;
    }

    const profile = await profileService.get(apiBase, session.token);
    const nextSession = normalizeSession({ ...session, ...profile, token: session.token });
    setSession(nextSession);
    localStorage.setItem(storageKeys.session, JSON.stringify(nextSession));
    return nextSession;
  }, [apiBase, session]);

  async function updateProfile(payload) {
    const profile = await profileService.update(payload, apiBase, session?.token);
    const nextSession = normalizeSession({ ...session, ...profile, token: session.token });
    setSession(nextSession);
    localStorage.setItem(storageKeys.session, JSON.stringify(nextSession));
    return nextSession;
  }

  useEffect(() => {
    if (!session) {
      setDashboards([]);
      return;
    }

    const localDashboards = loadLocalDashboards(session);
    setDashboards(localDashboards);

    if (!session.token) {
      return;
    }

    let cancelled = false;
    setDashboardSyncing(true);

    scenarioService
      .list(fallbackUserId(session), apiBase, session.token)
      .then((items) => {
        if (cancelled || !Array.isArray(items)) {
          return;
        }

        const remoteDashboards = items.map((item) => normalizeScenario(item, session));
        const remoteIds = new Set(remoteDashboards.map((item) => String(item.remoteId || item.id)));
        const merged = [
          ...remoteDashboards,
          ...localDashboards.filter((item) => !remoteIds.has(String(item.remoteId || item.id))),
        ];

        setDashboards(merged);
        saveLocalDashboards(session, merged);
      })
      .catch(() => {
        setDashboards(localDashboards);
      })
      .finally(() => {
        if (!cancelled) {
          setDashboardSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, session?.email, session?.id, session?.token]);

  async function createDashboard(seed = {}) {
    const now = new Date().toISOString();
    const nextDashboard = {
      id: safeRandomId(),
      remoteId: null,
      ownerKey: ownerKeyFor(session),
      title: seed.title || `Field Analysis ${dashboards.length + 1}`,
      location: seed.location || "Unmapped field",
      status: "Review",
      riskSnapshot: "Pending",
      selectedCrops: dashboardPlaceholder.selectedCrops,
      recommendedCrops: dashboardPlaceholder.recommendedCrops,
      insights: dashboardPlaceholder.insights,
      reportNotes: "",
      coordinates: seed.coordinates || null,
      createdAt: now,
      updatedAt: now,
    };

    const localNext = [nextDashboard, ...dashboards];
    setDashboards(localNext);
    saveLocalDashboards(session, localNext);

    try {
      if (!session?.token) {
        return nextDashboard;
      }

      const remote = await scenarioService.create(serializeScenario(nextDashboard, session), apiBase, session.token);
      const synced = normalizeScenario(remote, session);
      setDashboards((current) => {
        const replaced = current.map((item) => (item.id === nextDashboard.id ? { ...synced, coordinates: nextDashboard.coordinates } : item));
        saveLocalDashboards(session, replaced);
        return replaced;
      });
      return { ...synced, coordinates: nextDashboard.coordinates };
    } catch {
      return nextDashboard;
    }
  }

  async function updateDashboard(id, patch, { sync = true } = {}) {
    let updatedDashboard = null;

    setDashboards((current) => {
      const next = current.map((item) => {
        if (String(item.id) !== String(id)) {
          return item;
        }
        updatedDashboard = { ...item, ...patch, updatedAt: new Date().toISOString() };
        return updatedDashboard;
      });
      saveLocalDashboards(session, next);
      return next;
    });

    if (!sync || !updatedDashboard?.remoteId || !session?.token) {
      return updatedDashboard;
    }

    try {
      const remote = await scenarioService.update(
        updatedDashboard.remoteId,
        serializeScenario(updatedDashboard, session),
        apiBase,
        session.token
      );
      return normalizeScenario(remote, session);
    } catch {
      return updatedDashboard;
    }
  }

  async function deleteDashboard(id) {
    let deletedDashboard = null;
    let nextDashboards = [];

    setDashboards((current) => {
      deletedDashboard = current.find((item) => String(item.id) === String(id));
      nextDashboards = current.filter((item) => String(item.id) !== String(id));
      saveLocalDashboards(session, nextDashboards);
      return nextDashboards;
    });

    if (deletedDashboard?.remoteId && session?.token) {
      try {
        await scenarioService.remove(deletedDashboard.remoteId, apiBase, session.token);
      } catch {
        // Local deletion still wins so the user is not trapped by a transient sync failure.
      }
    }

    return nextDashboards;
  }

  const value = useMemo(
    () => ({
      apiBase,
      setApiBase,
      session,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
      dashboards,
      dashboardSyncing,
      createDashboard,
      updateDashboard,
      deleteDashboard,
      sidebarOpen,
      setSidebarOpen,
    }),
    [
      apiBase,
      dashboards,
      dashboardSyncing,
      refreshProfile,
      session,
      sidebarOpen,
      login,
      register,
      updateProfile,
      createDashboard,
      updateDashboard,
      deleteDashboard,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}
