"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";


export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage =
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/signup") ||
    pathname.startsWith("/auth/forgot-password") ||
    pathname.startsWith("/auth/otp");

  return (
    <>
      {!isAuthPage && <Navbar />}
      {children}
    </>
  );
}
