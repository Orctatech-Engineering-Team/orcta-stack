import { createRouter } from "@/lib/create-app";
import * as routes from "./routes";
import * as handlers from "./handlers";

const router = createRouter()
  .openapi(routes.healthCheck, handlers.healthCheckHandler)
  .openapi(routes.ping, handlers.pingHandler);

export default router;
