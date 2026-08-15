// Configures React, local development, Vercel output, and the legacy local content API.
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { contentApiPlugin } from "./server/content-api.mjs";

// Creates different output folders for Vercel and the older Sites build process.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isVercelBuild = mode === "vercel";
  return {
    build: {
      outDir: isVercelBuild ? "dist" : "dist/client",
    },
    // Pre-bundle React dependencies to make the local server start faster.
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    // Allow the portfolio to run in VS Code, localhost, and the Codex preview.
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local", "localhost"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    // Enable React and the legacy local content API used by earlier builds.
    plugins: [react(), contentApiPlugin(env)],
  };
});
