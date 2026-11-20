"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import RevealLoader from "@/components/RevealLoader";
import {
  getToken,
  clearToken,
  isTokenExpired,
  onAuthChange,
} from "@/lib/auth";

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

      // Remove expired or invalid tokens
      if (token && isTokenExpired(token)) {
        clearToken();
      }

      const loggedIn = !!getToken();
      const isPublic = PUBLIC_ROUTES.some((r) =>
        pathname.startsWith(r)
      );

      // Redirect unauthenticated users
      if (!loggedIn && !isPublic) {
        setAllowed(false);
        router.replace("/auth/login");
        return;
      }

      // Redirect authenticated users away from auth pages
      if (loggedIn && isPublic) {
        setAllowed(false);
        router.replace("/dashboard");
        return;
      }

      setAllowed(true);
    };

    check();

    // Listen for login/logout changes
    return onAuthChange(check);
  }, [pathname, router]);

  return (
    <>
      <RevealLoader />
      {allowed ? children : null}
    </>
  );

}
