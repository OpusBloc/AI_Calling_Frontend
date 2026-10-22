"use client";

import { io, type Socket } from "socket.io-client";
import { API_CONFIG } from "@/constant";
import { getToken, onAuthChange } from "@/lib/auth";

/**
 * The main backend's Socket.IO gateway (notification.gateway.ts): namespace
 * `/`, JWT in `auth.token` (no "Bearer "), rooms `user:<id>` and — for role
 * ADMIN only — `admins`, joined server-side. One event, `notification:new`,
 * carrying a Notification row.
 */
export type NotificationEvent = {
  id: string;
  type: string;
  title: string;
  message: string;
  /** For WhatsApp support events: the conversation id. */
  entityId?: string;
  recipientUserId?: string;
  createdAt: string;
};

let socket: Socket | null = null;
let socketToken: string | null = null;
let authListenerBound = false;

/**
 * The gateway runs on the backend's HTTP server, so the socket lives under the
 * same base URL. A path prefix on that URL (e.g. `https://host/production`,
 * behind a reverse proxy) has to be carried into the Socket.IO path.
 */
function endpoint(): { url: string; path: string } {
  try {
    const u = new URL(API_CONFIG.BASE_URL);
    const prefix = u.pathname.replace(/\/+$/, "");
    return { url: u.origin, path: `${prefix}/socket.io` };
  } catch {
    return { url: API_CONFIG.BASE_URL, path: "/socket.io" };
  }
}

function disconnect() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

/**
 * Shared connection for the signed-in user, or null when signed out. Re-created
 * when the token changes (login / logout / switch user).
 */
export function getNotificationSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (!authListenerBound) {
    authListenerBound = true;
    onAuthChange(() => {
      if (getToken() !== socketToken) disconnect();
    });
  }

  const token = getToken();
  if (!token) {
    disconnect();
    return null;
  }
  if (socket && socketToken === token) return socket;

  disconnect();
  const { url, path } = endpoint();
  socketToken = token;
  // Default transports (long-polling, upgraded to WebSocket) so it still
  // works where a proxy doesn't pass WebSocket upgrades through.
  socket = io(url, { path, auth: { token }, reconnectionDelayMax: 10_000 });
  return socket;
}
