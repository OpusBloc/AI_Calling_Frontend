"use client"

import type React from "react"
import Image from "next/image"

interface LoaderProps {
  message?: string
  fullScreen?: boolean
  className?: string
}

export default function Loader({
  message = "Loading, please wait…",
  fullScreen = false,
  className = "",
}: LoaderProps): React.ReactElement {
  return (
    <div
      className={`${
        fullScreen ? "min-h-screen" : "min-h-[40vh]"
      } w-full flex items-center justify-center  ${className}`}
    >
      <div className="relative flex flex-col items-center text-center px-10 py-12 rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.15)] border border-slate-200/60 transition-shadow duration-700">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-200/40 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-200/40 rounded-full blur-[80px] animate-pulse [animation-delay:1s]"></div>

        <div className="relative mb-8">
          <div className="absolute inset-0 -m-3 rounded-full border-2 border-green-400/50 animate-[spin_8s_linear_infinite] shadow-sm"></div>
          <div className="absolute inset-0 -m-1.5 rounded-full border border-green-400/40 animate-[spin_6s_linear_infinite_reverse] shadow-sm"></div>
          <div className="absolute inset-0 rounded-full border border-green-300/30 animate-ping"></div>

          <div className="relative z-10 bg-white rounded-full p-5 shadow-lg ring-1 ring-slate-200/80">
            <Image
              src="/assets/card-token.png"
              alt="Loading"
              width={56}
              height={56}
              priority
              className="animate-pulse"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-green-500 to-green-700 animate-bounce [animation-delay:-0.3s] shadow-md shadow-teal-300/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-green-500 to-green-700 animate-bounce [animation-delay:-0.15s] shadow-md shadow-teal-300/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-green-500 to-green-700 animate-bounce shadow-md shadow-teal-300/50" />
        </div>

        <p className="text-base font-semibold text-slate-800 tracking-wide mb-1.5">{message}</p>
        <p className="text-xs text-slate-500 font-medium">This may take a few seconds</p>
      </div>
    </div>
  )
}
