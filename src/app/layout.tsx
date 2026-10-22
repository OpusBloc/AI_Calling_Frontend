import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono, Cormorant_Garamond } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

import LayoutShell from "@/components/LayoutShell";

/* Opus Bloc brand faces.
   Manrope  — all UI, body and labels.
   Plex Mono — every figure: money, %, token counts, wallet addresses, IDs.
   Cormorant — display serif, reserved for page titles. */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Opus Bloc — Admin",
  description: "Administration console for the Opus Bloc fractionalization platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${plexMono.variable} ${cormorant.variable}`}
    >
      <body className="antialiased">
        <Providers>
          <LayoutShell>{children}</LayoutShell>

          <Toaster
            position="top-right"
            // Above every overlay: SlideOver drawers are z-9999 and dropdown
            // panels 10050, so at the library's default (9999) an error raised
            // from inside a drawer rendered underneath it and never showed.
            containerStyle={{ top: 72, zIndex: 10100 }}
            toastOptions={{
              duration: 3000,
              style: {
                background: "transparent",
                boxShadow: "none",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
