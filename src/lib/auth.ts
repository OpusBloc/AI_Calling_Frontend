// src/lib/auth.ts
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub?: string;
  userId?: string;
  id?: string;
  role?: string;
}

export const getUserIdFromToken = (): string | null => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.sub || decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
};

/**
 * Read the user's role straight from the JWT (the backend signs `role` into the
 * token). This is synchronous and reliable even before/without the
 * `/auth/profile` fetch — use it for role gating so support users never
 * transiently fall into admin-only branches.
 */
export const getRoleFromToken = (): string | null => {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.role ?? null;
  } catch {
    return null;
  }
};


const TOKEN_KEY = "access_token";
const AUTH_EVENT = "auth-changed";

/**
 * Save JWT token
 */
export const setToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);

  // 🔥 notify app
  window.dispatchEvent(new Event(AUTH_EVENT));
};

/**
 * Get JWT token
 */
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove JWT token
 */
export const clearToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);

  // 🔥 notify app
  window.dispatchEvent(new Event(AUTH_EVENT));
};

/**
 * Check if user is logged in
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * Listen to auth changes
 */
export const onAuthChange = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
};
