"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  FiArrowRight,
  FiCheckCircle,
  FiLock,
  FiTrendingUp,
  FiUpload,
  FiXCircle,
} from "react-icons/fi";
import { MdInventory2, MdVerifiedUser } from "react-icons/md";
import { HiMinus, HiPlus } from "react-icons/hi";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { fetchAllPages } from "@/lib/fetchAllPages";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/hooks/useTransactionNotification";
import { apiErrorMessage } from "@/lib/apiError";
import { Select, SlideOver } from "@/components/ui";

/** Payment fields of the transfer form, as themed listbox options. */
const PAYMENT_METHOD_OPTIONS = [
  { value: "UPI", label: "UPI" },
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "IMPS", label: "IMPS" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "Other", label: "Other" },
];
const PAYMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "FAILED", label: "Failed" },
];
/** Badge shown beside the label once a status is picked. */
const PAYMENT_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-warn-bg text-warn",
  VERIFIED: "bg-gain-bg text-gain",
  FAILED: "bg-loss-bg text-loss",
};

/* ---------------- Types ---------------- */
interface SubSharePlanItem {
  price?: number;
  share?: number;
  aby?: number;
}

export interface ListingTransferProperty {
  id: string;
  landId: string;
  nftAddress: string;
  ownerAddress: string;
  serialNumber?: string;
  subSharePlan?: SubSharePlanItem[];
  revenuePercentage?: number;
  totalFractions?: number;
}

interface KycUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  aaWalletAddress?: string | null;
}

interface ListedSale {
  landId: string;
  listingStatus?: string;
  listingAt?: string;
  listedQuantity?: number;
  TotalQuantitySold?: number;
  // Per-category snapshot: quantity = current remaining listed,
  // initialQuantity = original listed amount (sold = initial − quantity).
  listedSubSharePlan?: {
    subShareIndex: number;
    quantity: number;
    initialQuantity?: number;
  }[];
  // Backend-computed per-category rollup (preferred source when present).
  categorySummary?: {
    subShareIndex: number;
    totalListedQuantity: number;
    totalSoldQuantity: number;
    availableShares: number;
  }[];
}

interface PaymentDetails {
  paymentAmount: string;
  paymentMethod: string;
  paymentDate: string;
  paymentTxId: string;
  paymentStatus: string;
}

interface ListingTransferCtxValue {
  data: ListingTransferProperty;
  plan: SubSharePlanItem[];
  inputs: Record<number, number | "">;
  setInputs: Dispatch<SetStateAction<Record<number, number | "">>>;
  handleInputChange: (index: number, value: string, max: number) => void;
  hasAnyInput: boolean;
  totalShares: number;
  Aby: number;
  listedFlats: number;
  listedByCategory: Record<number, number>;
  soldByCategory: Record<number, number>;
  sidebarTab: "listing" | "transfer" | "cancel";
  setSidebarTab: Dispatch<SetStateAction<"listing" | "transfer" | "cancel">>;
  expiryDate: string;
  setExpiryDate: Dispatch<SetStateAction<string>>;
  actionLoading: "list" | "cancel" | null;
  handleList: () => Promise<void>;
  cancelInputs: Record<number, number | "">;
  setCancelInputs: Dispatch<SetStateAction<Record<number, number | "">>>;
  handleCancelQtyChange: (index: number, value: string, max: number) => void;
  toggleCancel: (index: number) => void;
  hasAnyCancelSelection: boolean;
  handleCancel: (cancelAll?: boolean) => Promise<void>;
  showTransferModal: boolean;
  setShowTransferModal: Dispatch<SetStateAction<boolean>>;
  transferStep: 1 | 2;
  setTransferStep: Dispatch<SetStateAction<1 | 2>>;
  transferUsers: KycUser[];
  transferSearch: string;
  setTransferSearch: Dispatch<SetStateAction<string>>;
  selectedUser: KycUser | null;
  setSelectedUser: Dispatch<SetStateAction<KycUser | null>>;
  transferLoading: boolean;
  usersLoading: boolean;
  paymentDetails: PaymentDetails;
  setPaymentDetails: Dispatch<SetStateAction<PaymentDetails>>;
  openTransferModal: () => Promise<void>;
  handleTransfer: () => Promise<void>;
}

const ListingTransferCtx = createContext<ListingTransferCtxValue | null>(null);

const useListingTransfer = () => {
  const ctx = useContext(ListingTransferCtx);
  if (!ctx) {
    throw new Error(
      "ListingTransfer components must be used within <ListingTransferProvider>",
    );
  }
  return ctx;
};

/* ================================================================
   PROVIDER — owns all state + handlers, shared by the table (left)
   and the action card (right) so they can live in separate columns.
   ================================================================ */
