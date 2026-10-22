"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiX, FiSmartphone, FiSend, FiCheck } from "react-icons/fi";
import { api } from "@/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/hooks/useTransactionNotification";
import { apiErrorMessage } from "@/lib/apiError";

// Normalize any Indian number to the "+91XXXXXXXXXX" shape the backend expects.
// Mirrors the user-frontend profile page.
const normalizeIndianPhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "+91";

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d+]/g, "");
    if (digits.startsWith("+91")) {
      const localDigits = digits.slice(3).replace(/\D/g, "").slice(0, 10);
      return `+91${localDigits}`;
    }
    return digits;
  }

  const digits = trimmed.replace(/\D/g, "");
  const localDigits = digits.startsWith("91") ? digits.slice(2) : digits;
  return `+91${localDigits.slice(0, 10)}`;
};

// Telegram usernames: 5-32 chars, letters/digits/underscore, no leading @.
const cleanTelegramUsername = (value: string): string =>
  value.trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "");

const isValidTelegramUsername = (value: string): boolean =>
  /^[A-Za-z0-9_]{5,32}$/.test(value);

type Stage = "phone" | "telegram";

export default function VerifyMobileModal({
  open,
  onClose,
  initialPhone,
  phoneVerified,
  telegramAdded,
  onVerified,
  onTelegramSaved,
  telegramOnly = false,
  phoneOnly = false,
  initialTelegramUsername = null,
}: {
  open: boolean;
  onClose: () => void;
  initialPhone?: string | null;
  // Which onboarding steps are still outstanding for this support user.
  phoneVerified: boolean;
  telegramAdded: boolean;
  onVerified: (phoneNumber: string) => void;
  onTelegramSaved: (telegramUsername: string) => void;
  /**
   * Opens straight on the Telegram step and shows only that step, even when a
   * username is already saved — used by the sidebar's "Telegram username" entry
   * to CHANGE an existing handle rather than onboard a new one.
   */
  telegramOnly?: boolean;
  /**
   * Opens straight on the mobile step and shows only that step, even when the
   * number is already verified — used by the sidebar's "Mobile number" entry
   * so a SUPPORT agent can CHANGE their own number after verifying it.
   */
  phoneOnly?: boolean;
  /** Current handle, pre-filled when updating. */
  initialTelegramUsername?: string | null;
}) {
  const [phoneNumberInput, setPhoneNumberInput] = useState("+91");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [telegramInput, setTelegramInput] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);

  const [stage, setStage] = useState<Stage>("phone");

  // Which steps are outstanding — drives the "Step X of N" indicator.
  // In telegramOnly mode the phone step is skipped entirely.
  const needPhone = phoneOnly || (!telegramOnly && !phoneVerified);
  const needTelegram = !phoneOnly && (telegramOnly || !telegramAdded);
  // Re-running the flow on an already-verified account changes the number.
  const updatingPhone = phoneOnly && phoneVerified;
  const totalSteps = (needPhone ? 1 : 0) + (needTelegram ? 1 : 0);
  const stepNumber = useMemo(() => {
    if (stage === "phone") return 1;
    return needPhone ? 2 : 1;
  }, [stage, needPhone]);

  // Reset the form each time the modal is opened, pre-filling any known number
  // and starting at the first outstanding step.
  useEffect(() => {
    if (!open) return;
    setPhoneNumberInput(
      initialPhone ? normalizeIndianPhoneNumber(initialPhone) : "+91",
    );
    setOtp(["", "", "", "", "", ""]);
    setOtpSent(false);
    setResendCountdown(0);
    setTelegramInput(initialTelegramUsername ?? "");
    setStage(needPhone ? "phone" : "telegram");
  }, [open, initialPhone, needPhone, initialTelegramUsername]);

  /* Escape closes and the page behind is locked from scrolling — this dialog
     had neither, so the page scrolled under the overlay. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  // Resend countdown tick.
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleSend = async () => {
    const normalized = normalizeIndianPhoneNumber(phoneNumberInput);
    if (normalized === "+91" || normalized.length < 13) {
      showErrorNotification("Enter a valid phone number.");
      return;
    }
    try {
      setSending(true);
      await api.post(
        "/auth/send-otp",
        {
          identifier: normalized,
          purpose: "PHONE_VERIFICATION",
        },
        // Sending the SMS OTP can be slow; override the 30s default timeout.
        { timeout: 60000 },
      );
      setPhoneNumberInput(normalized);
      setOtpSent(true);
      setResendCountdown(30);
      showSuccessNotification("OTP sent to your phone.");
    } catch (error: unknown) {
      showErrorNotification(
        apiErrorMessage(error, "Failed to send verification OTP."),
      );
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const normalized = normalizeIndianPhoneNumber(phoneNumberInput);
    const code = otp.join("");
    if (code.length !== 6) {
      showErrorNotification("Enter the 6-digit code.");
      return;
    }
    try {
      setVerifying(true);
      await api.post(
        "/auth/verify-phone",
        {
          identifier: normalized,
          otp: code,
          purpose: "PHONE_VERIFICATION",
        },
        // OTP verification can be slow (SMS provider round-trip); override the
        // api instance's default 30s timeout so it doesn't abort prematurely.
        { timeout: 60000 },
      );
      showSuccessNotification(
        updatingPhone
          ? "Mobile number updated successfully."
          : "Phone number verified successfully.",
      );
      onVerified(normalized);
      // Continue to the Telegram step if it's still outstanding; otherwise done.
      if (needTelegram) {
        setStage("telegram");
      } else {
        onClose();
      }
    } catch (error: unknown) {
      showErrorNotification(
        apiErrorMessage(error, "Failed to verify phone number."),
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveTelegram = async () => {
    const cleaned = cleanTelegramUsername(telegramInput);
    if (!isValidTelegramUsername(cleaned)) {
      showErrorNotification(
        "Enter a valid Telegram username (5-32 letters, digits or underscores).",
      );
      return;
    }
    try {
      setSavingTelegram(true);
      // POST is the signup route; PATCH is the documented "change it later"
      // one. Both hit the same service, but keep the semantics honest.
      const isUpdate = telegramOnly && telegramAdded;
      await api.request({
        url: "/auth/support/telegram-username",
        method: isUpdate ? "patch" : "post",
        data: { telegramUsername: cleaned },
        timeout: 60000,
      });
      showSuccessNotification(
        isUpdate
          ? "Telegram username updated successfully."
          : "Telegram username saved successfully.",
      );
      onTelegramSaved(cleaned);
      onClose();
    } catch (error: unknown) {
      showErrorNotification(
        apiErrorMessage(error, "Failed to save Telegram username."),
      );
    } finally {
      setSavingTelegram(false);
    }
  };

  // 6-box OTP entry: per-digit state avoids gap-collapsing, auto-advances.
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < paste.length; i++) next[i] = paste[i];
    setOtp(next);
    otpRefs.current[Math.min(paste.length, 6) - 1]?.focus();
  };

  if (!open) return null;

  const onTelegram = stage === "telegram";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-lg bg-surface border border-hairline shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-accent">
              {onTelegram ? <FiSend /> : <FiSmartphone />}
            </span>
            <div>
              <h3 className="text-lg font-bold text-heading leading-tight">
                {onTelegram
                  ? "Add Telegram Username"
                  : updatingPhone
                    ? "Update Mobile Number"
                    : "Verify Mobile Number"}
              </h3>
              {totalSteps > 1 && (
                <p className="text-xs text-muted">
                  Step {stepNumber} of {totalSteps}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-body hover:bg-surface-hover transition"
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        {/* Step indicator (only when both steps are required) */}
        {totalSteps > 1 && (
          <div className="flex items-center gap-2 px-6 pt-4">
            <StepDot
              label="Mobile"
              index={1}
              active={!onTelegram}
              done={phoneVerified || onTelegram}
            />
            <span className="h-px flex-1 bg-surface-hover" />
            <StepDot
              label="Telegram"
              index={2}
              active={onTelegram}
              done={telegramAdded}
            />
          </div>
        )}

        {/* ---------------- STEP: PHONE ---------------- */}
        {!onTelegram && (
          <div className="p-6 space-y-5">
            <p className="text-sm text-body">
              {updatingPhone
                ? "Enter a different mobile number and confirm the OTP. Your account switches to the new number once it is verified."
                : "Your account needs a verified mobile number. Enter your number and confirm the OTP to continue."}
            </p>

            {/* Phone input */}
            <div>
              <label className="block text-sm font-semibold text-body mb-1.5">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phoneNumberInput}
                onChange={(e) => {
                  setPhoneNumberInput(
                    normalizeIndianPhoneNumber(e.target.value),
                  );
                  setOtp(["", "", "", "", "", ""]);
                  setOtpSent(false);
                  setResendCountdown(0);
                }}
                disabled={sending || verifying}
                placeholder="+91XXXXXXXXXX"
                className="w-full px-3 py-2.5 rounded-md border border-hairline bg-surface text-heading focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="gold-gradient w-full rounded-md py-3 font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send Code"}
              </button>
            ) : (
              <>
                {/* OTP boxes */}
                <div>
                  <label className="block text-sm font-semibold text-body mb-2">
                    Enter the 6-digit code sent to {phoneNumberInput}
                  </label>
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={verifying}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        className="w-11 h-12 text-center text-lg font-bold rounded-md border border-hairline bg-surface text-heading focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend */}
                <div className="text-xs text-muted">
                  {resendCountdown > 0 ? (
                    <span>
                      Resend code in 00:
                      {String(resendCountdown).padStart(2, "0")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending}
                      className="font-semibold text-accent hover:underline disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Resend code"}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying || otp.join("").length !== 6}
                  className="gold-gradient w-full rounded-md py-3 font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying
                    ? "Verifying…"
                    : needTelegram
                      ? "Verify & Continue"
                      : updatingPhone
                        ? "Verify & Update"
                        : "Verify"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ---------------- STEP: TELEGRAM ---------------- */}
        {onTelegram && (
          <div className="p-6 space-y-5">
            <p className="text-sm text-body">
              Add your Telegram username so we can add you to the support group
              and tag you on user activity.
            </p>

            <div>
              <label className="block text-sm font-semibold text-body mb-1.5">
                Telegram Username
              </label>
              <div className="flex items-center rounded-md border border-hairline bg-surface focus-within:ring-2 focus-within:ring-accent overflow-hidden">
                <span className="pl-3 pr-1 text-muted select-none">@</span>
                <input
                  type="text"
                  value={telegramInput}
                  onChange={(e) =>
                    setTelegramInput(cleanTelegramUsername(e.target.value))
                  }
                  disabled={savingTelegram}
                  placeholder="your_username"
                  className="flex-1 py-2.5 pr-3 bg-transparent text-heading focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                5-32 letters, digits or underscores. Don&apos;t include the @.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveTelegram}
              disabled={savingTelegram || !isValidTelegramUsername(telegramInput)}
              className="gold-gradient w-full rounded-md py-3 font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingTelegram ? "Saving…" : "Save & Finish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({
  label,
  index,
  active,
  done,
}: {
  label: string;
  index: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition ${
          done
            ? "bg-gain text-white"
            : active
              ? "bg-accent text-white"
              : "bg-surface-hover text-muted  "
        }`}
      >
        {done ? <FiCheck /> : index}
      </span>
      <span
        className={`text-xs font-semibold ${
          active
            ? "text-heading "
            : "text-muted "
        }`}
      >
        {label}
      </span>
    </div>
  );
}
