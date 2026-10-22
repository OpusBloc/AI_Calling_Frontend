/**
 * WhatsApp human support — types for the backend's `admin/whatsapp-support/*`
 * and `support/whatsapp/*` routes (fractionalization-Backend
 * src/whatsapp-support). Responses are not wrapped; errors arrive as
 * `{ success: false, message }`.
 */
import type { Tone } from "@/components/ui";

export type ConversationMode = "AI" | "HUMAN";
export type ConversationStatus = "OPEN" | "WAITING_FOR_AGENT" | "OFFERED" | "ASSIGNED" | "CLOSED";
export type SummaryStatus = "NONE" | "PENDING" | "READY" | "FAILED";
export type AgentAvailability = "AVAILABLE" | "UNAVAILABLE" | "ON_LEAVE";
export type SenderType = "customer" | "ai" | "human_agent" | "system";

export type AgentRef = { id: string; userId: string; name: string | null };

export type ConversationRow = {
  id: string;
  waId: string;
  profileName: string | null;
  userId: string | null;
  mode: ConversationMode;
  status: ConversationStatus;
  assignedAgent: AgentRef | null;
  assignedAt: string | null;
  offeredAgent: AgentRef | null;
  offeredAt: string | null;
  offerExpiresAt: string | null;
  handoverReason: string | null;
  handoverRequestedAt: string | null;
  noAgentNoticeAt: string | null;
  resolvedAt: string | null;
  summary: string | null;
  summaryStatus: SummaryStatus;
  lastMessageAt: string | null;
  lastCustomerMessageAt: string | null;
  lastAgentMessageAt: string | null;
  /** Null unless mode is HUMAN. */
  answered: boolean | null;
  /** WhatsApp's 24 h window: free text only while open, a template after. */
  serviceWindow: { open: boolean; expiresAt: string | null };
  lastCustomerMessage: { id: string; content: string | null; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageView = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: SenderType;
  author: "CUSTOMER" | "AI" | "AGENT" | "SYSTEM";
  senderUserId: string | null;
  messageType: "TEXT" | "BUTTON" | "MEDIA" | "UNSUPPORTED";
  content: string | null;
  metadata: Record<string, unknown> | null;
  deliveryStatus: string | null;
  processingStatus: string;
  errorMessage: string | null;
  createdAt: string;
};

export type AssignmentRow = {
  id: string;
  agentId: string | null;
  agentUserId: string | null;
  agentName: string | null;
  assignedVia: "ROUND_ROBIN" | "MANUAL" | "CLAIMED";
  assignedAt: string;
  releasedAt: string | null;
  endReason: "RESOLVED" | "RELEASED_TO_AI" | "REASSIGNED" | null;
  reassignmentReason: string | null;
};

export type SummaryBlock = {
  status: SummaryStatus;
  text: string | null;
  details: {
    handoverReason: string | null;
    questionsAsked: string[];
    answersGiven: string[];
    outstanding: string[];
    actionsTaken: string[];
  } | null;
  updatedAt: string | null;
};

export type InboxConversationDetail = {
  conversation: ConversationRow;
  summary: SummaryBlock;
  handover: { reason: string | null; requestedAt: string | null };
  messages: MessageView[];
  assignments: AssignmentRow[];
  permissions: {
    canReply: boolean;
    canRelease: boolean;
    canAssign: boolean;
    canAccept: boolean;
    canReject: boolean;
    canClaim: boolean;
  };
};

export type AgentView = {
  /** WhatsappSupportAgent.id — what `conversations/:id/assign` takes. */
  id: string;
  /** users.id — what `agents/:userId/availability` takes. */
  userId: string;
  name: string;
  email: string | null;
  role: string;
  availability: AgentAvailability;
  availabilityChangedAt: string | null;
  maxConcurrentChats: number;
  accountStatus: string;
  supportStatus: "AVAILABLE" | "DISABLED" | null;
  eligible: boolean;
  ineligibleReason: string | null;
  activeConversations: number;
  pendingOffers: number;
  resolvedConversations: number;
  totalAssignments: number;
  lastAssignedAt: string | null;
};

export type Overview = {
  totalAgents: number;
  eligibleAgents: number;
  availableAgents: number;
  waitingConversations: number;
  offeredConversations: number;
  assignedConversations: number;
  resolvedConversations: number;
};

export type MeResponse = {
  isAgent: boolean;
  isAdmin: boolean;
  agent: AgentView | null;
  pendingOffers: number;
};

export type Paged<T> = { page: number; limit: number; total: number; data: T[] };

export type Schedule = {
  enabled: boolean;
  timezone: string;
  /** Capitalised names, Sunday first. */
  days: string[];
  /** 0 = Sunday … 6 = Saturday. */
  dayNumbers: number[];
  opensAt: string;
  closesAt: string;
  hoursText: string;
  holidays: { date: string; label: string | null; dayName: string }[];
  updatedAt: string | null;
  openNow: boolean;
  nextOpenAt: string | null;
  nextOpenText: string | null;
  holidayToday: { date: string; label: string | null } | null;
};

export const ADMIN_BASE = "/admin/whatsapp-support";
export const INBOX_BASE = "/support/whatsapp";

/**
 * Socket `notification:new` types for human support:
 * - ASSIGNED — a chat was offered to me (sent to that agent only)
 * - MESSAGE  — a customer wrote in a chat I hold / am offered (`entityId` = chat)
 * - WAITING  — a customer is queued with nobody to take them (ADMIN role only)
 */
export const SUPPORT_EVENTS = {
  ASSIGNED: "WHATSAPP_SUPPORT_ASSIGNED",
  MESSAGE: "WHATSAPP_SUPPORT_MESSAGE",
  WAITING: "WHATSAPP_SUPPORT_WAITING",
} as const;
export const SUPPORT_EVENT_TYPES = Object.values(SUPPORT_EVENTS);

/**
 * Refetch intervals. Live updates come from the socket; the backend emits
 * nothing for offer time-outs, accept / resolve / hand-back, other agents'
 * replies or bot replies, so a slow safety refetch still runs while connected.
 * While the socket is down, the faster interval takes over.
 */
export const SAFETY_POLL_MS = 60_000;
export const POLL_MS = 15_000;

/** Interval to use given the socket state. */
export const pollInterval = (connected: boolean, offline = POLL_MS) =>
  connected ? SAFETY_POLL_MS : offline;

/** Short badge text. */
export const STATUS_LABEL: Record<ConversationStatus, string> = {
  OPEN: "Bot replying",
  WAITING_FOR_AGENT: "Waiting for agent",
  OFFERED: "Offered to agent",
  ASSIGNED: "With agent",
  CLOSED: "Resolved",
};

/** One-line explanation (badge tooltip, chat header). */
export const STATUS_HINT: Record<ConversationStatus, string> = {
  OPEN: "The bot is answering this customer.",
  WAITING_FOR_AGENT: "The customer asked for a person and nobody has picked it up yet.",
  OFFERED: "Offered to an agent, who has about 2 minutes to accept.",
  ASSIGNED: "A support agent is handling this chat.",
  CLOSED: "Finished. If the customer writes again, the bot answers.",
};

export const STATUS_TONE: Record<ConversationStatus, Tone> = {
  OPEN: "neutral",
  WAITING_FOR_AGENT: "warn",
  OFFERED: "info",
  ASSIGNED: "accent",
  CLOSED: "gain",
};

export const AVAILABILITY_LABEL: Record<AgentAvailability, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "On a break",
  ON_LEAVE: "On leave",
};

