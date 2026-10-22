// src/hooks/useAuth.ts

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  getToken,
  clearToken,
  onAuthChange,
  getUserIdFromToken,
} from "@/lib/auth";
import { AuthUser } from "@/types/auth";

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
  setUserDirectly: (user: AuthUser) => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userId = getUserIdFromToken();
      if (!userId) throw new Error("User ID missing");

      const res = await api.get(`/auth/profile/${userId}`);
      setUser(res.data.user ?? res.data);
    } catch (err) {
      // Only clear token on 401 — the api interceptor already redirects to login,
      // but we still need to clear local state. For network/timeout errors,
      // keep the token so the user isn't logged out by a flaky connection.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        clearToken();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 INITIAL LOAD + AUTO UPDATE ON LOGIN / LOGOUT
  useEffect(() => {
    fetchUser();

    const unsubscribe = onAuthChange(() => {
      fetchUser();
    });

    return unsubscribe;
  }, [fetchUser]);

  const logout = () => {
    clearToken();          // 🔥 triggers navbar update
    setUser(null);
    router.replace("/auth/login");
  };

  const setUserDirectly = (user: AuthUser) => {
    setUser(user);
    setLoading(false);
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    refreshUser: fetchUser,
    logout,
    setUserDirectly,
  };
}
