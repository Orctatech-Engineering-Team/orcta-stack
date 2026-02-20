import type { WSContext } from "hono/ws";

type Connection = {
	ws: WSContext;
	userId?: string;
	rooms: Set<string>;
};

class WebSocketManager {
	private connections = new Map<string, Connection>();

	add(id: string, ws: WSContext, userId?: string): void {
		this.connections.set(id, { ws, userId, rooms: new Set() });
	}

	remove(id: string): void {
		this.connections.delete(id);
	}

	get(id: string): Connection | undefined {
		return this.connections.get(id);
	}

	// Join a room
	join(id: string, room: string): void {
		const conn = this.connections.get(id);
		if (conn) conn.rooms.add(room);
	}

	// Leave a room
	leave(id: string, room: string): void {
		const conn = this.connections.get(id);
		if (conn) conn.rooms.delete(room);
	}

	// Send to specific connection
	send(id: string, data: unknown): void {
		const conn = this.connections.get(id);
		if (conn) conn.ws.send(JSON.stringify(data));
	}

	// Send to all connections in a room
	broadcast(room: string, data: unknown, excludeId?: string): void {
		const message = JSON.stringify(data);
		for (const [id, conn] of this.connections) {
			if (conn.rooms.has(room) && id !== excludeId) {
				conn.ws.send(message);
			}
		}
	}

	// Send to a specific user (all their connections)
	sendToUser(userId: string, data: unknown): void {
		const message = JSON.stringify(data);
		for (const conn of this.connections.values()) {
			if (conn.userId === userId) {
				conn.ws.send(message);
			}
		}
	}

	// Broadcast to all connections
	broadcastAll(data: unknown, excludeId?: string): void {
		const message = JSON.stringify(data);
		for (const [id, conn] of this.connections) {
			if (id !== excludeId) {
				conn.ws.send(message);
			}
		}
	}

	// Get connection count
	get size(): number {
		return this.connections.size;
	}
}

export const wsManager = new WebSocketManager();
