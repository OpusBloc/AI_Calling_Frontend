import { API_BASE } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";

export interface AuthResponse {
  access_token: string;
  user: CurrentUser;
}

export interface UserSignupRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

async function postAuth<TBody extends object>(path: string, body: TBody): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail ?? `Request failed (${response.status})`);
  }
  return data as AuthResponse;
}

/** POST /api/auth/users/signup */
export function signupUser(body: UserSignupRequest) {
  return postAuth("/auth/users/signup", body);
}

/** POST /api/auth/users/login */
export function loginUser(body: UserLoginRequest) {
  return postAuth("/auth/users/login", body);
}

/** POST /api/auth/users/google/signup */
export function signupWithGoogle(idToken: string) {
  return postAuth("/auth/users/google/signup", { id_token: idToken });
}

/** POST /api/auth/users/google/login */
export function loginWithGoogle(idToken: string) {
  return postAuth("/auth/users/google/login", { id_token: idToken });
}
