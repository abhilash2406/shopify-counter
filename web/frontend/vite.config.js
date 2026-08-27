import { defineConfig } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import react from "@vitejs/plugin-react";

// Only fills in vars `shopify app dev` hasn't already injected (dotenv never
// overrides an existing process.env value) — lets FRONTEND_PORT/BACKEND_URL
// come from .env when running this frontend standalone.
dotenv.config();

if (
  process.env.npm_lifecycle_event === "build" &&
  !process.env.CI &&
  !process.env.SHOPIFY_API_KEY
) {
  throw new Error(
    "\n\nThe frontend build will not work without an API key. Set the SHOPIFY_API_KEY environment variable when running the build command, for example:" +
      "\n\nSHOPIFY_API_KEY=<your-api-key> npm run build\n"
  );
}

process.env.VITE_SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

const proxyOptions = {
  // BACKEND_PORT is injected by `shopify app dev` and is authoritative — it
  // picks a fresh dynamic port per run. BACKEND_URL from .env is only the
  // fallback for running this frontend standalone.
  target: process.env.BACKEND_PORT
    ? `http://127.0.0.1:${process.env.BACKEND_PORT}`
    : process.env.BACKEND_URL,
  changeOrigin: false,
  secure: true,
  ws: false,
};

const host = process.env.HOST
  ? process.env.HOST.replace(/https?:\/\//, "")
  : "localhost";

let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: process.env.FRONTEND_PORT,
    clientPort: 443,
  };
}

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    host: "localhost",
    port: process.env.FRONTEND_PORT,
    hmr: hmrConfig,
    proxy: {
      "^/(\\?.*)?$": proxyOptions,
      "^/api(/|(\\?.*)?$)": proxyOptions,
      // Swagger UI is served by the backend, and `^/api(/...)` above does not
      // match "/api-docs" (the char after "/api" is a dash, not a slash).
      "^/api-docs(/|(\\?.*)?$)": proxyOptions,
    },
  },
});
