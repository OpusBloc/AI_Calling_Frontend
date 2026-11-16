// "use client";

// import Link from "next/link";

// export function AuthCard({
//   title,
//   subtitle,
//   children,
//   footer,
// }: {
//   title: string;
//   subtitle: string;
//   children: React.ReactNode;
//   footer: { text: string; linkLabel: string; href: string };
// }) {
//   return (
// <main
//   className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface p-4 sm:p-8"
// >

//       {/* Card with white frame */}
//       <div className="relative grid w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-[36px] bg-surface p-2.5 shadow-2xl lg:min-h-[560px] lg:grid-cols-[1.1fr_0.9fr]">
//         {/* Image panel, slanted right edge on desktop */}
//         <section
//           aria-hidden="true"
//           className="h-48 rounded-[28px] bg-cover bg-center lg:h-auto"
//           style={{
//             backgroundImage: "url('/images/login.png')",
//             clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)",
//           }}
//         />

//         {/* Form side */}
//         <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:-ml-6 lg:px-10">
//           <div className="w-full max-w-xs">
//             <header className="mb-10 flex items-center justify-between">
//               <span className="text-sm font-semibold">Opus Bloc</span>
//               <span className="text-sm text-neutral-500">Admin</span>
//             </header>

//             <div className="text-center">
//               <h1 className="text-2xl font-semibold">{title}</h1>
//               <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
//             </div>

//             <div className="mt-6">{children}</div>

//             <p className="mt-5 text-center text-sm">
//               {footer.text}{" "}
//               <Link href={footer.href} className="font-semibold underline">
//                 {footer.linkLabel}
//               </Link>
//             </p>
//             <p className="mt-5 text-center text-xs text-neutral-500">
//               Only approved admin Google accounts can sign in.
//             </p>
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }


"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Seconds before the form starts rising in (after the logo intro finishes)
const BASE = 2.0;

