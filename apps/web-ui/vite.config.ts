import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    // The UI calls /api/... and Vite forwards it to the local API (no CORS needed in dev)
    proxy: { "/api": "http://127.0.0.1:4000" },
  },
});
