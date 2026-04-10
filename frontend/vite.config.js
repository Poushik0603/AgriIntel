import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:8090",
      "/weather": "http://localhost:8090",
      "/crop": "http://localhost:8090",
      "/price": "http://localhost:8090",
      "/market-data": "http://localhost:8090",
    },
  },
});
