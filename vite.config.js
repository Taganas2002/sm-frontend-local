import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Prod (desktop) base (always includes /api)
  const prodBase = env.VITE_API_BASE_URL || "http://127.0.0.1:18080/api";

  // For dev, proxy /api → backend (localhost:8080)
  let devOrigin = "http://localhost:8080";
  try {
    devOrigin = new URL(prodBase).origin;
  } catch {}

  return {
    plugins: [react(), tailwindcss()],
    base: "./",
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: devOrigin, // backend dev runs on 8080
          changeOrigin: true,
        },
      },
    },
  };
});
