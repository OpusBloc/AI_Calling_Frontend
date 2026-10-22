"use client";

import { useEffect, useRef, useState } from "react";
import { getNotificationSocket, type NotificationEvent } from "@/lib/socket";

/**
 * Subscribes to the backend's `notification:new` socket events.
 *
 * `onEvent` gets every event whose `type` is in `types` (all events when
 * omitted). `onReconnect` runs when the connection comes back after a drop, so
 * callers can refetch whatever they missed. Returns whether the socket is
 * connected right now — use it to fall back to polling while it isn't.
 */
export function useNotificationSocket({
  types,
  onEvent,
  onReconnect,
}: {
  types?: readonly string[];
  onEvent: (event: NotificationEvent) => void;
  onReconnect?: () => void;
}): boolean {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  onEventRef.current = onEvent;
  onReconnectRef.current = onReconnect;
  const typesKey = types ? [...types].sort().join(",") : "";

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getNotificationSocket();
    if (!socket) return;

    const wanted = typesKey ? new Set(typesKey.split(",")) : null;
    // Only a connect that follows a drop is a "reconnect" — the first one
    // happens while the caller is doing its initial load anyway.
    let dropped = false;
    setConnected(socket.connected);

    const handleEvent = (event: NotificationEvent) => {
      if (!event || (wanted && !wanted.has(event.type))) return;
      onEventRef.current(event);
    };
    const handleConnect = () => {
      setConnected(true);
      if (!dropped) return;
      dropped = false;
      onReconnectRef.current?.();
    };
    const handleDisconnect = () => {
      setConnected(false);
      dropped = true;
    };

    socket.on("notification:new", handleEvent);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("notification:new", handleEvent);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [typesKey]);

  return connected;
}
