import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers.ts";
import * as routes from "./routes.ts";

const router = createRouter()
  .openapi(routes.healthCheck, handlers.healthCheckHandler)
  .openapi(routes.ping, handlers.pingHandler);

export default router;
