"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
// import { usePathname } from "next/navigation";
import { FiBell } from "react-icons/fi";
import { FiMoon, FiSun } from "react-icons/fi";
import { api } from "@/lib/api";
import axios from "axios";
import {
  FiCheckCircle,
  FiCreditCard,
  FiAlertTriangle,
  FiInfo,
  FiPhoneCall,
  FiXCircle,
  FiDollarSign,
  FiShield,
  FiUserCheck,
  FiFileText,
} from "react-icons/fi";
import type { IconType } from "react-icons";

interface NotificationStyle {
  Icon: IconType;
  bg: string;
  color: string;
}

interface NavbarNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

import { useAuth } from "@/hooks/useAuth";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { enableNotificationSound, playNotificationSound } from "@/lib/notificationSound";
import type { NotificationEvent } from "@/lib/socket";
import { getRoleFromToken } from "@/lib/auth";
import SupportOfferAlerts from "@/components/profile/whatsapp-support/SupportOfferAlerts";

const handleIncomingNotification = (event: NotificationEvent) => {
  // A WhatsApp chat offered to this agent is handled by <SupportOfferAlerts>
  // (its own chime, the agent's sound setting, a notification that opens
  // Support Chats). Handling it here too played two sounds and two popups.
  if (event.type === "WHATSAPP_SUPPORT_ASSIGNED") return;
  playNotificationSound();
  if (!event.type.startsWith("WHATSAPP_SUPPORT_") || typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const notification = new Notification(event.title || "WhatsApp support update", {
      body: event.message || "A new support update has arrived.",
      tag: event.id,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.warn("Couldn't show a browser notification:", error);
  }
};

const TAB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "User Analytics",
  kyc: "KYC Requests",
  fractionalization: "Properties",
  yield: "Yield Transfer",
  users: "Users",
  wallet: "Push Notifications",
  transactions: "Transactions",
  whatsapp: "WhatsApp",
  chatbot: "Chatbot",
  trades: "Trades",
  refunds: "Refunds",
  tickets: "Tickets",
  support: "Support",
  referral: "Admin Rules",
  "approved-records": "Approved Records",
  "platform-settings": "Platform Settings",
  "marketing-rewards": "Marketing Rewards",
  "channel-partner": "Channel Partner",
  "channel-partner-milestones": "Milestones",
  "channel-partner-commissions": "Commissions",
  "channel-partner-brochures": "Property Brochures",
  "channel-partner-institutions": "Institutional Partners",
  "channel-partner-overview": "Channel Partner Overview",
  "channel-partner-individuals": "Individual Partners",
  "channel-partner-referrals": "Referrals",
  "channel-partner-payouts": "Payouts",
  "channel-partner-milestone-approvals": "Milestone Approvals",
  "channel-partner-vouchers": "Voucher Batches",
  "channel-partner-campaigns": "Campaigns",
  "channel-partner-fraud": "Fraud & Risk",
  "channel-partner-audit": "Audit Logs",
};

/* Circular icon button shared by the bell and the theme toggle. */
const ICON_BUTTON =
  "w-9 h-9 flex items-center justify-center rounded-md border border-hairline bg-surface text-body transition-colors hover:border-hairline-strong hover:text-accent-text";

const Navbar = ({ activeTab }: { activeTab?: string }) => {

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, loading } = useAuth();

  const handleCopyWallet = useCallback(() => {
    const addr = (user as { aaWalletAddress?: string })?.aaWalletAddress;
    console.log("Copying wallet address:", addr);
    if (!addr) return;
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [user]);

/* Notification glyph tints, mapped onto the design system's muted financial
   semantics (gain / loss / info / warn / accent) rather than raw Tailwind hues. */
const notificationStyles: Record<string, NotificationStyle> = {
  LISTING_APPROVED: {
    Icon: FiCheckCircle,
    bg: "bg-gain-bg",
    color: "text-gain",
  },

  FUNDING_GOAL_MET: {
    Icon: FiCreditCard,
    bg: "bg-info-bg",
    color: "text-info",
  },

  DOCUMENT_REQUIRED: {
    Icon: FiAlertTriangle,
    bg: "bg-warn-bg",
    color: "text-warn",
  },

  SYSTEM_MAINTENANCE: {
    Icon: FiInfo,
    bg: "bg-info-bg",
    color: "text-info",
  },

  NEW_FEATURE: {
    Icon: FiPhoneCall,
    bg: "bg-accent-bg",
    color: "text-accent-text",
  },

  LISTING_REJECTED: {
    Icon: FiXCircle,
    bg: "bg-loss-bg",
    color: "text-loss",
  },

  PAYOUT_SUCCESSFUL: {
    Icon: FiDollarSign,
    bg: "bg-gain-bg",
    color: "text-gain",
  },

  SECURITY_UPDATE: {
    Icon: FiShield,
    bg: "bg-chip",
    color: "text-muted",
  },

  KYC_SUBMITTED: {
    Icon: FiUserCheck,
    bg: "bg-info-bg",
    color: "text-info",
  },

  FRACTIONALIZATION_REQUEST: {
    Icon: FiFileText,
    bg: "bg-accent-bg",
    color: "text-accent-text",
  },
};

const getNotificationStyle = (type: string) =>
  notificationStyles[type] || notificationStyles.SECURITY_UPDATE;

  const [, setActiveView] = useState<"token" | "balance" | null>(
    null
  );
  const [, setActiveAction] = useState<"transfer" | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
const [notifications, setNotifications] = useState<NavbarNotification[]>([]);
const [loadingNotif, setLoadingNotif] = useState(false);
const notifRef = useRef<HTMLDivElement>(null);



  // local transfer state handled by Button's loading

  // const pathname = usePathname();
  const tokenDropdownRef = useRef<HTMLDivElement>(null);

  // const { address } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    enableNotificationSound();
  }, []);

  useNotificationSocket({ onEvent: handleIncomingNotification });

  useEffect(() => {
    if (!mounted) return;
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }
    setTheme("light");
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.setProperty(
      "--background",
      theme === "dark" ? "#101922" : "#ffffff"
    );
    root.style.setProperty(
      "--foreground",
      theme === "dark" ? "#f3f4f6" : "#111418"
    );
    window.localStorage.setItem("theme", theme);
  }, [mounted, theme]);

  const fetchNotifications = useCallback(async () => {
  try {
    setLoadingNotif(true);

    // EXACT SAME as NotificationsPage
    const response = await api.get("/notifications");

    setNotifications(response.data);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
  } finally {
    setLoadingNotif(false);
  }
}, []);