/* Logo shapes. The gradient and mask live once in a hidden SVG (see below). */
function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--auth-page-bg)] p-4 sm:p-8">
      <style>{`
        /* 1. Small logo appears, holds, then enlarges and fades */
        @keyframes ob-intro {
          0%   { opacity: 0; transform: scale(.3) rotate(-120deg); }
          25%  { opacity: 1; transform: scale(1) rotate(0deg); }
          55%  { opacity: 1; transform: scale(1.08) rotate(0deg); }
          100% { opacity: 0; transform: scale(9) rotate(90deg); }
        }
        /* 2. Gold/black art expands outward from the logo */
        @keyframes ob-reveal {
          from { clip-path: circle(0% at 50% 50%); }
          to   { clip-path: circle(150% at 50% 50%); }
        }
        /* 3. Form content rises in */
        @keyframes ob-rise  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes ob-pop   { from { opacity: 0; transform: scale(.3) rotate(-120deg); } to { opacity: 1; transform: none; } }

        /* Ambient loops */
        @keyframes ob-float  { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        @keyframes ob-float2 { 0%,100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-22px) rotate(8deg); } }
        @keyframes ob-drift  { 0%,100% { transform: translate(0,0); } 50% { transform: translate(24px,-18px); } }
        @keyframes ob-drift-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.15); } }
        @keyframes ob-drift-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-35px,25px) scale(.9); } }
        @keyframes ob-spin   { to { transform: rotate(360deg); } }
        @keyframes ob-pulse  { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(1.9); opacity: 0; } }

        .ob-intro   { animation: ob-intro 2.4s cubic-bezier(.6,0,.3,1) both; }
        .ob-reveal  { animation: ob-reveal 1.1s cubic-bezier(.7,0,.3,1) 1.3s both; }
        .ob-rise    { animation: ob-rise .8s ease-out both; }
        .ob-pop     { animation: ob-pop 1.3s cubic-bezier(.2,.9,.3,1.1) 1.5s both; }
        .ob-float   { animation: ob-float 6s ease-in-out 2.8s infinite; }
        .ob-float2  { animation: ob-float2 6s ease-in-out infinite; }
        .ob-float2r { animation: ob-float2 7.5s ease-in-out infinite reverse; }
        .ob-drift   { animation: ob-drift 9s ease-in-out infinite; }
        .ob-drift-a { animation: ob-drift-a 9s ease-in-out infinite; }
        .ob-drift-b { animation: ob-drift-b 11s ease-in-out infinite; }
        .ob-ring    { transform-origin: 300px 290px; animation: ob-spin 60s linear infinite; }
        .ob-spin    { animation: ob-spin 14s linear infinite; }
        .ob-spin-slow { animation: ob-spin 40s linear infinite; }
        .ob-pulse   { animation: ob-pulse 2.4s ease-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .ob-intro, .ob-reveal, .ob-rise, .ob-pop, .ob-float, .ob-float2, .ob-float2r,
          .ob-drift, .ob-drift-a, .ob-drift-b, .ob-ring, .ob-spin, .ob-spin-slow, .ob-pulse { animation: none; }
          .ob-intro-wrap { display: none; }
        }
      `}</style>

      {/* Shared gold gradient (with a slow shine) and the logo's diagonal cuts */}
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

      <div className="relative w-full max-w-[1000px] overflow-hidden rounded-[32px] border border-[var(--auth-card-border)] bg-[var(--auth-surface)] shadow-[var(--auth-shadow)] lg:min-h-[580px]">
        {/* ============ Intro: small gold logo in the centre that enlarges ============ */}
        <div className="ob-intro-wrap pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <LogoMark className="ob-intro h-20 w-20 drop-shadow-lg" />
        </div>

        {/* ============ Art (desktop only), revealed from the logo ============ */}
        <div className="ob-reveal pointer-events-none absolute inset-0 hidden lg:block">
          {/* Gold edge: 60% of the card, with a rounded curve on its right side */}
          <div
            className="absolute inset-y-0 left-0 right-[40%] bg-[var(--auth-panel-edge)]"
            style={{ borderRadius: "0 120px 120px 0" }}
          />
          {/* Black panel, same curve, 8px narrower so the gold shows as an edge */}
          <div
            className="absolute inset-y-0 left-0 right-[calc(40%+8px)] overflow-hidden bg-[var(--auth-panel-bg)]"
            style={{ borderRadius: "0 120px 120px 0" }}
          >
            <svg
              aria-hidden
              viewBox="0 0 600 580"
              preserveAspectRatio="xMinYMid slice"
              className="absolute inset-0 h-full w-full"
            >
              <rect
                className="ob-ring"
                x="60"
                y="50"
                width="480"
                height="480"
                fill="none"
                stroke="var(--auth-panel-ring)"
                strokeWidth="2"
                strokeDasharray="4 12"
              />
              {/* stacked gold squares, bottom left */}
              <g className="ob-drift">
                <rect x="-20" y="220" width="380" height="380" fill="var(--auth-gold)" />
                <rect x="-20" y="280" width="320" height="320" fill="var(--auth-panel-edge)" />
                <rect x="-20" y="340" width="260" height="260" fill="var(--auth-gold-light)" />
              </g>
            </svg>

            {/* Brand text, centred at the top */}
            <div className="absolute inset-x-0 top-8 text-center">
              <p className="text-xl font-medium text-[var(--auth-on-art)]">Opus Bloc</p>
              <p className="mt-1 text-sm text-[var(--auth-panel-edge)]">Admin console</p>
            </div>

            {/* Drifting glow orbs */}
            <span
              aria-hidden
              className="ob-drift-a absolute left-[56%] top-[28%] h-44 w-44 rounded-full bg-[var(--auth-orb)]/10 blur-3xl"
            />
            <span
              aria-hidden
              className="ob-drift-b absolute left-[2%] top-[4%] h-40 w-40 rounded-full bg-[var(--auth-orb)]/10 blur-3xl"
            />

            {/* Big slow-spinning logo, faint */}
            <LogoMark className="ob-spin-slow absolute left-[52%] top-[66%] h-32 w-32 opacity-20" />

            {/* Small floating logos */}
            <LogoMark className="ob-float2 absolute left-[76%] top-[38%] h-10 w-10 opacity-40" />
            <LogoMark className="ob-float2r absolute left-[8%] top-[14%] h-8 w-8 opacity-30" />

            {/* Big logo in the centre: gold frame only, no white, no text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="ob-pop h-[340px] w-[340px]">
                <div className="ob-float relative h-full w-full">
                  <svg
                    aria-hidden
                    viewBox="0 0 200 200"
                    className="absolute inset-0 h-full w-full drop-shadow-[var(--auth-logo-shadow)]"
                  >
                    <path
                      mask="url(#ob-slit)"
                      fill="url(#ob-gold)"
                      fillRule="evenodd"
                      d="M10 10 H190 V190 H10 Z M58 58 V142 H142 V58 Z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ Form ============ */}
        <section className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:ml-auto lg:min-h-[580px] lg:w-[40%] lg:px-8">
          <div className="w-full max-w-[300px] text-center">
            {/* Round logo avatar with pulsing ring */}
            <div
              className="ob-rise relative mx-auto h-16 w-16"
              style={{ animationDelay: `${BASE}s` }}
            >
              <span
                aria-hidden
                className="ob-pulse absolute inset-0 bg-[var(--auth-panel-edge)]/40"
              />
              <div className="relative flex h-16 w-16 items-center justify-center border-2 border-[var(--auth-panel-edge)] bg-[var(--auth-panel-bg)]">
                <LogoMark className="ob-spin h-8 w-8" />
              </div>
            </div>

            <h1
              className="ob-rise mt-4 text-2xl font-bold tracking-tight text-[var(--auth-panel-text)]"
              style={{ animationDelay: `${BASE + 0.15}s` }}
            >
              {title}
            </h1>
            <p
              className="ob-rise mt-2 text-sm leading-relaxed text-[var(--auth-body-text)]"
              style={{ animationDelay: `${BASE + 0.25}s` }}
            >
              {subtitle}
            </p>

            <div className="ob-rise mt-6" style={{ animationDelay: `${BASE + 0.4}s` }}>
              {children}
            </div>

            <p
              className="ob-rise mt-4 text-sm text-[var(--auth-body-text)]"
              style={{ animationDelay: `${BASE + 0.55}s` }}
            >
              {footer.text}{" "}
              <Link
                href={footer.href}
                className="font-semibold text-[var(--auth-link)] underline-offset-4 hover:underline"
              >
                {footer.linkLabel}
              </Link>
            </p>

            <p
              className="ob-rise mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--auth-muted-text)]"
              style={{ animationDelay: `${BASE + 0.7}s` }}
            >
              <ShieldCheck size={14} aria-hidden />
              Only approved admin Google accounts can sign in.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
