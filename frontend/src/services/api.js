const defaultApiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "" : "http://localhost:8090");

export const storageKeys = {
  apiBase: "agriintel_api_base",
  session: "agriintel_session",
  dashboards: "agriintel_dashboards_v2",
};

export function getDefaultApiBase() {
  return localStorage.getItem(storageKeys.apiBase) ?? defaultApiBase;
}

export function getStoredSession() {
  const raw = localStorage.getItem(storageKeys.session);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(storageKeys.session);
    return null;
  }
}

async function apiRequest(path, { method = "GET", body, token, apiBase = defaultApiBase } = {}) {
  const url = path.startsWith("http") ? path : `${apiBase}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Request failed");
  }

  return payload;
}

export const authService = {
  register(payload, apiBase) {
    return apiRequest("/auth/register", { method: "POST", body: payload, apiBase });
  },
  login(payload, apiBase) {
    return apiRequest("/auth/login", { method: "POST", body: payload, apiBase });
  },
};

export const profileService = {
  get(apiBase, token) {
    return apiRequest("/auth/user/profile", { apiBase, token });
  },
  update(payload, apiBase, token) {
    return apiRequest("/auth/user/profile", { method: "PUT", body: payload, apiBase, token });
  },
};

export const weatherService = {
  getByCity(city, apiBase, token) {
    return apiRequest(`/weather?city=${encodeURIComponent(city)}`, { apiBase, token });
  },
  getByLocation({ latitude, longitude, city }, apiBase, token) {
    const params = new URLSearchParams();
    if (city) {
      params.set("city", city);
    }
    if (latitude !== undefined && latitude !== null) {
      params.set("lat", latitude);
    }
    if (longitude !== undefined && longitude !== null) {
      params.set("lon", longitude);
    }
    return apiRequest(`/weather?${params.toString()}`, { apiBase, token });
  },
};

export const cropService = {
  recommend(payload, apiBase, token) {
    return apiRequest("/crop/recommend", { method: "POST", body: payload, apiBase, token });
  },
};

export const priceService = {
  predict(crop, apiBase, token) {
    return apiRequest(`/price/predict?crop=${encodeURIComponent(crop)}`, { apiBase, token });
  },
  predictMany(crops, apiBase, token) {
    return apiRequest(`/price/predict?crops=${encodeURIComponent(crops.join(","))}`, { apiBase, token });
  },
};

export const marketDataService = {
  list(apiBase, token) {
    return apiRequest("/market-data", { apiBase, token });
  },
  create(payload, apiBase, token) {
    return apiRequest("/market-data", { method: "POST", body: payload, apiBase, token });
  },
  update(id, payload, apiBase, token) {
    return apiRequest(`/market-data/${id}`, { method: "PUT", body: payload, apiBase, token });
  },
  remove(id, apiBase, token) {
    return apiRequest(`/market-data/${id}`, { method: "DELETE", apiBase, token });
  },
};

export const analysisService = {
  run(payload, apiBase, token) {
    return apiRequest("/analysis", { method: "POST", body: payload, apiBase, token });
  },
};

export const scenarioService = {
  list(userId, apiBase, token) {
    return apiRequest(`/scenarios?userId=${encodeURIComponent(userId)}`, { apiBase, token });
  },
  create(payload, apiBase, token) {
    return apiRequest("/scenarios", { method: "POST", body: payload, apiBase, token });
  },
  update(id, payload, apiBase, token) {
    return apiRequest(`/scenarios/${id}`, { method: "PUT", body: payload, apiBase, token });
  },
};

const knownLocations = [
  { label: "Chennai, TN", city: "Chennai", latitude: 13.0827, longitude: 80.2707 },
  { label: "Coimbatore Region", city: "Coimbatore", latitude: 11.0168, longitude: 76.9558 },
  { label: "Thanjavur Delta", city: "Thanjavur", latitude: 10.787, longitude: 79.1378 },
  { label: "Madurai District", city: "Madurai", latitude: 9.9252, longitude: 78.1198 },
  { label: "Delhi NCR", city: "Delhi", latitude: 28.6139, longitude: 77.209 },
  { label: "Mumbai Region", city: "Mumbai", latitude: 19.076, longitude: 72.8777 },
];

function nearestKnownLocation(latitude, longitude) {
  return knownLocations
    .map((item) => ({
      ...item,
      distance: Math.hypot(Number(latitude) - item.latitude, Number(longitude) - item.longitude),
    }))
    .sort((left, right) => left.distance - right.distance)[0];
}

export async function reverseGeocode(latitude, longitude) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url);
    const payload = await response.json();
    const firstResult = payload.results?.[0];

    if (payload.status === "OK" && firstResult) {
      const locality =
        firstResult.address_components?.find((item) => item.types.includes("locality"))?.long_name ||
        firstResult.address_components?.find((item) => item.types.includes("administrative_area_level_2"))?.long_name ||
        "Mapped field";

      return {
        label: firstResult.formatted_address,
        city: locality,
        source: "Google Maps Geocoding",
      };
    }

    throw new Error(payload.error_message || "Google geocoding failed for this point.");
  }

  const fallback = nearestKnownLocation(latitude, longitude);
  return {
    label: fallback.label,
    city: fallback.city,
    source: "Local geocoding fallback",
  };
}
