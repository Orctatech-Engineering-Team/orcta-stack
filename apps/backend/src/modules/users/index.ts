import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter()
	.openapi(routes.getMe, handlers.getMeHandler)
	.openapi(routes.updateMe, handlers.updateMeHandler)
	.openapi(routes.getUserById, handlers.getUserByIdHandler);

export default router;
