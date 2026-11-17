import type { Metadata } from "next";
import "./globals.css";
import "./sidebar.css";
import { Providers } from "./providers";
import LayoutShell from "@/components/layout/LayoutShell";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { SidebarProvider } from "@/context/SidebarContext";


export const metadata: Metadata = {
  title: "Opus Bloc Admin",
  description: "Admin console",
};

// Apply the saved theme before first paint so dark mode doesn't flash light
const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
const sidebarScript = `try{document.documentElement.dataset.sidebar=localStorage.getItem("opus-sidebar")==="collapsed"?"collapsed":"expanded"}catch(e){document.documentElement.dataset.sidebar="expanded"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
      </head>
      <body className="antialiased">
        <Providers>
          <SidebarProvider>
            <LayoutShell sidebar={<Sidebar />} topbar={<Navbar />}>
              {children}
            </LayoutShell>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
