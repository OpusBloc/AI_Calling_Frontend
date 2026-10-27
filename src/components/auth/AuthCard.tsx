"use client";

import Link from "next/link";

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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-lg border border-hairline bg-surface p-8 shadow-md">
        <h1 className="text-2xl font-semibold text-heading">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>

        <div className="mt-8">{children}</div>

        <p className="mt-6 text-center text-sm text-muted">
          {footer.text}{" "}
          <Link href={footer.href} className="font-medium text-accent-text hover:underline">
            {footer.linkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
