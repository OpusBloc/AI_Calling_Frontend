"use client";

import React, { useCallback, useMemo, useState } from "react";

type ButtonStatus = "idle" | "loading" | "success";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: ButtonStatus;
  fullWidth?: boolean;
  loadingText?: string;
}

export default function Button(props: ButtonProps): React.ReactElement {
  const {
    status,
    disabled,
    className,
    children,
    fullWidth,
    loadingText,
    onClick,
    ...rest
  } = props;

  const [isLocalLoading, setIsLocalLoading] = useState<boolean>(false);

  const effectiveStatus: ButtonStatus = useMemo(() => {
    if (status) return status;
    return isLocalLoading ? "loading" : "idle";
  }, [status, isLocalLoading]);

  const baseClasses =
    "font-medium py-3 px-6 rounded-md transition-colors duration-200 text-sm tracking-wide text-white";
  const widthClass = fullWidth ? " w-full" : "";

  const colorClass = (() => {
    if (status === "success") {
      // Light green after task completion
      return " bg-[#75A98F] cursor-not-allowed";
    }
    if (disabled || effectiveStatus === "loading") {
      // Disabled: grey
      return " bg-gray-400 cursor-not-allowed";
    }
    // Enabled: primary green
    return " bg-[#006B35] hover:bg-[#0A6E39]";
  })();

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (!onClick) return;
      setIsLocalLoading(true);
      try {
        await Promise.resolve(onClick(e));
      } finally {
        setIsLocalLoading(false);
      }
    },
    [onClick]
  );

  return (
    <button
      {...rest}
      onClick={handleClick}
      disabled={
        disabled || status === "success" || effectiveStatus === "loading"
      }
      aria-busy={effectiveStatus === "loading"}
      data-loading={effectiveStatus === "loading" ? "true" : undefined}
      className={`${baseClasses}${widthClass}${colorClass}${
        className ? ` ${className}` : ""
      }`}
    >
      {effectiveStatus === "loading" ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          <span>{loadingText || children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
