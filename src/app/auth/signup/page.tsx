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
import { getDeviceId } from "@/utils/device";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/hooks/useTransactionNotification";
import { APP_CONFIG } from "@/config/env";
import { API_CONFIG } from "@/constant";
import { AuthUser, KycStatus } from "@/types/auth";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";

interface GoogleJwtPayload {
  email?: string;
}

type ApiErrorWithMessage = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

const publicAuthClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: false,
});

const SIGNUP_OTP_PURPOSE = "SIGNUP";

const normalizeIndianPhoneNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "+91";
  }

  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("91")) {
    return `+${digits}`;
  }

  return `+91${digits}`;
};

const normalizeUser = (
  user: Partial<AuthUser> & {
    email?: string;
    phoneNumber?: string;
    accountStatus?: string;
  }
): AuthUser => ({
  id: user.id ?? "",
  email: user.email ?? "",
  name: user.name ?? user.email ?? "Admin User",
  profileImage: user.profileImage,
  role: user.role,
  phoneNumber: user.phoneNumber,
  accountStatus: user.accountStatus,
  kycStatus: user.kycStatus ?? KycStatus.APPROVED,
  walletAddress: user.walletAddress,
  aaWalletAddress: user.aaWalletAddress ?? null,
  is2FAEnabled: user.is2FAEnabled ?? false,
});

const resolveAuthErrorMessage = (error: unknown, fallback: string) => {
  const rawMessage = (error as ApiErrorWithMessage)?.response?.data?.message;
  return Array.isArray(rawMessage)
    ? rawMessage.join(" ")
    : String(rawMessage || fallback);
};

