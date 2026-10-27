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
const USER_KEY = "auth_user";
const AUTH_EVENT = "auth-changed";

export interface CurrentUser {
  email: string;
  full_name?: string | null;
  picture_url?: string | null;
}

/**
 * Save the profile returned by the backend at sign-in (name, picture)
 */
export const setUser = (user: CurrentUser) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Signed-in user: the saved profile, else just the email from the JWT
 */
export const getUser = (): CurrentUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) return JSON.parse(saved) as CurrentUser;
  } catch {
    // fall through to the token
  }
  const token = getToken();
  if (!token) return null;
  try {
    const { email } = jwtDecode<{ email?: string }>(token);
    return email ? { email } : null;
  } catch {
    return null;
  }
};

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
  localStorage.removeItem(USER_KEY);

  // 🔥 notify app
  window.dispatchEvent(new Event(AUTH_EVENT));
};

/**
 * True when the token can't be decoded or its `exp` is in the past
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

/**
 * Check if user is logged in with a non-expired token
 */
export const isAuthenticated = (): boolean => {
  const token = getToken();
  return !!token && !isTokenExpired(token);
};

/**
 * Listen to auth changes
 */
export const onAuthChange = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
};
