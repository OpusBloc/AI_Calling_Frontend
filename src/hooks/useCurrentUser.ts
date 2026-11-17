  "use client";
  import { useEffect, useState } from "react";
  import { getRoleFromToken, getUser, onAuthChange } from "@/lib/auth";

  export function useCurrentUser() {
    const [user, setUser] = useState(() => {
      if (typeof window === "undefined") return null;
      return getUser();
    });
    const [role, setRole] = useState(() => getRoleFromToken());

    useEffect(() => {
      const unsub = onAuthChange(() => {
        setUser(getUser());
        setRole(getRoleFromToken());
      });
      return unsub;
    }, []);

    const name = user?.full_name || user?.email?.split("@")[0] || undefined;
    const formattedRole = role
      ? role.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      : undefined;
    return { name, role: formattedRole, isLoading: false };
  }