export function ListingTransferProvider({
  data,
  active = true,
  children,
}: {
  data: ListingTransferProperty;
  active?: boolean;
  children: ReactNode;
}) {
  const plan = useMemo(() => data.subSharePlan ?? [], [data.subSharePlan]);
  const router = useRouter();

  const [sidebarTab, setSidebarTab] = useState<
    "listing" | "transfer" | "cancel"
  >("listing");
  const [inputs, setInputs] = useState<Record<number, number | "">>({});
  // Per-category quantity to cancel (absent/0 = that category is untouched).
  const [cancelInputs, setCancelInputs] = useState<Record<number, number | "">>(
    {},
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [actionLoading, setActionLoading] = useState<
    "list" | "cancel" | null
  >(null);
  const [listedFlats, setListedFlats] = useState(0);
  const [listedByCategory, setListedByCategory] = useState<
    Record<number, number>
  >({});
  const [soldByCategory, setSoldByCategory] = useState<Record<number, number>>(
    {},
  );

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStep, setTransferStep] = useState<1 | 2>(1);
  const [transferUsers, setTransferUsers] = useState<KycUser[]>([]);
  const [transferSearch, setTransferSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<KycUser | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    paymentAmount: "",
    paymentMethod: "",
    paymentDate: "",
    paymentTxId: "",
    paymentStatus: "",
  });

  const totalShares = plan.reduce((sum, s) => sum + Number(s.share ?? 0), 0);
  const Aby = data.revenuePercentage || 0;

  useEffect(() => {
    if (!active) return;
    let alive = true;
    api
      .get("/Sales/listed")
      .then((res) => {
        if (!alive) return;
        const listings: ListedSale[] = res.data?.data ?? [];

        // A land can have several listing rows (LISTED / SOLD_OUT / EXPIRED).
        // Pick the active one — prefer LISTED, then most remaining, then newest.
        const primary = listings
          .filter((l) => l.landId === data.landId)
          .sort((a, b) => {
            const aActive =
              String(a.listingStatus ?? "").toUpperCase() === "LISTED";
            const bActive =
              String(b.listingStatus ?? "").toUpperCase() === "LISTED";
            if (aActive !== bActive) return Number(bActive) - Number(aActive);
            const aQty = Number(a.listedQuantity ?? 0);
            const bQty = Number(b.listedQuantity ?? 0);
            if (aQty !== bQty) return bQty - aQty;
            return (
              new Date(b.listingAt ?? 0).getTime() -
              new Date(a.listingAt ?? 0).getTime()
            );
          })[0];

        const listedMap: Record<number, number> = {};
        const soldMap: Record<number, number> = {};

        if (primary) {
          if (primary.categorySummary?.length) {
            // Preferred: backend-computed per-category rollup.
            primary.categorySummary.forEach((c) => {
              listedMap[c.subShareIndex] = Number(c.availableShares ?? 0);
              soldMap[c.subShareIndex] = Number(c.totalSoldQuantity ?? 0);
            });
          } else {
            // Fallback: derive from the raw plan snapshot.
            (primary.listedSubSharePlan ?? []).forEach((s) => {
              const remaining = Number(s.quantity ?? 0);
              const initial = Number(s.initialQuantity ?? remaining);
              listedMap[s.subShareIndex] = remaining;
              soldMap[s.subShareIndex] = Math.max(0, initial - remaining);
            });
          }
        }

        const totalListed =
          Number(primary?.listedQuantity ?? 0) ||
          Object.values(listedMap).reduce((sum, n) => sum + n, 0);

        setListedFlats(totalListed);
        setListedByCategory(listedMap);
        setSoldByCategory(soldMap);
      })
      .catch(() => {
        if (alive) {
          setListedFlats(0);
          setListedByCategory({});
          setSoldByCategory({});
        }
      });
    return () => {
      alive = false;
    };
  }, [active, data.landId]);

  const handleInputChange = (index: number, value: string, max: number) => {
    if (value === "") {
      setInputs((p) => {
        const next = { ...p };
        delete next[index];
        return next;
      });
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setInputs((p) => ({ ...p, [index]: Math.min(num, max) }));
  };

  const hasAnyInput = Object.values(inputs).some(
    (v) => typeof v === "number" && v > 0,
  );

  const handleList = async () => {
    try {
      if (!expiryDate) {
        showErrorNotification("Select an expiry date");
        return;
      }
      const expiryMs = new Date(expiryDate).getTime();
      if (Number.isNaN(expiryMs) || expiryMs <= Date.now()) {
        showErrorNotification("Expiry date must be in the future");
        return;
      }
      if (!plan.length) {
        showErrorNotification("No sub-share plan");
        return;
      }

      const subsharesListing: { subShareIndex: number; quantity: number }[] =
        [];
      Object.entries(inputs).forEach(([index, qty]) => {
        const q = Number(qty);
        if (q > 0) {
          subsharesListing.push({ subShareIndex: Number(index), quantity: q });
        }
      });
      if (!subsharesListing.length) {
        showErrorNotification("Enter a quantity to list");
        return;
      }
      if (!data.serialNumber) {
        showErrorNotification("Serial number missing");
        return;
      }

      const expiryDays = Math.ceil((expiryMs - Date.now()) / 86400000);

      setActionLoading("list");

      // The backend performs the on-chain listing itself.
      await api.post(
        "/sales/list-subflat",
        {
          landId: data.landId,
          expiryDays,
          expiryDate,
          subsharesListing,
        },
        // Backend lists on-chain, which can exceed the 15s default timeout —
        // otherwise a successful post throws and wrongly surfaces a failure
        // notification.
        { timeout: 60000 },
      );

      setInputs({});
      showSuccessNotification("Listing submitted successfully");
      // Reload so the updated listed quantities are re-fetched from the backend.
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      console.error("Listing failed:", err);
      showErrorNotification(apiErrorMessage(err, "Listing failed. See console."));
    } finally {
      setActionLoading(null);
    }
  };

  // Clamp a typed cancel quantity to what is still listed for that category.
  const handleCancelQtyChange = (index: number, value: string, max: number) => {
    if (value === "") {
      setCancelInputs((p) => {
        const next = { ...p };
        delete next[index];
        return next;
      });
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setCancelInputs((p) => ({
      ...p,
      [index]: Math.min(Math.max(num, 0), max),
    }));
  };

  // Row click is a shortcut: select the whole remaining listed quantity, or
  // clear the category if a quantity is already selected.
  const toggleCancel = (index: number) => {
    // Sold units no longer lock a category — the backend cancels whatever is
    // still listed. Only a category with nothing left listed is untickable.
    const listed = listedByCategory[index] ?? 0;
    if (listed <= 0) return;
    setCancelInputs((p) => {
      const next = { ...p };
      if (Number(next[index] ?? 0) > 0) delete next[index];
      else next[index] = listed;
      return next;
    });
  };

  const hasAnyCancelSelection = Object.values(cancelInputs).some(
    (v) => Number(v) > 0,
  );

  const handleCancel = async (cancelAll = false) => {
    try {
      if (!plan.length) {
        showErrorNotification("Asset does not support sub-share cancellation");
        return;
      }

      // A partially sold category is still cancellable — the backend cancels
      // whatever quantity is still listed. Only a category with nothing left
      // listed (i.e. sold out) has nothing to cancel.
      const listedIndexes = plan
        .map((_, i) => i)
        .filter((i) => (listedByCategory[i] ?? 0) > 0);

      // What to cancel: the full remaining quantity of every listed category,
      // or the per-category quantities picked in the table.
      const subsharesListing = (
        cancelAll
          ? listedIndexes.map((i) => ({
              subShareIndex: i,
              quantity: listedByCategory[i] ?? 0,
            }))
          : listedIndexes.map((i) => ({
              subShareIndex: i,
              quantity: Math.min(
                Number(cancelInputs[i] ?? 0),
                listedByCategory[i] ?? 0,
              ),
            }))
      ).filter((t) => t.quantity > 0);

      if (subsharesListing.length === 0) {
        showErrorNotification(
          cancelAll
            ? "Nothing to cancel — all units are sold out."
            : "Enter a quantity to cancel for at least one category.",
        );
        return;
      }

      // The backend's `cancelAll` path cancels the whole listing and rejects
      // any category that has sold units, so it is a true "cancel all" only
      // when every listed category is being cancelled in full AND none of them
      // has sold anything. Otherwise send the per-category quantities, which
      // the backend accepts regardless of sales (partial quantities included).
      const isFullCancel =
        subsharesListing.length === listedIndexes.length &&
        listedIndexes.every((i) => {
          const target = subsharesListing.find((t) => t.subShareIndex === i);
          return (
            !!target &&
            target.quantity === (listedByCategory[i] ?? 0) &&
            (soldByCategory[i] ?? 0) === 0
          );
        });

      setActionLoading("cancel");

      // The backend performs the on-chain cancellation itself.
      await api.post(
        "/sales/cancel",
        {
          landId: data.landId,
          cancelAll: isFullCancel,
          subsharesListing: isFullCancel ? undefined : subsharesListing,
        },
        // Backend cancels on-chain, which can exceed the 15s default timeout —
        // otherwise a successful post throws and wrongly surfaces a failure
        // notification.
        { timeout: 60000 },
      );

      setCancelInputs({});
      showSuccessNotification("Listing cancelled successfully");
      router.push("/?tab=fractionalization");
    } catch (err) {
      console.error("Cancel listing failed:", err);
      showErrorNotification(apiErrorMessage(err, "Cancel failed. See console."));
    } finally {
      setActionLoading(null);
    }
  };

  const openTransferModal = async () => {
    setShowTransferModal(true);
    setTransferStep(1);
    setSelectedUser(null);
    setTransferSearch("");
    setPaymentDetails({
      paymentAmount: "",
      paymentMethod: "",
      paymentDate: "",
      paymentTxId: "",
      paymentStatus: "",
    });
    try {
      setUsersLoading(true);
      // Walks every page — a single page:1/limit:50 request silently hid any
      // KYC-approved user past the 50th from this picker.
      const list = await fetchAllPages<KycUser>("/admin/admin/kyc-users");
      setTransferUsers(list);
    } catch {
      setTransferUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser) return;
    const toWallet = selectedUser.aaWalletAddress;
    if (!toWallet) {
      showErrorNotification("Selected user has no AA wallet.");
      return;
    }

    const subshares: { subShareIndex: number; quantity: number }[] = [];
    Object.entries(inputs).forEach(([index, qty]) => {
      const q = Number(qty);
      if (q > 0) {
        subshares.push({ subShareIndex: Number(index), quantity: q });
      }
    });
    if (!subshares.length) {
      showErrorNotification("Select at least one token to transfer.");
      return;
    }
    const {
      paymentAmount,
      paymentMethod,
      paymentDate,
      paymentStatus,
      paymentTxId,
    } = paymentDetails;
    if (!paymentAmount || !paymentMethod || !paymentDate || !paymentStatus) {
      showErrorNotification("Fill all required payment details.");
      return;
    }

    try {
      setTransferLoading(true);
      // The backend submits the createTransferRequest UserOp itself — the
      // frontend only posts the request details.
      await api.post(
        "/admin/distribution-request",
        {
          to: toWallet,
          nftAddress: data.nftAddress,
          subshares,
          paymentAmount: Number(paymentAmount),
          paymentMethod,
          paymentDate,
          paymentStatus,
          paymentTxId: paymentTxId || undefined,
        },
        { timeout: 60000 },
      );

      showSuccessNotification("Transfer request submitted successfully.");
      setShowTransferModal(false);
      setInputs({});
    } catch (err) {
      console.error("[Transfer] failed:", err);
      showErrorNotification(apiErrorMessage(err, "Transfer failed. See console for details."));
    } finally {
      setTransferLoading(false);
    }
  };

  const value: ListingTransferCtxValue = {
    data,
    plan,
    inputs,
    setInputs,
    handleInputChange,
    hasAnyInput,
    totalShares,
    Aby,
    listedFlats,
    listedByCategory,
    soldByCategory,
    sidebarTab,
    setSidebarTab,
    expiryDate,
    setExpiryDate,
    actionLoading,
    handleList,
    cancelInputs,
    setCancelInputs,
    handleCancelQtyChange,
    toggleCancel,
    hasAnyCancelSelection,
    handleCancel,
    showTransferModal,
    setShowTransferModal,
    transferStep,
    setTransferStep,
    transferUsers,
    transferSearch,
    setTransferSearch,
    selectedUser,
    setSelectedUser,
    transferLoading,
    usersLoading,
    paymentDetails,
    setPaymentDetails,
    openTransferModal,
    handleTransfer,
  };

  return (
    <ListingTransferCtx.Provider value={value}>
      {children}
    </ListingTransferCtx.Provider>
  );
}

/* ================================================================
   LEFT — Investment Options table (with quantity steppers)
   ================================================================ */
export function InvestmentOptionsTable() {
  const {
    data,
    plan,
    inputs,
    setInputs,
    handleInputChange,
    totalShares,
    Aby,
    listedFlats,
    listedByCategory,
    soldByCategory,
    sidebarTab,
    cancelInputs,
    setCancelInputs,
    handleCancelQtyChange,
    toggleCancel,
  } = useListingTransfer();

  const isCancel = sidebarTab === "cancel";

  return (
    <div className="bg-surface rounded-xl border border-hairline shadow-sm p-6">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-5">
        {isCancel
          ? "Cancel Listing — Select Quantities"
          : "Investment Options"}
      </h3>

      {isCancel ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-hairline text-xs uppercase tracking-wider text-muted">
                <th className="pb-3 text-left font-medium">Category</th>
                <th className="pb-3 text-center font-medium">Sold</th>
                <th className="pb-3 text-center font-medium">Remaining</th>
                <th className="pb-3 text-right font-medium">Cancel Qty</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-hairline">
              {plan.map((share, index) => {
                const listed = listedByCategory[index] ?? 0;
                const sold = soldByCategory[index] ?? 0;
                // Partially sold categories stay cancellable; only a category
                // with nothing left listed is locked.
                const locked = listed <= 0;
                const cancelQty = Number(cancelInputs[index] ?? 0);
                const selected = cancelQty > 0;

                return (
                  <tr
                    key={index}
                    className={`transition ${
                      locked
                        ? "opacity-60"
                        : selected
                          ? "bg-loss-bg "
                          : "hover:bg-raised "
                    }`}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <MdInventory2 className="text-muted text-lg" />
                        <div>
                          <p className="font-semibold text-heading flex items-center gap-1.5">
                            Category {index + 1}
                            {locked && (
                              <FiLock
                                className="text-muted"
                                title="Nothing left to cancel — sold out"
                              />
                            )}
                          </p>
                          <p className="text-xs text-muted">
                            Price: ₹{share.price}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-center text-sm font-medium">
                      <span
                        className={
                          sold > 0
                            ? "text-warn "
                            : "text-muted"
                        }
                      >
                        {sold}
                      </span>
                    </td>

                    <td className="py-4 text-center text-sm font-medium text-body">
                      {Math.max(listed - cancelQty, 0)}
                    </td>

                    <td className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center border border-hairline rounded-lg overflow-hidden">
                          <button
                            type="button"
                            disabled={locked || cancelQty === 0}
                            onClick={() =>
                              setCancelInputs((p) => ({
                                ...p,
                                [index]: Math.max(cancelQty - 1, 0),
                              }))
                            }
                            className="w-9 h-9 flex items-center justify-center text-body hover:bg-surface-hover disabled:opacity-40"
                          >
                            <HiMinus />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={listed}
                            disabled={locked}
                            value={cancelQty}
                            onChange={(e) =>
                              handleCancelQtyChange(
                                index,
                                e.target.value,
                                listed,
                              )
                            }
                            className="w-12 h-9 text-center text-sm font-semibold text-heading border-x border-hairline focus:outline-none disabled:opacity-40"
                          />

                          <button
                            type="button"
                            disabled={locked || cancelQty >= listed}
                            onClick={() =>
                              setCancelInputs((p) => ({
                                ...p,
                                [index]: Math.min(cancelQty + 1, listed),
                              }))
                            }
                            className="w-9 h-9 flex items-center justify-center bg-loss hover:bg-loss text-white disabled:opacity-40"
                          >
                            <HiPlus />
                          </button>
                        </div>

                        {/* Fixed size so the stepper stays aligned across
                            rows as the label flips between All / Clear. */}
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => toggleCancel(index)}
                          title={
                            selected
                              ? "Clear this category"
                              : "Cancel all remaining units in this category"
                          }
                          className={`h-9 w-16 shrink-0 rounded-lg border text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                            selected
                              ? "border-hairline text-body hover:bg-surface-hover   "
                              : "border-loss text-loss hover:bg-loss-bg   "
                          }`}
                        >
                          {selected ? "Clear" : "All"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-hairline text-xs uppercase tracking-wider text-muted">
              <th className="pb-3 text-left font-medium">Share</th>
              <th className="pb-3 text-center font-medium">Available</th>
              <th className="pb-3 text-center font-medium">APY</th>
              <th className="pb-3 text-right font-medium">Quantity</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-hairline">
            {plan.map((share, index) => {
              const value = (inputs[index] as number) || 0;
              const available = Number(share.share ?? 0);
              const disabled = available === 0;

              return (
                <tr key={index} className={disabled ? "opacity-50" : ""}>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <MdInventory2 className="text-muted text-lg" />
                      <div>
                        <p className="font-semibold text-heading">
                          Share {index + 1}
                        </p>
                        <p className="text-xs text-muted">
                          Price: ₹{share.price}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 text-center text-sm font-medium text-body">
                    {available}
                  </td>

                  <td className="py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gain">
                      <FiTrendingUp />
                      {share.aby || Aby}
                    </span>
                  </td>

                  <td className="py-4">
                    <div className="flex justify-end">
                      <div className="flex items-center border border-hairline rounded-lg overflow-hidden">
                        <button
                          type="button"
                          disabled={disabled || value === 0}
                          onClick={() =>
                            setInputs((p) => ({
                              ...p,
                              [index]: Math.max(value - 1, 0),
                            }))
                          }
                          className="w-9 h-9 flex items-center justify-center text-body hover:bg-surface-hover disabled:opacity-40"
                        >
                          <HiMinus />
                        </button>

                        <input
                          type="number"
                          min={0}
                          max={available}
                          value={value}
                          onChange={(e) =>
                            handleInputChange(index, e.target.value, available)
                          }
                          className="w-12 h-9 text-center text-sm font-semibold text-heading border-x border-hairline focus:outline-none"
                        />

                        <button
                          type="button"
                          disabled={disabled || value >= available}
                          onClick={() =>
                            setInputs((p) => ({
                              ...p,
                              [index]: Math.min(value + 1, available),
                            }))
                          }
                          className="gold-gradient w-9 h-9 flex items-center justify-center disabled:opacity-40"
                        >
                          <HiPlus />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <div className="mt-6 pt-6 border-t border-hairline grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="text-sm text-muted mb-1">Avalable Shares</p>
          <p className="text-xl font-bold text-heading">
            {totalShares}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted mb-1">Revenue %</p>
          <p className="text-xl font-bold text-heading">
            {data.revenuePercentage}%
          </p>
        </div>
        <div>
          <p className="text-sm text-muted mb-1">Total Shares</p>
          <p className="text-xl font-bold text-heading">
            {data.totalFractions}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted mb-1">Listed</p>
          <p className="text-xl font-bold text-heading">
            {listedFlats}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   RIGHT — Listing / Transfer action card + transfer modal
   ================================================================ */
export function ListingActionCard() {
  const {
    inputs,
    hasAnyInput,
    sidebarTab,
    setSidebarTab,
    expiryDate,
    setExpiryDate,
    actionLoading,
    handleList,
    cancelInputs,
    listedByCategory,
    hasAnyCancelSelection,
    handleCancel,
    showTransferModal,
    setShowTransferModal,
    transferStep,
    setTransferStep,
    transferUsers,
    transferSearch,
    setTransferSearch,
    selectedUser,
    setSelectedUser,
    transferLoading,
    usersLoading,
    paymentDetails,
    setPaymentDetails,
    openTransferModal,
    handleTransfer,
  } = useListingTransfer();

  /* Transfer and Cancel both operate on the Investment Options table in the
     left column, so selecting either tab brings that table into view. Skipped
     on first render and for the Listing tab, which needs no context. */
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (sidebarTab !== "transfer" && sidebarTab !== "cancel") return;

    const target = document.getElementById("investment-options");
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }, [sidebarTab]);

  return (
    <>
      <div className="bg-surface rounded-lg border border-hairline shadow-md overflow-hidden">
        {/* TAB HEADER — segmented control, matching the category tabs on the
            Users and Properties tabs. Cancel keeps a loss-toned active state
            because it is the destructive branch. */}
        <div className="flex gap-1 border-b border-hairline bg-raised p-1.5">
          {(["listing", "transfer", "cancel"] as const).map((tab) => {
            const active = sidebarTab === tab;
            const activeClass =
              tab === "cancel"
                ? "bg-loss-bg text-loss"
                : "gold-gradient shadow-sm";
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 rounded-sm py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? activeClass
                    : "text-muted hover:bg-surface-hover hover:text-heading"
                }`}
              >
                {tab === "listing"
                  ? "Listing"
                  : tab === "transfer"
                    ? "Transfer"
                    : "Cancel"}
              </button>
            );
          })}
        </div>

        {/* LISTING TAB HEADER */}
        {sidebarTab === "listing" && (
          <div className="p-6 border-b border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <MdVerifiedUser className="text-gain text-lg" />
              <span className="text-xs uppercase tracking-widest text-muted">
                Listing Workflow
              </span>
            </div>
            <h3 className="text-xl font-bold text-heading">
              Ready to List
            </h3>
            <p className="text-sm text-muted mt-1">
              Select quantities and an expiry date to publish this property.
            </p>
          </div>
        )}

        {/* TRANSFER TAB */}
        {sidebarTab === "transfer" && (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">
                Transfer Tokens
              </p>
              <h3 className="text-xl font-bold text-heading">
                Send to a User
              </h3>
              <p className="text-sm text-muted mt-1">
                Select token quantities from the table, then click Transfer.
              </p>
            </div>

            {hasAnyInput ? (
              <div className="rounded-lg border border-accent/40 bg-accent-bg px-4 py-3 text-sm text-accent-text">
                {Object.entries(inputs)
                  .filter(([, q]) => typeof q === "number" && q > 0)
                  .map(([idx, qty]) => (
                    <div key={idx}>
                      Category {Number(idx) + 1}:{" "}
                      <span className="font-semibold">
                        {qty} token{Number(qty) > 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-hairline px-4 py-4 text-sm text-muted text-center">
                No tokens selected. Use the +/− controls on the left to choose
                quantities.
              </div>
            )}

            <button
              type="button"
              disabled={!hasAnyInput}
              onClick={() => void openTransferModal()}
              className="gold-gradient flex w-full items-center justify-center gap-2 rounded-md py-3.5 font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiArrowRight className="text-lg" />
              Transfer
            </button>
          </div>
        )}

        {/* CANCEL TAB */}
        {sidebarTab === "cancel" && (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">
                Cancel Listing
              </p>
              <h3 className="text-xl font-bold text-heading">
                Remove from Marketplace
              </h3>
              <p className="text-sm text-muted mt-1">
                Set how many units to cancel per category in the table on the
                left, or cancel every remaining unit at once.
              </p>
            </div>

            {hasAnyCancelSelection ? (
              <div className="rounded-lg border border-loss bg-loss-bg px-4 py-3 text-sm text-loss">
                {Object.entries(cancelInputs)
                  .filter(([, qty]) => Number(qty) > 0)
                  .map(([idx, qty]) => (
                    <div key={idx}>
                      <span className="font-semibold">{Number(qty)}</span> of{" "}
                      <span className="font-semibold">
                        {listedByCategory[Number(idx)] ?? 0}
                      </span>{" "}
                      units in Category{" "}
                      <span className="font-semibold">{Number(idx) + 1}</span>{" "}
                      will be cancelled
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-hairline px-4 py-4 text-sm text-muted text-center">
                No units selected. Set a cancel quantity on the left, or use
                “Cancel Entire Listing” below.
              </div>
            )}

            <button
              type="button"
              disabled={!hasAnyCancelSelection || actionLoading !== null}
              onClick={() => void handleCancel(false)}
              className="w-full py-3.5 rounded-xl font-semibold bg-loss hover:bg-loss text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading === "cancel" ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cancelling…
                </>
              ) : (
                <>
                  <FiXCircle className="text-lg" />
                  Cancel Selected Units
                </>
              )}
            </button>

            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={() => void handleCancel(true)}
              className="w-full py-3 rounded-xl font-semibold border border-loss text-loss hover:bg-loss-bg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FiXCircle className="text-lg" />
              Cancel Entire Listing
            </button>
          </div>
        )}

        {/* LISTING STEPS */}
        {sidebarTab === "listing" && (
          <>
            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-surface border-hairline">
                <div className="flex items-center gap-3">
                  <FiUpload className="text-lg text-heading" />
                  <div>
                    <p className="font-semibold text-heading">
                      List on Marketplace
                    </p>
                    <p className="text-xs text-muted">
                      Publish shares for investors
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-heading">
                  Available
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-body">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-hairline text-sm text-heading focus:outline-none focus:ring-2 focus:ring-accent dark:[color-scheme:dark]"
                />
                <p className="text-[11px] text-muted">
                  Property will be active until this date
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="p-6 bg-raised">
              <button
                onClick={handleList}
                disabled={
                  actionLoading !== null || !hasAnyInput || !expiryDate
                }
                className={`gold-gradient flex w-full items-center justify-center gap-2 rounded-md py-3.5 font-semibold transition-all active:scale-[0.99] ${
                  actionLoading || !hasAnyInput
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    List Property
                    <FiArrowRight className="text-lg" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-muted text-center mt-3 leading-relaxed">
                Listing is submitted to the backend, which publishes the
                fractions on-chain.
              </p>
            </div>
          </>
        )}
      </div>

      {/* TRUST FOOTER */}
      <div className="flex justify-center gap-6 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <FiCheckCircle className="text-gain" />
          On-chain
        </div>
        <div className="flex items-center gap-1.5">
          <FiLock className="text-muted" />
          Secure
        </div>
        <div className="flex items-center gap-1.5">
          <MdVerifiedUser className="text-accent-text" />
          Verified
        </div>
      </div>

      {/* ===================== TRANSFER MODAL ===================== */}
      {showTransferModal && (
        /* Right-side drawer, portalled to <body> by SlideOver so no ancestor
           (sticky/blurred sidebar) can clip it. Closing is blocked while the
           transfer request is running. */
        <SlideOver
          onClose={() => setShowTransferModal(false)}
          busy={transferLoading}
          size="max-w-2xl"
          label="Transfer tokens"
        >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-hairline shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      transferStep === 1
                        ? "bg-accent text-on-accent"
                        : "bg-accent-bg text-accent-text"
                    }`}
                  >
                    1
                  </span>
                  <span className="text-xs text-muted">
                    Select Recipient
                  </span>
                  <span className="text-xs text-faint mx-1">›</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      transferStep === 2
                        ? "bg-accent text-on-accent"
                        : "bg-surface-hover text-muted "
                    }`}
                  >
                    2
                  </span>
                  <span className="text-xs text-muted">
                    Payment Details
                  </span>
                </div>
                <h2 className="text-lg font-bold text-heading">
                  {transferStep === 1 ? "Select Recipient" : "Payment Details"}
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  {transferStep === 1
                    ? "Choose a KYC-verified user to receive the tokens."
                    : "Enter the payment information for this distribution."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-muted hover:text-body text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* STEP 1 — User selection */}
            {transferStep === 1 && (
              <>
                <div className="px-6 pt-4 shrink-0">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-input text-sm text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                  {usersLoading ? (
                    <div className="flex justify-center py-10">
                      <span className="h-7 w-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : transferUsers.length === 0 ? (
                    <p className="text-center text-sm text-muted py-10">
                      No users found.
                    </p>
                  ) : (
                    transferUsers
                      .filter((u) => {
                        const q = transferSearch.toLowerCase();
                        const name =
                          u.name ??
                          `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
                        return (
                          !q ||
                          name.toLowerCase().includes(q) ||
                          u.email?.toLowerCase().includes(q)
                        );
                      })
                      .map((u) => {
                        const name =
                          (u.name ??
                            `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()) ||
                          "—";
                        const isSelected = selectedUser?.id === u.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() =>
                              setSelectedUser(isSelected ? null : u)
                            }
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition ${
                              isSelected
                                ? "border-accent bg-accent-bg "
                                : "border-hairline hover:border-hairline hover:bg-raised  "
                            }`}
                          >
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                isSelected
                                  ? "bg-accent text-on-accent"
                                  : "bg-surface-hover text-body  "
                              }`}
                            >
                              {name[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-heading truncate">
                                {name}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {u.email ?? "—"}
                              </p>
                              {u.aaWalletAddress && (
                                <p className="text-[11px] font-mono text-muted truncate">
                                  {u.aaWalletAddress.slice(0, 10)}...
                                  {u.aaWalletAddress.slice(-6)}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <FiCheckCircle className="shrink-0 text-accent-text text-xl" />
                            )}
                          </button>
                        );
                      })
                  )}
                </div>

                <div className="px-6 py-4 border-t border-hairline shrink-0 space-y-3">
                  {selectedUser && (
                    <div className="rounded-lg bg-accent-bg border border-accent/40 px-4 py-2.5 text-sm text-accent-text">
                      Transferring to:{" "}
                      <span className="font-semibold">
                        {selectedUser.name ??
                          `${selectedUser.firstName ?? ""} ${
                            selectedUser.lastName ?? ""
                          }`.trim()}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!selectedUser}
                    onClick={() => setTransferStep(2)}
                    className="gold-gradient flex w-full items-center justify-center gap-2 rounded-md py-3.5 font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiArrowRight />
                    Next: Payment Details
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 — Payment details */}
            {transferStep === 2 && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div className="rounded-xl bg-accent-bg border border-accent/40 px-4 py-3">
                    <p className="text-xs text-accent-text font-semibold uppercase tracking-wider mb-0.5">
                      Recipient
                    </p>
                    <p className="text-sm font-bold text-accent-text">
                      {selectedUser?.name ??
                        `${selectedUser?.firstName ?? ""} ${
                          selectedUser?.lastName ?? ""
                        }`.trim()}
                    </p>
                    <p className="text-xs font-mono text-accent-text mt-0.5">
                      {selectedUser?.aaWalletAddress}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1.5">
                      Payment Amount (₹) <span className="text-loss">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50000"
                      value={paymentDetails.paymentAmount}
                      onChange={(e) =>
                        setPaymentDetails((p) => ({
                          ...p,
                          paymentAmount: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-input text-sm text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1.5">
                      Payment Method <span className="text-loss">*</span>
                    </label>
                    <Select
                      aria-label="Payment method"
                      value={paymentDetails.paymentMethod}
                      onChange={(v) =>
                        setPaymentDetails((p) => ({ ...p, paymentMethod: v }))
                      }
                      placeholder="Select method…"
                      size="md"
                      options={PAYMENT_METHOD_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1.5">
                      Payment Date <span className="text-loss">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDetails.paymentDate}
                      onChange={(e) =>
                        setPaymentDetails((p) => ({
                          ...p,
                          paymentDate: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-input text-sm text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1.5">
                      Payment Status <span className="text-loss">*</span>
                      {paymentDetails.paymentStatus ? (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            PAYMENT_STATUS_BADGE[paymentDetails.paymentStatus] ?? ""
                          }`}
                        >
                          {PAYMENT_STATUS_OPTIONS.find((o) => o.value === paymentDetails.paymentStatus)?.label}
                        </span>
                      ) : null}
                    </label>
                    <Select
                      aria-label="Payment status"
                      value={paymentDetails.paymentStatus}
                      onChange={(v) =>
                        setPaymentDetails((p) => ({ ...p, paymentStatus: v }))
                      }
                      placeholder="Select status…"
                      size="md"
                      options={PAYMENT_STATUS_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-body mb-1.5">
                      Payment Tx ID{" "}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI ref / bank ref number"
                      value={paymentDetails.paymentTxId}
                      onChange={(e) =>
                        setPaymentDetails((p) => ({
                          ...p,
                          paymentTxId: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-hairline bg-surface-input text-sm text-heading placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-hairline shrink-0 flex gap-3">
                  <button
                    type="button"
                    disabled={transferLoading}
                    onClick={() => setTransferStep(1)}
                    className="flex-1 py-3.5 rounded-xl font-semibold border border-hairline text-body hover:bg-raised transition disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={
                      !paymentDetails.paymentAmount ||
                      !paymentDetails.paymentMethod ||
                      !paymentDetails.paymentDate ||
                      !paymentDetails.paymentStatus ||
                      transferLoading
                    }
                    onClick={() => void handleTransfer()}
                    className="gold-gradient flex flex-1 items-center justify-center gap-2 rounded-md py-3.5 font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transferLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <FiArrowRight />
                        Confirm Transfer
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
        </SlideOver>
      )}
    </>
  );
}
