import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers.ts";
import * as routes from "./routes.ts";

const router = createRouter()
  .openapi(routes.getMe, handlers.getMeHandler)
  .openapi(routes.updateMe, handlers.updateMeHandler)
  .openapi(routes.getUserById, handlers.getUserByIdHandler);

export default router;
