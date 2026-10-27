"use client";

import Link from "next/link";
import { Bot, Megaphone, PhoneForwarded } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Bot, text: "Configure AI calling agents and their scripts" },
  { icon: Megaphone, text: "Plan and schedule outbound campaigns" },
  { icon: PhoneForwarded, text: "Hand live calls to your representatives" },
];

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
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#0d1126] p-12 text-[#f5f2e8] lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#d8c68d]/15 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d8c68d] text-sm font-bold text-black">
            OB
          </span>
          <span className="text-lg font-semibold tracking-tight">Opus Bloc</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d8c68d]">Admin console</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
            AI calling, run from one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-[#c7c5b4]">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d8c68d]/25 bg-[#d8c68d]/10 text-[#d8c68d]">
                  <Icon size={17} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#908e7c]">© {new Date().getFullYear()} Opus Bloc</p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-on-accent">
              OB
            </span>
            <span className="text-lg font-semibold tracking-tight text-heading">Opus Bloc</span>
          </div>

          <h1 className="text-[28px] font-semibold tracking-tight text-heading">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>

          <div className="mt-8 rounded-lg border border-hairline bg-surface p-6 shadow-sm">{children}</div>

          <p className="mt-6 text-center text-sm text-muted">
            {footer.text}{" "}
            <Link href={footer.href} className="font-semibold text-accent-text hover:underline">
              {footer.linkLabel}
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-faint">Only approved admin Google accounts can sign in.</p>
        </div>
      </main>
    </div>
  );
}
