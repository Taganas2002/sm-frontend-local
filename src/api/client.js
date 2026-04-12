// src/api/client.js
import axios from "axios";

function pickBase() {
  try {
    const fromStorage =
      typeof window !== "undefined" && localStorage.getItem("apiBase");
    const fromWindow =
      typeof window !== "undefined" && window.__API_BASE__;
    const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) || null;

    const raw = fromStorage || fromWindow || fromEnv || "http://127.0.0.1:8080";

    // strip trailing slashes
    return String(raw).replace(/\/+$/, "");
  } catch {
    return "http://127.0.0.1:8080";
  }
}

const api = axios.create({
  baseURL: pickBase() + "/api",
  timeout: 20000,
  headers: { Accept: "application/json" },
});

export function setApiBase(base) {
  const clean = String(base || "http://127.0.0.1:8080").replace(/\/+$/, "");
  api.defaults.baseURL = clean + "/api";
  if (typeof window !== "undefined") localStorage.setItem("apiBase", clean);
}

function readToken() {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    const a = JSON.parse(raw);
    return a && (a.accessToken || a.token || a.jwt || a.access_token) || null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;

    // Immediate kick-out for expired/deactivated school license.
    // This avoids waiting for periodic status polling in UI.
    if (
      status === 402 &&
      data?.error === "license_expired" &&
      typeof window !== "undefined" &&
      window.location?.hash !== "#/expired"
    ) {
      window.location.hash = "#/expired";
    }

    // Do not redirect or clear auth on 401 here. A global hash jump logs users out of good sessions
    // when one endpoint fails (e.g. calendar) while the JWT is still valid. Let callers handle 401.

    let message = data?.message;
    if (
      !message &&
      data &&
      typeof data === "object" &&
      data.error === "VALIDATION_ERROR" &&
      data.fields &&
      typeof data.fields === "object"
    ) {
      message = Object.entries(data.fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
    }

    return Promise.reject({
      status,
      ...(data && typeof data === "object" ? data : {}),
      message: message || err?.message || "Request failed",
    });
  }
);

export default api;
