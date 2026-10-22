"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff } from "lucide-react";
import { setToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import ParticleBackground from "@/hooks/background";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/hooks/useTransactionNotification";
import { getDeviceId } from "@/utils/device";
import { APP_CONFIG } from "@/config/env";
import { API_CONFIG } from "@/constant";
import { AuthUser, KycStatus } from "@/types/auth";
import { apiErrorMessage } from "@/lib/apiError";

interface GoogleJwtPayload {
  email?: string;
}

const publicAuthClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: false,
});

const normalizeUser = (user: Partial<AuthUser> & { email?: string }): AuthUser => ({
  id: user.id ?? "",
  email: user.email ?? "",
  name: user.name ?? user.email ?? "Admin User",
  profileImage: user.profileImage,
  kycStatus: user.kycStatus ?? KycStatus.APPROVED,
  walletAddress: user.walletAddress,
  aaWalletAddress: user.aaWalletAddress ?? null,
  is2FAEnabled: user.is2FAEnabled ?? false,
});

export default function LoginPage() {
  const router = useRouter();
  const { setUserDirectly } = useAuth();
  const divRef = useRef<HTMLDivElement>(null);
  const scrollPanelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    scrollPanelRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const finalizeLogin = (token: string, user: Partial<AuthUser> & { email?: string }) => {
    setToken(token);
    setUserDirectly(normalizeUser(user));
    showSuccessNotification("Login successful", undefined, {
      title: "Welcome",
    });
    router.replace("/");
  };

  const handleForgotPassword = () => {
    const identifier = email.trim();

    if (!identifier) {
      showErrorNotification("Enter your email address first.");
      return;
    }

    router.push(
      `/auth/forgot-password?identifier=${encodeURIComponent(identifier)}`
    );
  };

  const handleTraditionalLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      showErrorNotification("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await publicAuthClient.post("/auth/Adminlogin", {
        email: email.trim(),
        password,
        device: {
          deviceId: getDeviceId(),
          userAgent: navigator.userAgent,
        },
      });

      if (res.data?.requires2FA) {
        router.push(`/auth/otp?userId=${res.data.userId}`);
        return;
      }

      if (!res.data?.token || !res.data?.user) {
        showErrorNotification("Login failed.");
        return;
      }

      finalizeLogin(res.data.token, res.data.user);
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.message
          : "Authentication encountered an issue.";

      showErrorNotification(
        typeof message === "string" ? message : "Authentication encountered an issue."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credential: string | undefined) => {
    if (!credential) return;

    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credential);

      if (!decoded.email) {
        showErrorNotification("Email verification failed");
        return;
      }

      const res = await publicAuthClient.post("/auth/Admingoogle", {
        idToken: credential,
        email: decoded.email,
        intent: "login",
        device: {
          deviceId: getDeviceId(),
          userAgent: navigator.userAgent,
        },
      });

      if (res.data.isNewUser) {
        showErrorNotification("Account not found. Please sign up.");
        router.push("/auth/signup");
        return;
      }

      if (res.data?.requires2FA) {
        router.push(`/auth/otp?userId=${res.data.userId}`);
        return;
      }

      finalizeLogin(res.data.token, res.data.user);
    } catch (err) {
      showErrorNotification(apiErrorMessage(err, "Authentication encountered an issue."));
      console.error("Google Login Error:", err);
    }
  };

  console.log("RENDER LOGIN PAGE", divRef, setPosition);

  return (
    <GoogleOAuthProvider clientId={APP_CONFIG.googleClientId}>
      <ParticleBackground />

      <div className="flex h-[100svh] w-full overflow-hidden bg-[#f6f7f8] lg:h-screen">
        <div
          ref={scrollPanelRef}
          className="auth-panel-scroll flex w-full flex-col justify-start overflow-y-auto border-r border-[#f0f2f4] bg-white px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:pt-[calc(env(safe-area-inset-top)+5rem)] sm:pb-[calc(env(safe-area-inset-bottom)+2.5rem)] lg:w-1/2 lg:px-20 lg:pt-12 lg:pb-12 xl:w-[540px] xl:px-24"
        >
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-2">
              <Image
                src="/assets/card-token.png"
                alt="Opus Bloc"
                width={22}
                height={22}
                priority
              />
              <span className="text-sm font-semibold text-gray-900">
                Opus Bloc
              </span>
            </div>

            <h1 className="text-[28px] font-semibold text-gray-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter your credentials to access your admin dashboard.
            </p>

            <form className="mt-8 space-y-6" onSubmit={handleTraditionalLogin}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-blue-500 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 pr-11 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 transition hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-md bg-blue-500 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Logging in..." : "Log In"}
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">OR</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="flex w-full justify-center">
                <GoogleLogin
                  onSuccess={(res) => handleGoogleSuccess(res.credential)}
                  onError={() => showErrorNotification("Google Sign-in Failed")}
                  size="large"
                  theme="outline"
                  width={300}
                  text="continue_with"
                  shape="rectangular"
                />
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{" "}
                <a
                  href="/auth/signup"
                  className="font-medium text-blue-500 hover:underline"
                >
                  Sign Up
                </a>
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-1 text-[11px] text-gray-400">
              Bank-grade security encryption
            </div>
          </div>
        </div>

        <div className="relative hidden flex-1 bg-[#101922] lg:flex">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPpaHuirNR4-DuHoCNxq0KWyI38HjT7xN6X65BT3CaPtgdwVmBbeVgwvSl50kW3lSFSQLqAD3KtQ3I0Lyc2GaZkfq-zgXUeAufVW_qz_sITKP5cdxhNDQSDpNPXQ0t1jIhhiPuY2lv7TyWLhfChbmh23Wezn73xs14PE48cNW3hVYwug5_FmgmlUM0wlGwxv_Ca05N2BjmK6ZINYz3aqCsFaUObZA2vwFhsLN9Gfhsoueh0L8Wx3iPoBYmDjQ638PuyNTeNnKYVKo"
            alt="Real Estate"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />

          <div className="absolute inset-0 bg-blue-900/40" />

          <div className="relative z-10 flex h-full w-full items-end">
            <div className="max-w-3xl p-20 text-white">
              <h1 className="text-5xl font-black leading-tight tracking-tight">
                Secure Real Estate Tokenization
              </h1>

              <p className="mt-6 max-w-[600px] text-lg font-medium leading-relaxed text-white/90">
                Access your diversified portfolio of real-world assets.
                Experience the future of property investment with blockchain
                transparency and fractional ownership.
              </p>

              <div className="mt-10 flex gap-10 border-t border-white/10 pt-8">
                <div>
                  <div className="text-2xl font-bold">$240M+</div>
                  <div className="text-sm text-white/70">Assets Tokenized</div>
                </div>

                <div>
                  <div className="text-2xl font-bold">12k+</div>
                  <div className="text-sm text-white/70">Active Investors</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute text-[10px] opacity-0">
          {position.x},{position.y}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
