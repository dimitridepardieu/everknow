import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [tanstackRouter({ quoteStyle: "double" }), react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
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
