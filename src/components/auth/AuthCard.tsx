"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

function LogoMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={className} style={style}>
      <path
        mask="url(#ob-slit)"
        fill="url(#ob-gold)"
        fillRule="evenodd"
        d="M10 10 H190 V190 H10 Z M58 58 V142 H142 V58 Z"
      />
    </svg>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: { text: string; linkLabel: string; href: string };
}) {
  return (
    <main className="auth-layout flex h-dvh w-full items-center justify-center overflow-hidden bg-[var(--auth-page-bg)] p-4">
      <style>{`
        .auth-input {
          box-sizing: border-box;
          width: 100%;
          height: clamp(2rem, 5dvh, 2.65rem);
          border: 1px solid #c8c8c8;
          border-radius: 0.375rem;
          background: #fff !important;
          padding: 0 clamp(.65rem, 2vw, .8rem);
          color: #1a140b !important;
          font-size: clamp(.8125rem, 1.8dvh, .9rem);
          outline: none;
        }
        .auth-input:focus {
          border-color: var(--auth-gold);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--auth-gold) 22%, transparent);
        }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus,
        .auth-input:-webkit-autofill:active {
          -webkit-box-shadow: inset 0 0 0 1000px #fff !important;
          -webkit-text-fill-color: #1a140b !important;
          caret-color: #1a140b;
        }
        @media (max-height: 600px) {
          .auth-form-content { gap: .3rem !important; }
          .auth-fields { row-gap: .25rem !important; }
        }
      `}</style>

      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <linearGradient id="ob-gold" x1="0" y1="0" x2="1" y2="0" spreadMethod="reflect">
            <stop offset="0%" stopColor="var(--auth-gold)" />
            <stop offset="50%" stopColor="var(--auth-gold-light)" />
            <stop offset="100%" stopColor="var(--auth-gold)" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-0.5 0;0.5 0;-0.5 0"
              dur="6s"
              repeatCount="indefinite"
            />
          </linearGradient>
          <mask id="ob-slit">
            <rect width="200" height="200" fill="white" />
            <path d="M4 12 L56 64 M144 136 L196 188" stroke="black" strokeWidth="5" />
          </mask>
        </defs>
      </svg>

      <div
        className="relative w-full max-w-[1000px] overflow-hidden rounded-[32px] border border-[var(--auth-card-border)] bg-[var(--auth-surface)] shadow-[var(--auth-shadow)]"
        style={{ height: "min(calc(100dvh - 2rem), 720px)" }}
      >
        {/* Shared artwork: clipped to the art panel, with each layer kept independent. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-0 hidden w-[60%] overflow-hidden lg:block"
        >
          <div className="absolute inset-0 bg-[var(--auth-panel-bg)]" />

          {/* Faint dashed lines stay behind the blocks and central mark. */}
          <svg className="absolute inset-0 z-0 h-full w-full opacity-[0.18]" viewBox="0 0 600 720" preserveAspectRatio="none">
            <path d="M40 0V720M120 0V720M200 0V720M280 0V720M360 0V720M440 0V720M520 0V720M0 80H600M0 160H600M0 240H600M0 320H600M0 400H600M0 480H600M0 560H600M0 640H600" stroke="var(--auth-panel-ring)" strokeWidth="1" strokeDasharray="3 9" />
          </svg>

          {/* Background squares are clipped inside the central frame. */}
          <div
            className="absolute left-1/2 top-[55%] z-[1] aspect-square -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            style={{ width: "clamp(13rem, 32vw, 22rem)" }}
          >
            <span className="absolute bottom-[8%] left-[7%] h-[44%] w-[44%] bg-[var(--auth-panel-edge)] opacity-20" />
            <span className="absolute bottom-[8%] right-[7%] h-[32%] w-[32%] bg-[var(--auth-gold-light)] opacity-15" />
            <span className="absolute right-[7%] top-[8%] h-[28%] w-[28%] bg-[var(--auth-panel-ring)] opacity-35" />
          </div>

          {/* The only large mark: centered, gold, and above its background blocks. */}
          <LogoMark
            className="absolute left-1/2 top-[55%] z-[2] aspect-square -translate-x-1/2 -translate-y-1/2 drop-shadow-[var(--auth-logo-shadow)]"
            style={{ width: "clamp(13rem, 32vw, 22rem)" }}
          />

          <div className="absolute inset-x-8 top-7 z-10 text-center">
            <p className="text-xl font-medium text-[var(--auth-on-art)]">Opus Bloc</p>
            <p className="mt-1 text-sm text-[var(--auth-panel-edge)]">Admin console</p>
          </div>

          {/* Small squares stay in the two far upper corners. */}
          <span className="absolute left-6 top-6 z-[3] h-[clamp(1rem,3dvh,2rem)] w-[clamp(1rem,3dvh,2rem)] border border-[var(--auth-gold-light)]/40 bg-[var(--auth-gold-light)]/10" />
          <span className="absolute right-6 top-6 z-[3] h-[clamp(1rem,3dvh,2rem)] w-[clamp(1rem,3dvh,2rem)] border border-[var(--auth-panel-edge)]/50 bg-[var(--auth-panel-edge)]/15" />
        </div>

        <section className="relative z-10 ml-auto flex h-full w-full items-center justify-center px-6 py-3 sm:px-10 lg:w-[40%] lg:px-8">
          <div
            className="auth-form-content flex w-full max-w-[300px] flex-col items-stretch text-center"
            style={{ gap: "clamp(.35rem, 1.3dvh, .8rem)" }}
          >
            <div
              className="mx-auto flex shrink-0 items-center justify-center border-2 border-[var(--auth-panel-edge)] bg-[var(--auth-panel-bg)]"
              style={{ width: "clamp(2rem, 6dvh, 3.5rem)", height: "clamp(2rem, 6dvh, 3.5rem)" }}
            >
              <LogoMark className="h-1/2 w-1/2" />
            </div>

            <header className="shrink-0">
              <h1
                className="font-bold tracking-tight text-[var(--auth-panel-text)]"
                style={{ fontSize: "clamp(1.15rem, 3dvh, 1.5rem)", lineHeight: 1.2 }}
              >
                {title}
              </h1>
              <p className="mt-1 text-[clamp(.75rem,1.8dvh,.875rem)] leading-snug text-[var(--auth-body-text)]">
                {subtitle}
              </p>
            </header>

            <div
              className="flex w-full shrink-0 flex-col"
              style={{ gap: "clamp(.35rem, 1dvh, .65rem)" }}
            >
              {children}
            </div>

            <p className="shrink-0 text-[clamp(.75rem,1.8dvh,.875rem)] leading-tight text-[var(--auth-body-text)]">
              {footer.text}{" "}
              <Link
                href={footer.href}
                className="font-semibold text-[var(--auth-link)] underline-offset-4 hover:underline"
              >
                {footer.linkLabel}
              </Link>
            </p>

            <p className="flex shrink-0 items-center justify-center gap-1.5 text-[clamp(.65rem,1.5dvh,.75rem)] leading-tight text-[var(--auth-muted-text)]">
              <ShieldCheck size={14} aria-hidden />
              Only approved admin Google accounts can sign in.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
