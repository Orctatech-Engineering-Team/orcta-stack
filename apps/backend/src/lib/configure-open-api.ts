import { Scalar } from "@scalar/hono-api-reference";
import type { AppType } from "./create-app";

export default function configureOpenAPI(app: AppType) {
	app.doc("/openapi.json", {
		openapi: "3.1.0",
		info: {
			title: "Orcta Stack API",
			version: "1.0.0",
			description: "API documentation for Orcta Stack",
		},
		servers: [
			{
				url: "http://localhost:9999",
				description: "Local development",
			},
		],
	});

	app.get(
		"/docs",
		Scalar({
			theme: "kepler",
			layout: "modern",
			defaultHttpClient: {
				targetKey: "js",
				clientKey: "fetch",
			},
			url: "/openapi.json",
			sources: [
				{
					title: "Backend API",
					url: "/openapi.json",
				},
				{ url: "/api/auth/open-api/generate-schema", title: "Auth" },
			],
			title: "Orcta Stack API Reference",
			metaData: {
				title: "Orcta Stack",
				description: "Interactive API documentation for Orcta Stack",
				ogDescription: "Explore and test the Orcta Stack API endpoints",
				ogTitle: "Orcta Stack API Documentation",
				twitterCard: "summary_large_image",
			},
			searchHotKey: "k",
			showSidebar: true,
			hideModels: false,
			hideDownloadButton: false,
			hideDarkModeToggle: false,
		}),
	);
}