export default function SignupPage() {
  const router = useRouter();
  const { setUserDirectly } = useAuth();
  const scrollPanelRef = useRef<HTMLDivElement>(null);
  const [isPrimaryDevice, setIsPrimaryDevice] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignupFormComplete =
    email.trim().length > 0 &&
    normalizeIndianPhoneNumber(phoneNumber) !== "+91" &&
    otp.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  useEffect(() => {
    if (otpResendCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOtpResendCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpResendCountdown]);

  useEffect(() => {
    scrollPanelRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const finalizeSignup = (
    token: string,
    user: Partial<AuthUser> & {
      email?: string;
      phoneNumber?: string;
      accountStatus?: string;
    }
  ) => {
    setToken(token);
    setUserDirectly(normalizeUser(user));
    showSuccessNotification("Signup successful", undefined, {
      title: "Welcome to Opus Bloc",
      hideTxLink: true,
    });
    router.replace("/");
  };

  const handlePrimaryDeviceFlow = async (userId: string) => {
    if (!isPrimaryDevice) {
      return false;
    }

    const primaryRes = await api.post("/auth/device/confirm-primary", {
      deviceId: getDeviceId(),
      isPrimary: true,
    });

    if (primaryRes.data?.require2FA) {
      if (primaryRes.data.mode === "SETUP_2FA") {
        router.push(`/auth/otp?purpose=ENABLE_2FA&userId=${userId}`);
      }

      if (primaryRes.data.mode === "VERIFY_2FA") {
        router.push(`/auth/otp?purpose=CHANGE_PRIMARY&userId=${userId}`);
      }

      return true;
    }

    return false;
  };

  const handleSendOtp = async () => {
    const normalizedPhoneNumber = normalizeIndianPhoneNumber(phoneNumber);

    if (normalizedPhoneNumber === "+91") {
      showErrorNotification("Phone number is required.");
      return;
    }

    try {
      setIsSendingOtp(true);
      await publicAuthClient.post("/auth/send-otp", {
        identifier: normalizedPhoneNumber,
        purpose: SIGNUP_OTP_PURPOSE,
      });
      setPhoneNumber(normalizedPhoneNumber);
      setOtpSent(true);
      setOtpVerified(false);
      setOtpResendCountdown(30);
      showSuccessNotification("OTP sent successfully.");
    } catch (error) {
      showErrorNotification(
        resolveAuthErrorMessage(error, "Failed to send OTP.")
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedPhoneNumber = normalizeIndianPhoneNumber(phoneNumber);

    if (normalizedPhoneNumber === "+91" || !otp.trim()) {
      showErrorNotification("Phone number and OTP are required.");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      await publicAuthClient.post("/auth/verify-otp", {
        identifier: normalizedPhoneNumber,
        otp: otp.trim(),
        purpose: SIGNUP_OTP_PURPOSE,
      });
      setPhoneNumber(normalizedPhoneNumber);
      setOtpVerified(true);
      showSuccessNotification("OTP verified successfully.");
    } catch (error) {
      setOtpVerified(false);
      showErrorNotification(
        resolveAuthErrorMessage(error, "OTP verification failed.")
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleTraditionalSignup = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const normalizedPhoneNumber = normalizeIndianPhoneNumber(phoneNumber);

    if (!email.trim() || normalizedPhoneNumber === "+91" || !password.trim()) {
      showErrorNotification("Email, phone number, and password are required.");
      return;
    }

    if (password !== confirmPassword) {
      showErrorNotification("Passwords do not match.");
      return;
    }

    if (!otpVerified) {
      showErrorNotification("Please verify your OTP before signing up.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await publicAuthClient.post("/auth/Adminsignup", {
        email: email.trim(),
        phoneNumber: normalizedPhoneNumber,
        password,
        confirmPassword,
        device: {
          deviceId: getDeviceId(),
          userAgent: navigator.userAgent,
        },
      });

      if (res.data?.requires2FA) {
        router.push(`/auth/otp?userId=${res.data.userId}`);
        return;
      }

      if (res.data?.token && res.data?.user) {
        const redirectedToOtp = await handlePrimaryDeviceFlow(res.data.user.id);
        if (redirectedToOtp) {
          setToken(res.data.token);
          setUserDirectly(normalizeUser(res.data.user));
          return;
        }

        finalizeSignup(res.data.token, res.data.user);
        return;
      }

      showSuccessNotification("Signup successful. Please login.");
      router.push("/auth/login");
    } catch (error) {
      showErrorNotification(
        resolveAuthErrorMessage(error, "Signup failed.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) {
      showErrorNotification("Invalid Google credential", undefined, {
        title: "Authentication Error",
        hideTxLink: true,
      });
      return;
    }

    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credential);

      if (!decoded.email) {
        showErrorNotification("Google email not found", undefined, {
          title: "Authentication Error",
          hideTxLink: true,
        });
        return;
      }

      const res = await publicAuthClient.post("/auth/Admingoogle", {
        idToken: credential,
        email: decoded.email,
        intent: "register",
        device: {
          deviceId: getDeviceId(),
          userAgent: navigator.userAgent,
        },
      });

      if (res.data?.requires2FA) {
        router.push(`/auth/otp?userId=${res.data.userId}`);
        return;
      }

      if (!res.data.isNewUser) {
        showErrorNotification("Account already exists. Please login instead");
        router.push("/auth/login");
        return;
      }

      const redirectedToOtp = await handlePrimaryDeviceFlow(res.data.user.id);
      if (redirectedToOtp) {
        setToken(res.data.token);
        setUserDirectly(normalizeUser(res.data.user));
        return;
      }

      finalizeSignup(res.data.token, res.data.user);
    } catch (err) {
      showErrorNotification(apiErrorMessage(err, "Signup failed"));
      console.error("Google signup error:", err);
    }
  };

  return (
    <GoogleOAuthProvider clientId={APP_CONFIG.googleClientId}>
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
              Create your account
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign up to continue to Opus Bloc
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleTraditionalSignup}>
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value.startsWith("+")) {
                        setPhoneNumber(normalizeIndianPhoneNumber(value));
                      } else {
                        setPhoneNumber(value);
                      }
                      setOtp("");
                      setOtpSent(false);
                      setOtpVerified(false);
                    }}
                    placeholder="+919876543210"
                    className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || otpResendCountdown > 0}
                    className="min-w-[110px] rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSendingOtp
                      ? "Sending..."
                      : otpSent
                        ? otpResendCountdown > 0
                          ? `Resend in ${otpResendCountdown}s`
                          : "Resend OTP"
                        : "Send OTP"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Verify OTP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Enter OTP"
                    className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || !otpSent}
                    className="min-w-[110px] rounded-md border border-emerald-200 px-3 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isVerifyingOtp
                      ? "Verifying..."
                      : otpVerified
                        ? "Verified"
                        : "Verify OTP"}
                  </button>
                </div>
                {otpVerified ? (
                  <p className="mt-1 text-xs text-emerald-600">
                    Mobile number verified successfully.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Re-enter Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter password"
                    className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 pr-11 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 transition hover:text-gray-600"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="primary-device"
                  type="checkbox"
                  checked={isPrimaryDevice}
                  onChange={(event) => setIsPrimaryDevice(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="primary-device"
                  className="select-none text-sm text-gray-600"
                >
                  This is my primary device
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !otpVerified || !isSignupFormComplete}
                className="h-11 w-full rounded-md bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing up..." : "Sign up"}
              </button>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">OR</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="flex w-full justify-center">
                <GoogleLogin
                  onSuccess={(res) => handleGoogleSuccess(res.credential)}
                  onError={() => showErrorNotification("Google signup failed")}
                  theme="outline"
                  size="large"
                  width={300}
                  text="signup_with"
                />
              </div>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <a
                  href="/auth/login"
                  className="font-medium text-blue-500 hover:underline"
                >
                  Login
                </a>
              </p>
            </form>

            <div className="mt-10 flex items-center justify-center gap-1 text-[11px] text-gray-400">
              Bank-grade security encryption
            </div>
          </div>
        </div>

        <div className="relative hidden flex-1 overflow-hidden bg-[#101922] lg:flex">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPpaHuirNR4-DuHoCNxq0KWyI38HjT7xN6X65BT3CaPtgdwVmBbeVgwvSl50kW3lSFSQLqAD3KtQ3I0Lyc2GaZkfq-zgXUeAufVW_qz_sITKP5cdxhNDQSDpNPXQ0t1jIhhiPuY2lv7TyWLhfChbmh23Wezn73xs14PE48cNW3hVYwug5_FmgmlUM0wlGwxv_Ca05N2BjmK6ZINYz3aqCsFaUObZA2vwFhsLN9Gfhsoueh0L8Wx3iPoBYmDjQ638PuyNTeNnKYVKo"
            alt="Real Estate"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />

          <div className="absolute inset-0 bg-blue-900/25" />

          <div className="relative z-10 flex h-full w-full items-end">
            <div className="max-w-3xl p-20 text-white">
              <h1 className="text-5xl font-black leading-tight">
                Secure Real Estate Tokenization
              </h1>

              <p className="mt-6 max-w-[600px] text-lg text-white/90">
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
      </div>
    </GoogleOAuthProvider>
  );
}
