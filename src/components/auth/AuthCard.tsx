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
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Dimmed background image (not full brightness) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/login.png')",
          filter: "blur(6px) brightness(0.3)",
          transform: "scale(1.1)",
        }}
      />

      {/* Card with white frame */}
      <div className="relative grid w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-[36px] bg-white p-2.5 shadow-2xl lg:min-h-[560px] lg:grid-cols-[1.1fr_0.9fr]">
        {/* Image panel, slanted right edge on desktop */}
        <section
          aria-hidden="true"
          className="h-48 rounded-[28px] bg-cover bg-center lg:h-auto"
          style={{
            backgroundImage: "url('/images/login.png')",
            clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)",
          }}
        />

        {/* Form side */}
        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:-ml-6 lg:px-10">
          <div className="w-full max-w-xs">
            <header className="mb-10 flex items-center justify-between">
              <span className="text-sm font-semibold">Opus Bloc</span>
              <span className="text-sm text-neutral-500">Admin</span>
            </header>

            <div className="text-center">
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
            </div>

            <div className="mt-6">{children}</div>

            <p className="mt-5 text-center text-sm">
              {footer.text}{" "}
              <Link href={footer.href} className="font-semibold underline">
                {footer.linkLabel}
              </Link>
            </p>
            <p className="mt-5 text-center text-xs text-neutral-500">
              Only approved admin Google accounts can sign in.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}