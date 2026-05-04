import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppContext } from "../app/AppContext";
import Modal from "../components/ui/Modal";
import { cropService, priceService, reverseGeocode, searchLocations, weatherService } from "../services/api";
import { formatCurrency, formatDateShort, formatPercent } from "../utils/formatters";

const defaultCoordinates = { latitude: 11.0168, longitude: 76.9558 };
const fieldMarkerIcon = L.divIcon({
  className: "leaflet-field-marker",
  html: "<span></span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function coordinatesToMapPoint(latitude, longitude) {
  const x = Math.min(100, Math.max(0, ((Number(longitude) - 68) / 30) * 100));
  const y = Math.min(100, Math.max(0, (1 - (Number(latitude) - 6) / 30) * 100));
  return { x, y };
}

function withMarkerPosition(nextCoordinates) {
  const point = coordinatesToMapPoint(nextCoordinates.latitude, nextCoordinates.longitude);
  return {
    latitude: Number(Number(nextCoordinates.latitude).toFixed(5)),
    longitude: Number(Number(nextCoordinates.longitude).toFixed(5)),
    x: point.x,
    y: point.y,
  };
}

function MiniMapPreview({ coordinates }) {
  return (
    <MapContainer
      className="mini-leaflet-map"
      center={[coordinates.latitude, coordinates.longitude]}
      zoom={10}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      keyboard={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapCenterSync coordinates={coordinates} />
      <Marker icon={fieldMarkerIcon} position={[coordinates.latitude, coordinates.longitude]} />
    </MapContainer>
  );
}

function MapCenterSync({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 80);
    map.setView([coordinates.latitude, coordinates.longitude], map.getZoom(), { animate: true });
    return () => window.clearTimeout(resizeTimer);
  }, [coordinates.latitude, coordinates.longitude, map]);

  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  return null;
}

