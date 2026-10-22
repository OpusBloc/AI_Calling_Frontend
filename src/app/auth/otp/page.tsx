"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { api } from "@/lib/api"
import {
  showSuccessNotification,
  showErrorNotification,
} from "@/hooks/useTransactionNotification"
import { setToken } from "@/lib/auth"
import { getDeviceId } from "@/utils/device"

export default function OtpPage() {
  const router = useRouter()
  const params = useSearchParams()
  const userId = params.get("userId")

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  /* ================= ENSURE 2FA ================= */
  useEffect(() => {
    if (!userId) return
    api.post("/auth/2fa/ensure", { userId }).then((res) => {
      if (res.data.showQr) setQr(res.data.qrCode)
    })
  }, [userId])

  /* ================= AUTO VERIFY ================= */
  useEffect(() => {
    const code = otp.join("")
    if (code.length === 6 && !loading) {
      handleVerify(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  /* ================= VERIFY ================= */
  const handleVerify = async (code: string) => {
    if (!userId || loading) return

    try {
      setLoading(true)

      const res = await api.post("/auth/2fa/verify", {
        userId,
        otp: code,
        device: {
          deviceId: getDeviceId(),
          userAgent: navigator.userAgent,
        },
      })

      setToken(res.data.token)

    router.replace("/");

      showSuccessNotification("Verified successfully")
    } catch {
      showErrorNotification("Invalid OTP. Please re-enter.")
      setOtp(["", "", "", "", "", ""])
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  /* ================= INPUT HANDLERS ================= */

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return

    const next = [...otp]
    next[index] = value
    setOtp(next)

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!paste) return

    const next = paste.split("")
    while (next.length < 6) next.push("")
    setOtp(next)

    const lastIndex = Math.min(paste.length, 6) - 1
    inputsRef.current[lastIndex]?.focus()
  }

  /* ================= UI ================= */

  return (
    <div className="flex h-screen w-full bg-[#f6f7f8] overflow-hidden">
      {/* LEFT */}
      <div className="flex w-full flex-col justify-center bg-white px-6 py-5 lg:w-1/2 lg:px-20 xl:w-[540px] xl:px-24 border-r border-[#f0f2f4]">
        <div className="mx-auto w-full max-w-[360px]">

          {/* Brand */}
          <div className="flex items-center gap-2 mb-8">
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

          {/* Heading */}
          <h1 className="text-[28px] font-semibold text-gray-900">
            Two-Factor Authentication
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the 6-digit code from your authenticator app
          </p>

          {/* QR */}
          {qr && (
            <div className="mt-3 flex flex-col items-center">
              <p className="text-sm text-gray-600 mb-2 text-center">
                Scan using <span className="font-medium">Google Authenticator</span>
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <img src={qr} alt="QR" className="w-32 h-32" />
              </div>
            </div>
          )}

          {/* OTP INPUTS */}
          <div className="mt-4 flex justify-center gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
  inputsRef.current[i] = el
}}

                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={loading}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="
                  h-10 w-9 rounded-md
                  border border-gray-300
                  text-lg font-semibold text-gray-900
                  text-center
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              />
            ))}
          </div>

          {/* VERIFY */}
          <button
            onClick={() => handleVerify(otp.join(""))}
            disabled={loading || otp.join("").length !== 6}
            className="
              mt-5 w-full h-11 rounded-md
              bg-blue-500 text-white text-sm font-medium
              hover:bg-blue-600 transition
              disabled:opacity-60
            "
          >
            {loading ? "Verifying…" : "Verify"}
          </button>

          {/* Footer */}
          <p className="mt-3 text-xs text-gray-400 text-center">
            Didn’t request this? Your account may be at risk.
          </p>

          <div className="mt-4 flex justify-center text-[11px] text-gray-400">
            🔒 Bank-grade security encryption
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#101922]">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPpaHuirNR4-DuHoCNxq0KWyI38HjT7xN6X65BT3CaPtgdwVmBbeVgwvSl50kW3lSFSQLqAD3KtQ3I0Lyc2GaZkfq-zgXUeAufVW_qz_sITKP5cdxhNDQSDpNPXQ0t1jIhhiPuY2lv7TyWLhfChbmh23Wezn73xs14PE48cNW3hVYwug5_FmgmlUM0wlGwxv_Ca05N2BjmK6ZINYz3aqCsFaUObZA2vwFhsLN9Gfhsoueh0L8Wx3iPoBYmDjQ638PuyNTeNnKYVKo"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-blue-900/25" />
      </div>
    </div>
  )
}
