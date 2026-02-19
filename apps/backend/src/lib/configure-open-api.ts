import { apiReference } from "@scalar/hono-api-reference";
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
    apiReference({
      theme: "kepler",
      layout: "modern",
      spec: {
        url: "/openapi.json",
      },
      defaultHttpClient: {
        targetKey: "javascript",
        clientKey: "fetch",
      },
    })
  );
}
