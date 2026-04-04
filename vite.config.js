import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // ✅ Prod (desktop) base WITHOUT /api (Axios will add /api)
  const prodBase = env.VITE_API_BASE_URL || "http://127.0.0.1:8080";

  // Dev proxy target (origin only)
  let devOrigin = "http://localhost:8080";
  try {
    // If you set a custom prod base, reuse its origin for proxy
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
          target: devOrigin,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      emptyOutDir: true,
    },
  };
});
