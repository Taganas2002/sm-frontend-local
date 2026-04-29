// src/api/client.js
import axios from "axios";

function pickBase() {
  try {
    const hasWindow = typeof window !== "undefined";
    const fromStorage = hasWindow && localStorage.getItem("apiBase");
    const fromWindow = hasWindow && window.__API_BASE__;
    const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) || null;
    const sameOrigin = hasWindow && window.location?.origin ? window.location.origin : null;

    const looksLocal = (v) => {
      if (!v) return false;
      const s = String(v).trim();
      try {
        const u = new URL(/^https?:\/\//i.test(s) ? s : `http://${s}`);
        const h = String(u.hostname || "").toLowerCase();
        return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";
      } catch {
        return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(s);
      }
    };

    // In production browser sessions, ignore stale localStorage apiBase values
    // pointing to localhost to avoid "Network Error" after deployments.
    const onLocalHost =
      hasWindow &&
      /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location?.hostname || "");

    const shouldIgnoreStoredLocal =
      hasWindow &&
      !!fromStorage &&
      looksLocal(fromStorage) &&
      !onLocalHost;
    const shouldIgnoreWindowLocal = hasWindow && !!fromWindow && looksLocal(fromWindow) && !onLocalHost;
    const shouldIgnoreEnvLocal = hasWindow && !!fromEnv && looksLocal(fromEnv) && !onLocalHost;

    const raw =
      (shouldIgnoreStoredLocal ? null : fromStorage) ||
      (shouldIgnoreWindowLocal ? null : fromWindow) ||
      (shouldIgnoreEnvLocal ? null : fromEnv) ||
      sameOrigin ||
      "http://127.0.0.1:8080";

    // strip trailing slashes
    return String(raw).replace(/\/+$/, "");
  } catch {
    if (typeof window !== "undefined" && window.location?.origin) {
      return String(window.location.origin).replace(/\/+$/, "");
    }
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

function hasStoredAuth() {
  try {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("auth");
  } catch {
    return false;
  }
}

function forceLogoutToLogin() {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth");
    const h = window.location?.hash || "";
    if (h !== "#/login" && h !== "#/signup" && h !== "#/super-admin/login" && h !== "#/expired") {
      window.location.hash = "#/login";
    }
  } catch {
    // no-op
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

    // If token/session is no longer valid, force logout and move to login.
    // We only do this when auth exists to avoid redirect noise on public pages.
    if (status === 401 && hasStoredAuth()) {
      forceLogoutToLogin();
    }

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