function LeafletMapPicker({ coordinates, onPick, onLocationResolved }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function handleSearch(event) {
    event.preventDefault();
    setSearchError("");
    setSearching(true);
    try {
      const nextResults = await searchLocations(query);
      setResults(nextResults);
      if (!nextResults.length) {
        setSearchError("No matching address found.");
      }
    } catch (error) {
      setSearchError(error.message || "Address search failed.");
    } finally {
      setSearching(false);
    }
  }

  function selectAddress(result) {
    onPick({ latitude: result.latitude, longitude: result.longitude });
    onLocationResolved({
      label: result.label,
      city: result.city,
      source: result.source,
    });
    setQuery(result.label);
    setResults([]);
  }

  return (
    <div className="leaflet-picker">
      <form className="map-search-form" onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search village, city, district, or field address"
        />
        <button type="submit" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchError ? <p className="map-search-error">{searchError}</p> : null}
      {results.length ? (
        <div className="map-search-results">
          {results.map((result) => (
            <button type="button" key={`${result.latitude}-${result.longitude}`} onClick={() => selectAddress(result)}>
              <strong>{result.city}</strong>
              <span>{result.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <MapContainer
        className="leaflet-map-canvas"
        center={[coordinates.latitude, coordinates.longitude]}
        zoom={12}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterSync coordinates={coordinates} />
        <MapClickHandler onPick={onPick} />
        <Marker
          draggable
          icon={fieldMarkerIcon}
          position={[coordinates.latitude, coordinates.longitude]}
          eventHandlers={{
            dragend(event) {
              const position = event.target.getLatLng();
              onPick({ latitude: position.lat, longitude: position.lng });
            },
          }}
        />
      </MapContainer>
    </div>
  );
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
  const { apiBase, createDashboard, dashboards, deleteDashboard, session, updateDashboard } = useAppContext();
  const [search, setSearch] = useState("");
  const [coordinates, setCoordinates] = useState({ ...defaultCoordinates, x: 52, y: 40 });
  const [coordinateDraft, setCoordinateDraft] = useState({
    latitude: String(defaultCoordinates.latitude),
    longitude: String(defaultCoordinates.longitude),
  });
  const [location, setLocation] = useState({ label: "Coimbatore Region", city: "Coimbatore", source: "Default field" });
  const [analysis, setAnalysis] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [priceResult, setPriceResult] = useState(null);
  const [reportNotes, setReportNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [message, setMessage] = useState("");
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [manualCoordinateModalOpen, setManualCoordinateModalOpen] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingDashboard, setDeletingDashboard] = useState(false);
  const [geocodingLocation, setGeocodingLocation] = useState(false);
  const [dashboardMenu, setDashboardMenu] = useState(null);

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
  const recommendationList = useMemo(
    () => (recommendations.length ? recommendations : (activeDashboard?.recommendedCrops || []).map(normalizeRecommendation)),
    [activeDashboard?.recommendedCrops, recommendations]
  );
  const visibleRecommendations = useMemo(() => {
    const topThree = recommendationList.slice(0, 3);
    const selectedOutsideTopThree = selectedCrop && !topThree.some((item) => item.crop === selectedCrop);

    if (selectedOutsideTopThree) {
      const selectedItem = recommendationList.find((item) => item.crop === selectedCrop);
      if (selectedItem) {
        return [...topThree.slice(0, 2), selectedItem];
      }
    }

    return topThree;
  }, [recommendationList, selectedCrop]);

  const selectedRecommendation = recommendationList.find((item) => item.crop === selectedCrop) || recommendationList[0];
  const dashboardMenuItem = dashboardMenu
    ? dashboards.find((item) => String(item.id) === String(dashboardMenu.dashboardId))
    : null;

  useEffect(() => {
    if (activeDashboard) {
      setReportNotes(activeDashboard.reportNotes || "");
      setLocation({
        label: activeDashboard.location || "Unmapped field",
        city: activeDashboard.location || "Mapped field",
        source: activeDashboard.coordinates ? "Saved dashboard" : "Default field",
      });
      if (activeDashboard.coordinates) {
        setCoordinates({
          ...activeDashboard.coordinates,
          x: activeDashboard.coordinates.x ?? 52,
          y: activeDashboard.coordinates.y ?? 40,
        });
      }
    }
  }, [activeDashboard]);

  useEffect(() => {
    setCoordinateDraft({
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
    });
  }, [coordinates.latitude, coordinates.longitude]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setGeocodingLocation(true);
      reverseGeocode(coordinates.latitude, coordinates.longitude)
        .then((geocode) => {
          if (!cancelled) {
            setLocation(geocode);
            if (activeDashboard) {
              updateDashboard(
                activeDashboard.id,
                {
                  coordinates,
                  location: geocode.label,
                },
                { sync: true }
              );
            }
          }
        })
        .finally(() => {
          if (!cancelled) {
            setGeocodingLocation(false);
          }
        });
    }, 550);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeDashboard?.id, coordinates.latitude, coordinates.longitude]);

  useEffect(() => {
    if (recommendationList.length && (!selectedCrop || !recommendationList.some((item) => item.crop === selectedCrop))) {
      setSelectedCrop(recommendationList[0].crop);
    }
  }, [recommendationList, selectedCrop]);

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

  function openDashboardMenu(event, dashboardId) {
    event.preventDefault();
    event.stopPropagation();
    setDashboardMenu({
      dashboardId,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function closeDashboardMenu() {
    setDashboardMenu(null);
  }

  const handleCoordinatePick = useCallback((nextCoordinates) => {
    setCoordinates(withMarkerPosition(nextCoordinates));
    setMessage("");
  }, []);

  function applyManualCoordinates(event) {
    event.preventDefault();
    const latitude = Number(coordinateDraft.latitude);
    const longitude = Number(coordinateDraft.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setMessage("Enter valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }

    handleCoordinatePick({ latitude, longitude });
    setMessage("Coordinates updated. Run analysis to refresh weather, soil, and recommendations.");
    setManualCoordinateModalOpen(false);
  }

  function handleMapClick() {
    setMapModalOpen(true);
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setMessage("Device location is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(
          withMarkerPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        );
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
          humidity: weather?.humidity ?? null,
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
          `Weather baseline for ${geocode.city}: ${Math.round(weather.temperature)} C, ${Math.round(weather.humidity)}% humidity, ${Math.round(weather.rainfall)} mm rainfall.`,
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
          `Fallback weather baseline for ${geocode.city}: ${nextAnalysis.weather.temperature} C.`,
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

  async function saveDashboardFromMenu() {
    const targetDashboard = dashboardMenuItem || activeDashboard;
    if (!targetDashboard) {
      return;
    }

    await updateDashboard(targetDashboard.id, {
      coordinates: targetDashboard.id === activeDashboard?.id ? coordinates : targetDashboard.coordinates,
      location: targetDashboard.id === activeDashboard?.id ? location.label : targetDashboard.location,
      reportNotes: targetDashboard.id === activeDashboard?.id ? reportNotes : targetDashboard.reportNotes,
      selectedCrops: targetDashboard.selectedCrops,
      recommendedCrops: targetDashboard.recommendedCrops,
      insights: targetDashboard.insights,
      riskSnapshot: targetDashboard.riskSnapshot,
      status: targetDashboard.status,
    });
    setMessage("Dashboard saved.");
    closeDashboardMenu();
  }

  function moveToPricePrediction() {
    navigate(`/market-intelligence?crop=${encodeURIComponent(selectedCrop || selectedRecommendation?.crop || "Rice")}`);
  }

  async function confirmDeleteDashboard() {
    if (!activeDashboard) {
      return;
    }

    setDeletingDashboard(true);
    const remainingDashboards = await deleteDashboard(activeDashboard.id);
    setDeletingDashboard(false);
    setDeleteModalOpen(false);

    const nextDashboard = remainingDashboards[0];
    navigate(nextDashboard ? `/workspace/${nextDashboard.id}` : "/workspace");
  }

  useEffect(() => {
    if (!dashboardMenu) {
      return undefined;
    }

    function handleDismiss() {
      closeDashboardMenu();
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeDashboardMenu();
      }
    }

    window.addEventListener("click", handleDismiss);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("click", handleDismiss);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [dashboardMenu]);

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
              onContextMenu={(event) => openDashboardMenu(event, dashboard.id)}
            >
              <strong>{dashboard.title}</strong>
              <span>{dashboard.location}</span>
              <small>{formatDateShort(dashboard.updatedAt || dashboard.createdAt)}</small>
            </Link>
          ))}
        </div>

        {dashboardMenu && dashboardMenuItem ? (
          <div
            className="dashboard-context-menu"
            style={{ left: `${dashboardMenu.x}px`, top: `${dashboardMenu.y}px` }}
            role="menu"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <button type="button" onClick={saveDashboardFromMenu}>
              Save dashboard
            </button>
            <button
              type="button"
              className="danger-option"
              onClick={() => {
                setDeleteModalOpen(true);
                closeDashboardMenu();
              }}
            >
              Delete dashboard
            </button>
          </div>
        ) : null}
      </aside>

      <section className="workspace-main">
        <div className="workspace-toolbar">
          <div>
            <p className="eyebrow">Analytics workspace</p>
            <h2>{activeDashboard.title}</h2>
          </div>
          <div className="workspace-toolbar-actions">
            <button className="new-dashboard-button" type="button" onClick={runLandDiscovery} disabled={loading}>
              <span className="pin-icon" />
              {loading ? "Analyzing land..." : "Find your land"}
            </button>
          </div>
        </div>

        <section className="map-panel">
          <div
            className="interactive-map mini-map-shell"
            onClick={handleMapClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleMapClick();
              }
            }}
            role="button"
            tabIndex={0}
            title="Open map selector"
          >
            <MiniMapPreview coordinates={coordinates} />
            <div className="mini-map-overlay">
              <span>{location.city || "Mapped field"}</span>
              <strong>
                {coordinates.latitude}, {coordinates.longitude}
              </strong>
            </div>
          </div>
          <div className="map-side">
            <span>Marked coordinates</span>
            <strong>
              {coordinates.latitude}, {coordinates.longitude}
            </strong>
            <span>Detected land region</span>
            <p>{location.label}</p>
            <small>{geocodingLocation ? "Resolving location..." : location.source}</small>
            <div className="button-row">
              <button type="button" onClick={() => setMapModalOpen(true)}>
                Open map
              </button>
              <button type="button" onClick={() => setManualCoordinateModalOpen(true)}>
                Give coordinates manually
              </button>
            </div>
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

        <Modal
          open={mapModalOpen}
          title="Select field coordinates"
          description="Click anywhere on the map or drag the marker, then run analysis with those coordinates."
          onClose={() => setMapModalOpen(false)}
          footer={
            <div className="modal-coordinate-footer">
              <span>
                {coordinates.latitude}, {coordinates.longitude}
              </span>
              <button className="new-dashboard-button" type="button" onClick={() => setMapModalOpen(false)}>
                Use these coordinates
              </button>
            </div>
          }
        >
          <LeafletMapPicker coordinates={coordinates} onPick={handleCoordinatePick} onLocationResolved={setLocation} />
        </Modal>

        <Modal
          open={manualCoordinateModalOpen}
          title="Give coordinates manually"
          description="Enter latitude and longitude for the field you want AgriIntel to analyze."
          onClose={() => setManualCoordinateModalOpen(false)}
          footer={
            <div className="modal-coordinate-footer">
              <button className="quiet-button" type="button" onClick={() => setManualCoordinateModalOpen(false)}>
                Cancel
              </button>
              <button className="new-dashboard-button" type="submit" form="manual-coordinate-form">
                Apply coordinates
              </button>
            </div>
          }
        >
          <form id="manual-coordinate-form" className="coordinate-form modal-coordinate-form" onSubmit={applyManualCoordinates}>
            <label>
              Latitude
              <input
                value={coordinateDraft.latitude}
                onChange={(event) => setCoordinateDraft((current) => ({ ...current, latitude: event.target.value }))}
                inputMode="decimal"
                placeholder="11.0168"
              />
            </label>
            <label>
              Longitude
              <input
                value={coordinateDraft.longitude}
                onChange={(event) => setCoordinateDraft((current) => ({ ...current, longitude: event.target.value }))}
                inputMode="decimal"
                placeholder="76.9558"
              />
            </label>
          </form>
        </Modal>

        <Modal
          open={deleteModalOpen}
          title="Delete dashboard"
          description="This removes the dashboard from your archive and scenario database."
          onClose={() => setDeleteModalOpen(false)}
          footer={
            <div className="modal-coordinate-footer">
              <button className="quiet-danger-button" type="button" onClick={() => setDeleteModalOpen(false)}>
                Keep dashboard
              </button>
              <button className="danger-button solid" type="button" onClick={confirmDeleteDashboard} disabled={deletingDashboard}>
                {deletingDashboard ? "Deleting..." : "Delete dashboard"}
              </button>
            </div>
          }
        >
          <div className="delete-dashboard-copy">
            <strong>{activeDashboard.title}</strong>
            <p>{activeDashboard.location}</p>
          </div>
        </Modal>

        {message ? <div className="workspace-message">{message}</div> : null}

        <div className="foundation-grid">
          <article className="metric-block weather-block">
            <div className="metric-head">
              <span>Current weather</span>
              <span className="sun-icon" />
            </div>
            <strong className="temperature-value compact">
              <span>{Math.round(weather?.temperature ?? 28)}</span>
              <small>&deg;C</small>
            </strong>
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
            <div>
              <h2>System Recommendations</h2>
              <p>Based on {location.city || "field"} profile</p>
            </div>
            {recommendationList.length > 3 ? (
              <button type="button" onClick={() => setTierModalOpen(true)}>
                View tier list
              </button>
            ) : null}
          </div>
          <div className="recommendation-grid">
            {visibleRecommendations.map((item, index) => (
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

        <Modal
          open={tierModalOpen}
          title="Crop tier list"
          description="Full ranking from the crop recommendation service for this field."
          onClose={() => setTierModalOpen(false)}
        >
          <div className="tier-list">
            {recommendationList.map((item, index) => (
              <button
                className={`tier-row ${selectedCrop === item.crop ? "selected" : ""}`}
                type="button"
                key={`${item.crop}-tier-${index}`}
                onClick={() => {
                  setSelectedCrop(item.crop);
                  setTierModalOpen(false);
                }}
              >
                <span>#{index + 1}</span>
                <strong>{item.crop}</strong>
                <em>{formatPercent(item.score)} suitability</em>
                <small>{item.riskLevel} risk</small>
              </button>
            ))}
          </div>
        </Modal>

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
