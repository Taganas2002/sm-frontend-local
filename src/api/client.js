import axios from "axios";

function pickBase() {
  try {
    const fromStorage =
      typeof window !== "undefined" && localStorage.getItem("apiBase");
    const fromWindow =
      typeof window !== "undefined" && (window.__API_BASE__ || null);
    const fromEnv = import.meta?.env?.VITE_API_BASE_URL;

    // Default base URL (no trailing /api here)
    const raw = fromStorage || fromWindow || fromEnv || "http://127.0.0.1:8080";
    return String(raw).replace(/\/+$/, "");
  } catch {
    return "http://127.0.0.1:8080";
  }
}

const api = axios.create({
  baseURL: pickBase() + "/api",   // ✅ always append /api here
  timeout: 20000,
  headers: { Accept: "application/json" },
});

export function setApiBase(base) {
  const clean = String(base || "http://127.0.0.1:18080").replace(/\/+$/, "");
  api.defaults.baseURL = clean + "/api";  // ✅ ensure /api
  if (typeof window !== "undefined")
    localStorage.setItem("apiBase", clean);
}

function readToken() {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    const a = JSON.parse(raw);
    return a?.accessToken || a?.token || a?.jwt || a?.access_token || null;
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
    if (err?.response?.status === 401) {
      // optional redirect to login
      // localStorage.removeItem("auth");
      // window.location.hash = "#/login";
    }
    return Promise.reject(err?.response?.data ?? { message: err?.message });
  }
);

export default api;
