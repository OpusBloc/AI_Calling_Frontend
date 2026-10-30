import type { Metadata } from "next";
import { IBM_Plex_Mono, Syne } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import LayoutShell from "@/components/LayoutShell";

// Exposed as the CSS variables globals.css reads (--font-syne, --font-plex-mono)
const syne = Syne({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-syne", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Opus Bloc Admin",
  description: "Admin console",
};

// Apply the saved theme before first paint so dark mode doesn't flash light
const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
