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

        <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
          {children}
        </form>

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

export function Field({
  label,
  type = "text",
  placeholder,
}: {
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-heading">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading outline-none placeholder:text-faint focus:border-accent"
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="h-11 w-full rounded-md bg-accent text-sm font-semibold text-on-accent transition hover:bg-accent-strong"
    >
      {children}
    </button>
  );
}