useEffect(() => {
  if (notifOpen) {
    fetchNotifications();
  }
}, [notifOpen, fetchNotifications]);




  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
  notifOpen &&
  notifRef.current &&
  !notifRef.current.contains(event.target as Node)
) {
  setNotifOpen(false);
}

      if (
        tokenDropdownOpen &&
        tokenDropdownRef.current &&
        !tokenDropdownRef.current.contains(event.target as Node)
      ) {
        setTokenDropdownOpen(false);
        setActiveView(null);
        setActiveAction(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
}, [tokenDropdownOpen, notifOpen]);

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
};

  // const handleTokenButtonClick = () => {
  //     setActiveView('token');
  //     setTokenDropdownOpen(true);
  //     setOwnerAddress(null);
  // };

  // const handleBalanceButtonClick = () => {
  //     setActiveView('balance');
  //     setTokenDropdownOpen(true);
  //     setBalance(null);
  // };

// Agents (SUPPORT) and ADMIN can be offered WhatsApp chats.
const supportRole = String(user?.role || getRoleFromToken() || "").toUpperCase();
const canBeOfferedChats = !loading && (supportRole === "SUPPORT" || supportRole === "ADMIN");

return (
  <nav className="fixed top-0 left-0 w-full z-50 border-b border-hairline bg-[var(--glass-top)] backdrop-blur-xl backdrop-saturate-150">
    {/* Chime + desktop notification when a WhatsApp chat is offered to me — on every page. */}
    {canBeOfferedChats && <SupportOfferAlerts />}
    <div className="h-16 px-4 md:px-6 flex items-center gap-3 min-w-0">

      {/* LEFT — Brand */}
      <Link href="/" className="shrink-0">
        <div className="flex items-center gap-2.5 cursor-pointer">
          <Image
            src="/assets/card-token.png"
            alt="Opus Bloc"
            width={32}
            height={32}
            className="rounded-md"
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[13px] font-extrabold tracking-[0.22em] text-heading">
              OPUS BLOC
            </span>
            <span className="text-[11px] text-muted">Asset Platform</span>
          </div>
        </div>
      </Link>

      {/* SPACER */}
      <div className="flex-1 min-w-0" />

      {/* RIGHT — Actions */}
      <div className="flex items-center gap-4 shrink-0">

        {/* Tab name — hidden on smaller screens */}
        <div className="hidden lg:flex items-center">
          {activeTab && (
            <span className="text-base xl:text-lg font-bold tracking-tight text-heading whitespace-nowrap mr-6 xl:mr-12">
              {TAB_LABELS[activeTab] ?? activeTab}
            </span>
          )}
        </div>

        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className={`relative ${ICON_BUTTON}`}
            aria-label="Notifications"
          >
            <FiBell className="text-lg" />
            {notifications.some(n => !n.isRead) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-3 w-[320px] sm:w-[380px] bg-surface rounded-lg border border-hairline shadow-lg overflow-hidden z-50">
              <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
                <span className="text-sm font-bold tracking-tight text-heading">Notifications</span>
                <button
                  onClick={async () => {
                    await Promise.all(
                      notifications.filter(n => !n.isRead).map(n => axios.patch(`/api/notifications/${n.id}/read`))
                    );
                    fetchNotifications();
                  }}
                  className="text-xs font-semibold text-accent-text hover:text-accent transition-colors"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[340px] overflow-y-auto">
                {loadingNotif && (
                  <div className="p-6 text-center text-muted text-sm">Loading…</div>
                )}
                {!loadingNotif && notifications.length === 0 && (
                  <div className="p-6 text-center text-muted text-sm">No notifications</div>
                )}
                {!loadingNotif && notifications.slice(0, 3).map((n) => {
                  const { Icon, bg, color } = getNotificationStyle(n.type);
                  return (
                    <div key={n.id} className="px-5 py-4 flex gap-3 items-start border-b border-hairline last:border-b-0 hover:bg-surface-hover transition-colors cursor-pointer">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-heading truncate">{n.title}</p>
                        <p className="text-xs text-body mt-0.5 truncate">{n.message}</p>
                        <span className="tnum text-[11px] text-faint">{getTimeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/notifications" onClick={() => setNotifOpen(false)} className="block text-center py-3 text-xs font-semibold text-accent-text border-t border-hairline hover:bg-surface-hover transition-colors">
                View all notifications →
              </Link>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={ICON_BUTTON}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <FiMoon className="text-base" /> : <FiSun className="text-base" />}
        </button>

        {/* Name + Email — only xl+ */}
        {!loading && user && (
          <div className="hidden xl:flex flex-col max-w-[140px] leading-tight text-right">
            <span className="text-sm font-semibold text-heading truncate">{user.name}</span>
            <span className="text-xs text-muted truncate">{user.email}</span>
          </div>
        )}

        {/* AA Wallet chip — only xl+ */}
        {!loading && (user as { aaWalletAddress?: string })?.aaWalletAddress && (
          <button
            type="button"
            onClick={handleCopyWallet}
            title={(user as { aaWalletAddress?: string }).aaWalletAddress}
            className="hidden xl:flex items-center gap-2 h-9 px-3 rounded-md bg-surface-input border border-hairline hover:border-accent transition-colors group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gain shrink-0" />
            <span className="tnum text-xs text-body group-hover:text-accent-text transition-colors">
              {(() => {
                const addr = (user as { aaWalletAddress?: string }).aaWalletAddress!;
                return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
              })()}
            </span>
            <span className="text-[10px] text-faint group-hover:text-accent-text transition-colors">
              {copied ? "✓" : "⎘"}
            </span>
          </button>
        )}

        {/* Profile avatar (display only — the profile page has been removed) */}
        <div className="w-9 h-9 rounded-md overflow-hidden border border-hairline bg-surface flex items-center justify-center">
          <Image
            src={
              user?.profileImage
                ? user.profileImage
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || user?.name || "User")}&background=E5E7EB&color=111827&size=160`
            }
            alt={user?.name || "User"}
            width={80}
            height={80}
            className="object-cover"
          />
        </div>
      </div>
    </div>
  </nav>
);



};

export default Navbar;
