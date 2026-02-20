// Health check use-case with discriminated union return type

// Dependencies required by this use-case
export interface CheckHealthDeps {
	checkDatabase: () => Promise<boolean>;
}

// Input for the use-case
interface CheckHealthInput {
	startTime: number;
	version: string;
}

// Discriminated union result type
type CheckHealthResult =
	| {
			type: "HEALTHY";
			data: HealthData;
	  }
	| {
			type: "UNHEALTHY";
			data: HealthData;
	  };

interface HealthData {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	version: string;
	uptime: number;
	services: {
		database: "up" | "down";
	};
}

export async function checkHealthUseCase(
	deps: CheckHealthDeps,
	input: CheckHealthInput,
): Promise<CheckHealthResult> {
	const { checkDatabase } = deps;
	const { startTime, version } = input;

	// Check database connectivity
	const databaseUp = await checkDatabase();

	const data: HealthData = {
		status: databaseUp ? "healthy" : "unhealthy",
		timestamp: new Date().toISOString(),
		version,
		uptime: Math.floor((Date.now() - startTime) / 1000),
		services: {
			database: databaseUp ? "up" : "down",
		},
	};

	if (databaseUp) {
		return { type: "HEALTHY", data };
	}

	return { type: "UNHEALTHY", data };
}
