"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { showErrorNotification, showSuccessNotification } from "@/hooks/useNotification";
import { setToken, setUser } from "@/lib/auth";
import { loginUser, signupUser } from "@/lib/authApi";

export default function EmailAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedName = fullName.trim();

    if (isSignup && normalizedName.length < 2) {
      showErrorNotification("Full name must be at least 2 characters.", { title: "Check your details" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showErrorNotification("Enter a valid email address.", { title: "Check your details" });
      return;
    }
    if (password.length < 8) {
      showErrorNotification("Password must be at least 8 characters.", { title: "Check your details" });
      return;
    }

    setLoading(true);
    try {
      const data = isSignup
        ? await signupUser({ email: normalizedEmail, password, full_name: normalizedName })
        : await loginUser({ email: normalizedEmail, password });

      if (isSignup) {
        showSuccessNotification("Your account was created. Please log in to continue.", {
          title: "Account created",
        });
        router.replace("/auth/login");
        return;
      }

      setUser(data.user);
      setToken(data.access_token);
      showSuccessNotification(`Signed in as ${data.user.email}.`, { title: "Welcome back" });
      router.replace("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      showErrorNotification(message, { title: isSignup ? "Sign-up failed" : "Sign-in failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: "clamp(.35rem, 1dvh, .65rem)" }}>
      <form
        onSubmit={handleSubmit}
        className="auth-fields grid text-left"
        style={{ rowGap: "clamp(.3rem, 1dvh, .65rem)" }}
      >
        {isSignup && (
          <label className="flex flex-col text-sm font-medium text-[var(--auth-panel-text)]" style={{ gap: "clamp(2px, .5dvh, 4px)" }}>
            <span>Full name</span>
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="auth-input"
            />
          </label>
        )}
        <label className="flex flex-col text-sm font-medium text-[var(--auth-panel-text)]" style={{ gap: "clamp(2px, .5dvh, 4px)" }}>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="auth-input"
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-[var(--auth-panel-text)]" style={{ gap: "clamp(2px, .5dvh, 4px)" }}>
          <span>Password</span>
          <span className="relative block">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--auth-muted-text)] hover:text-[var(--auth-panel-text)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--auth-gold)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          style={{ height: "clamp(2rem, 5dvh, 2.65rem)" }}
        >
          {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
        </button>
      </form>
      <div className="flex items-center gap-2 text-[clamp(.55rem,1.3dvh,.7rem)] text-[var(--auth-muted-text)]" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--auth-border)]" />
        <span>OR CONTINUE WITH GOOGLE</span>
        <span className="h-px flex-1 bg-[var(--auth-border)]" />
      </div>
    </div>
  );
}
