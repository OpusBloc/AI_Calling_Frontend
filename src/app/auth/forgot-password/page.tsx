"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/hooks/useTransactionNotification";
import { API_CONFIG } from "@/constant";

type ResetMethod = "EMAIL" | "SMS" | "WHATSAPP";

const publicAuthClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: false,
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = useMemo(
    () => (searchParams.get("identifier") ?? "").trim(),
    [searchParams]
  );

  const [method, setMethod] = useState<ResetMethod>("EMAIL");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSendOtp = async () => {
    if (!identifier) {
      showErrorNotification("Go back and enter your email on the login page.");
      return;
    }

    setIsSendingOtp(true);

    try {
      await publicAuthClient.post("/auth/forgot-password", {
        identifier,
        method,
      });

      setOtpSent(true);
      showSuccessNotification("OTP sent successfully.");
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.message
          : "Failed to send OTP.";

      showErrorNotification(typeof message === "string" ? message : "Failed to send OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showErrorNotification("Enter the OTP.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const res = await publicAuthClient.post("/auth/verify-reset-otp", {
        phoneNumber: identifier,
        otp: otp.trim(),
      });

      if (!res.data?.resetToken) {
        showErrorNotification("OTP verification failed.");
        return;
      }

      setResetToken(res.data.resetToken);
      showSuccessNotification("OTP verified.");
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.message
          : "Invalid OTP.";

      showErrorNotification(typeof message === "string" ? message : "Invalid OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken) {
      showErrorNotification("Verify the OTP first.");
      return;
    }

    if (!newPassword) {
      showErrorNotification("Enter a new password.");
      return;
    }

    setIsResettingPassword(true);

    try {
      await publicAuthClient.post("/auth/reset-password", {
        resetToken,
        newPassword,
      });

      showSuccessNotification("Password updated successfully.");
      router.replace("/auth/login");
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.message
          : "Password reset failed.";

      showErrorNotification(
        typeof message === "string" ? message : "Password reset failed."
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f6f7f8]">
      <div className="flex w-full flex-col justify-center border-r border-[#f0f2f4] bg-white px-6 lg:w-1/2 lg:px-20 xl:w-[540px] xl:px-24">
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
            Reset password
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Use the email entered on the login page to reset your password.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Identifier
              </label>
              <div className="flex h-11 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                {identifier || "No email selected"}
              </div>
            </div>

            {!otpSent && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(["EMAIL", "SMS", "WHATSAPP"] as ResetMethod[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMethod(option)}
                      className={`h-10 rounded-md border text-sm font-medium transition ${
                        method === option
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || !identifier}
                  className="h-11 w-full rounded-md bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingOtp ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}

            {otpSent && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Enter OTP"
                    className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {!resetToken && (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp}
                    className="h-11 w-full rounded-md bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isVerifyingOtp ? "Verifying OTP..." : "Verify OTP"}
                  </button>
                )}

                {resetToken && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Enter new password"
                        className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isResettingPassword}
                      className="h-11 w-full rounded-md bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isResettingPassword ? "Resetting..." : "Reset Password"}
                    </button>
                  </>
                )}
              </>
            )}

            <p className="text-center text-sm text-gray-600">
              Remembered your password?{" "}
              <a
                href="/auth/login"
                className="font-medium text-blue-500 hover:underline"
              >
                Back to login
              </a>
            </p>
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
          </div>
        </div>
      </div>
    </div>
  );
}


