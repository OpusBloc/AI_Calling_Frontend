"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearToken, isTokenExpired, onAuthChange } from "@/lib/auth";

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
    const check = () => {
      const token = getToken();

      // Drop expired/undecodable tokens so they don't count as a session
      if (token && isTokenExpired(token)) clearToken();

      const loggedIn = !!getToken();
      const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

      // Keep the spinner up until the redirect lands, so the wrong page never flashes
      if (!loggedIn && !isPublic) {
        setAllowed(false);
        router.replace("/auth/login");
        return;
      }
      if (loggedIn && isPublic) {
        setAllowed(false);
        router.replace("/");
        return;
      }

      setAllowed(true);
    };

    check();
    // Re-check on login/logout so the guard follows token changes
    return onAuthChange(check);
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-hairline border-t-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
