import { formatMoney } from "@/components/ui/utils";

export type CostTrendPoint = { date: string; cost: number };

export const formatRupees = (amount: number | undefined, digits = 2) =>
  amount === undefined ? "—" : `₹${formatMoney(amount, digits)}`;
