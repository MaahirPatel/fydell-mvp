import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri dev server port must match tauri.conf.json devUrl.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // Tauri loads the frontend from a local file/custom protocol, so asset
  // paths must be relative. Without this, Vite emits absolute /assets/...
  // paths and the app renders a blank window.
  base: "./",
  server: { port: 1420, strictPort: true },
  build: { target: "es2021" },
});
