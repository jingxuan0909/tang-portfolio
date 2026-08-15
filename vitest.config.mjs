// Runs React component tests in a browser-like jsdom environment.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{js,jsx}"],
    setupFiles: ["./tests/setup.mjs"],
    restoreMocks: true,
  },
});
