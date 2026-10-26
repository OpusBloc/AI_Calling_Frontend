import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
