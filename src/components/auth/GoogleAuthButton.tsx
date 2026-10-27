"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { setToken, setUser } from "@/lib/auth";

const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Failed to load Google sign-in")));
  });
}

/**
 * Renders Google's sign-in button and exchanges the Google ID token for the
 * backend's JWT via POST /api/auth/google/{signin|signup}.
 */
export default function GoogleAuthButton({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.");
      return;
    }

    const handleCredential = async ({ credential }: GoogleCredentialResponse) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/auth/google/${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: credential }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.detail ?? `Request failed (${res.status})`);
        }
        setUser(data.user);
        setToken(data.access_token);
        router.replace("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
      }
    };

    let cancelled = false;
    loadGsiScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: mode === "signup" ? "signup_with" : "signin_with",
          width: 320,
        });
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [mode, router]);

  return (
    <div className="space-y-3">
      <div ref={buttonRef} className="flex min-h-11 justify-center" />
      {loading && <p className="text-center text-sm text-muted">Signing you in…</p>}
      {error && (
        <p className="rounded-md border border-loss/30 bg-loss-bg px-3 py-2 text-sm text-loss">
          {error}
        </p>
      )}
    </div>
  );
}
