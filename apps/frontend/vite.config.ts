import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	root: __dirname,
	plugins: [
		tanstackRouter({
			routesDirectory: path.resolve(__dirname, "./src/routes"),
		}),
		react(),
		tailwindcss(),
	],
	oxc: {},
	resolve: {
		tsconfigPaths: true,
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: "http://localhost:9999",
				changeOrigin: true,
			},
		},
	},
});
