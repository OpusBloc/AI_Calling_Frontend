"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";

import { CurrentUser } from "@/lib/auth";

const initials = (user: CurrentUser) => {
  const source = user.full_name?.trim() || user.email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
};

export default function UserAvatar({ user, size = 36 }: { user: CurrentUser; size?: number }) {
  const [broken, setBroken] = useState(false);

  if (user.picture_url && !broken) {
    return (
      <Image
        src={user.picture_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full ring-1 ring-hairline"
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent-bg font-semibold text-accent-text ring-1 ring-hairline",
        size < 32 ? "text-[11px]" : "text-xs",
      )}
    >
      {initials(user)}
    </span>
  );
}
