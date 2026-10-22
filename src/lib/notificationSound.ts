"use client";

let audioContext: AudioContext | null = null;
let unlockListenersInstalled = false;

/** Unlock audio directly from a user gesture (for example, an enable button). */
export async function unlockNotificationSound(): Promise<boolean> {
  if (typeof window === "undefined" || !window.AudioContext) return false;
  try {
    audioContext ??= new window.AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    return audioContext.state === "running";
  } catch {
    return false;
  }
}

/** Enable sound after the first user gesture, as required by browser autoplay policies. */
export function enableNotificationSound() {
  if (typeof window === "undefined" || unlockListenersInstalled) return;

  const unlock = () => {
    void unlockNotificationSound();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    unlockListenersInstalled = false;
  };

  unlockListenersInstalled = true;
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/** Play a short chime for a newly received live notification. */
export function playNotificationSound() {
  if (!audioContext || audioContext.state !== "running") return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(1174.66, now + 0.1);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.3);
}