export const AVAILABILITY_HINT: Record<AgentAvailability, string> = {
  AVAILABLE: "New chats can be sent to you.",
  UNAVAILABLE: "No new chats. Your open chats move to other agents.",
  ON_LEAVE: "No new chats. Your open chats move to other agents.",
};

export const AVAILABILITY_TONE: Record<AgentAvailability, Tone> = {
  AVAILABLE: "gain",
  UNAVAILABLE: "warn",
  ON_LEAVE: "neutral",
};

/** Why an agent isn't getting new chats. */
export const INELIGIBLE_LABEL: Record<string, string> = {
  deleted: "Removed from support",
  account_unavailable: "Account blocked or inactive",
  role: "Not a support user",
  support_disabled: "Turned off in Assign Support",
  on_leave: "On leave",
  unavailable: "On a break",
  at_capacity: "Has the maximum number of chats",
};

export const DELIVERY_LABEL: Record<string, string> = {
  queued: "Sending",
  accepted: "Sending",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
  undelivered: "Not delivered",
};

/** WhatsApp ids are E.164 digits; show them as a phone number. */
export const formatPhone = (waId: string) => (/^\d{8,15}$/.test(waId) ? `+${waId}` : waId);

export const customerName = (c: Pick<ConversationRow, "profileName" | "waId">) =>
  c.profileName?.trim() || formatPhone(c.waId);

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "Today", "Yesterday" or "Tue, 21 Oct". */
export function dayLabel(value: string): string {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** "Today, 3:20 pm", "Yesterday, 9:05 am", "Tue, 21 Oct, 3:20 pm". */
export function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${dayLabel(value)}, ${formatTime(value)}`;
}

/** "10:00" → "10:00 am". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** "5m ago", "3h ago", "2d ago". */
export function timeAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return "—";
  const ms = now - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Pulls `data` out of a paged envelope, tolerating a bare array. */
export function pagedRows<T>(body: unknown): { rows: T[]; total: number } {
  if (Array.isArray(body)) return { rows: body as T[], total: body.length };
  const b = body as { data?: T[]; total?: number } | null;
  const rows = Array.isArray(b?.data) ? b.data : [];
  return { rows, total: Number(b?.total) || rows.length };
}
