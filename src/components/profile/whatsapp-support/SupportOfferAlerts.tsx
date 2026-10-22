"use client";

import { useEffect } from "react";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { alertNewOffer, primeAlertSound } from "@/lib/supportAlerts";
import { SUPPORT_EVENTS } from "./types";

const OFFER_TYPES = [SUPPORT_EVENTS.ASSIGNED] as const;

/**
 * Mounted once in the admin shell for anyone who can be offered WhatsApp
 * chats. Plays the chime and shows a desktop notification when a chat is
 * offered to them — on whichever tab they're on. Renders nothing.
 */
export default function SupportOfferAlerts() {
  useEffect(() => {
    primeAlertSound();
  }, []);

  useNotificationSocket({
    types: OFFER_TYPES,
    onEvent: (event) => {
      if (!event.entityId) return;
      alertNewOffer(event.entityId, event.message || undefined);
    },
  });

  return null;
}
