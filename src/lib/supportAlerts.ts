"use client";

/**
 * Alerts for a new WhatsApp chat offered to the signed-in agent: a short
 * chime (Web Audio — no sound file) and a desktop notification while the
 * admin tab isn't in front. Preferences are per browser (localStorage).
 *
 * Both the socket listener (SupportOfferAlerts) and the inbox's own refresh
 * can spot the same offer, so each conversation alerts once.
 */

const PREFS_KEY = "wa-support-alerts";
const CHAT_TAB_URL = "/?tab=whatsapp-chats";

export type AlertPrefs = { sound: boolean };

const DEFAULT_PREFS: AlertPrefs = { sound: true };

export function getAlertPrefs(): AlertPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AlertPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setAlertPrefs(prefs: AlertPrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / blocked storage — the setting just won't persist */
  }
  window.dispatchEvent(new Event("wa-support-alert-prefs"));
}

// ── Sound ────────────────────────────────────────────────────────────────────

let audio: AudioContext | null = null;
let unlockBound = false;

/**
 * Browsers only allow sound after the user has interacted with the page, so
 * the audio context is created / resumed on the first click or key press.
 */
export function primeAlertSound() {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audio ??= new Ctx();
      if (audio.state === "suspended") void audio.resume();
    } catch {
      /* no audio available */
    }
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

/** Two-note chime, ~0.6 s. */
export function playAlertSound() {
  if (!audio || audio.state !== "running") return;
  const now = audio.currentTime;
  [
    { freq: 880, at: 0 },
    { freq: 1318.5, at: 0.16 },
  ].forEach(({ freq, at }) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.45);
    osc.connect(gain).connect(audio!.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.5);
  });
}

// ── Desktop notifications ────────────────────────────────────────────────────

export type NotificationState = "unsupported" | "default" | "granted" | "denied";

export function notificationState(): NotificationState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotificationState;
}

/** Must be called from a click. */
export async function requestNotificationPermission(): Promise<NotificationState> {
  if (notificationState() === "unsupported") return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotificationState;
  } catch {
    return notificationState();
  } finally {
    window.dispatchEvent(new Event("wa-support-alert-prefs"));
  }
}

function openChatsTab() {
  window.focus();
  if (window.location.pathname === "/") {
    // Same-page tab switch; HeroSection follows the URL (useSearchParams).
    window.history.pushState(null, "", CHAT_TAB_URL);
  } else {
    window.location.assign(CHAT_TAB_URL);
  }
}

// ── The alert ────────────────────────────────────────────────────────────────

/**
 * When each conversation last alerted. The socket and the inbox refresh can
 * both report one offer, so repeats inside an offer's lifetime (~2 min) are
 * ignored — but the same chat offered again later (declined by someone else,
 * or the customer asking again) alerts again.
 */
const alertedAt = new Map<string, number>();
const SAME_OFFER_MS = 150_000;

/** Chime + desktop notification for a chat offered to me. `key` is the conversation id. */
export function alertNewOffer(key: string, body = "A customer is waiting for you to accept their chat.") {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - (alertedAt.get(key) ?? 0) < SAME_OFFER_MS) return;
  alertedAt.set(key, now);

  if (getAlertPrefs().sound) playAlertSound();

  // In front of the agent already? The page's own banner is enough.
  const inFront = document.visibilityState === "visible" && document.hasFocus();
  if (inFront || notificationState() !== "granted") return;
  try {
    const n = new Notification("New WhatsApp chat — accept or decline", {
      body,
      tag: `wa-offer-${key}`,
    });
    n.onclick = () => {
      openChatsTab();
      n.close();
    };
    // Offers expire in about 2 minutes.
    window.setTimeout(() => n.close(), 2 * 60_000);
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}
