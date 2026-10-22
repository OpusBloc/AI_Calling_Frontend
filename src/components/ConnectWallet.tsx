"use client";
import { useAuth } from "@/hooks/useAuth";
import { showSuccessNotification } from "@/hooks/useTransactionNotification";

export default function AssignedWalletButton() {
  const { user, isAuthenticated, loading } = useAuth();

  // 🔄 Auth still resolving
  if (loading) {
    return (
      <button
        className="h-9 px-3 rounded-lg text-xs font-medium
        bg-gray-100 text-gray-500
        shadow-[0_1px_4px_rgba(0,0,0,0.08)]
        cursor-default"
      >
        Loading…
      </button>
    );
  }

  // ❌ Logged out OR KYC not approved
  if (
    !isAuthenticated ||
    !user ||
    user.kycStatus !== "APPROVED" ||
    !user.aaWalletAddress
  ) {
    return (
      <button
        disabled
        className="h-9 px-3 rounded-lg text-xs font-medium
        bg-gray-200 text-gray-600
        shadow-[0_1px_4px_rgba(0,0,0,0.08)]
        cursor-not-allowed"
      >
        Wallet Pending
      </button>
    );
  }

  const addr = user.aaWalletAddress;
  const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(addr);
    showSuccessNotification("Wallet address copied");
  };

  return (
    <button
      onClick={copy}
      title="Click to copy wallet address"
      className="
        h-9 px-3 rounded-lg
        flex items-center
        text-xs font-mono font-medium
        bg-white text-gray-800
        shadow-[0_2px_8px_rgba(0,0,0,0.12)]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)]
        hover:bg-gray-50
        transition
      "
    >
      {short}
    </button>
  );
}
