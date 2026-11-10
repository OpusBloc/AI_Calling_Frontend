import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Syne } from "next/font/google";

import "./globals.css";
import "./sidebar.css";
import { Providers } from "./providers";
import LayoutShell from "@/components/LayoutShell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { SidebarProvider } from "@/context/SidebarContext";


// Exposed as the CSS variables globals.css reads (--font-syne, --font-plex-mono)
const syne = Syne({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-syne", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Opus Bloc Admin",
  description: "Admin console",
};

// Apply the saved theme before first paint so dark mode doesn't flash light
const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
const sidebarScript = `try{document.documentElement.dataset.sidebar=localStorage.getItem("opus-sidebar")==="collapsed"?"collapsed":"expanded"}catch(e){document.documentElement.dataset.sidebar="expanded"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${plexMono.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
      </head>
      <body className="antialiased">
        <Providers>
          <SidebarProvider>
            <LayoutShell sidebar={<Sidebar />} topbar={<Topbar />}>
              {children}
            </LayoutShell>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
