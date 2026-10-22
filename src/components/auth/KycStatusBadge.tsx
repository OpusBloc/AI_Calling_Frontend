// src/components/auth/KycStatusBadge.tsx

import { KycStatus } from "@/types/auth";

interface KycStatusBadgeProps {
  status: KycStatus;
}

const statusStyles: Record<KycStatus, string> = {
  NOT_SUBMITTED: "bg-gray-200 text-gray-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function KycStatusBadge({ status }: KycStatusBadgeProps) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusStyles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
