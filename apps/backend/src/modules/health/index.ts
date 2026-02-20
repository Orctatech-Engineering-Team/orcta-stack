import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter()
	.openapi(routes.healthCheck, handlers.healthCheckHandler)
	.openapi(routes.ping, handlers.pingHandler);

export default router;
