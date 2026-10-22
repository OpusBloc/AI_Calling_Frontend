"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearToken } from "@/lib/auth";

interface Props {
  children: ReactNode;
}

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/otp",
];

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getToken();

    // ❌ Not logged in
    if (!token) {
      if (!PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
        clearToken();
        // Allow renders so the page isn't frozen while navigation happens
        setAllowed(true);
        router.replace("/auth/login");
        return;
      }
      setAllowed(true);
      return;
    }

    // ✅ Logged in → allow everything
    setAllowed(true);

    // If logged-in user tries to access auth pages, redirect home
    if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
      router.replace("/");
    }
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return <>{children}</>;
}
