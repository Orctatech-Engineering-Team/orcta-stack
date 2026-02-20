import health from "@/modules/health";
import users from "@/modules/users";

// Public routes (no auth required)
export const publicRoutes = [health];

// Protected routes (auth required — authMiddleware applied in app.ts)
export const routes = [
	users,
	// posts,
];
