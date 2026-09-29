import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? "/job-tracker-mcp/" : "/",
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    globals: true,
  },
});
