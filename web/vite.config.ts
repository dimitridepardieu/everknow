import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "./src",
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["flashcardacademy.localhost"],
    hmr: {
      host: "flashcardacademy.localhost",
      clientPort: 443,
      protocol: "wss",
    },
  },
});
