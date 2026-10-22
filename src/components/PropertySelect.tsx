"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";

/**
 * A live (APPROVED) fractionalized property, as returned by
 * GET /admin/admin/properties on the main backend.
 *
 * Two ids matter to callers: `landId` addresses property-scoped channel-partner
 * routes (brochures, QR), while `id` is the `fractionalizedAssetId` a commission
 * rule is scoped by.
 */
export type LiveProperty = {
  id: string;
  landId: string;
  buildingName?: string | null;
  city?: string | null;
  area?: string | null;
};

/** Human label for a property row, falling back to the landId. */
export const propertyLabel = (property: LiveProperty) => {
  const name = property.buildingName?.trim() || property.landId;
  const place = property.city?.trim() || property.area?.trim();
  return place ? `${name} — ${place}` : name;
};

/**
 * Loads the live properties once per mount. Only APPROVED assets come back —
 * the endpoint filters by status server-side — so the list is safe to offer as
 * "live properties" anywhere an admin would otherwise type a landId.
 */
export function useLiveProperties() {
  const [properties, setProperties] = useState<LiveProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/admin/properties", {
        params: { page: 1, limit: 100 },
      });
      const body = res.data?.data ?? res.data;
      const list: LiveProperty[] = Array.isArray(body) ? body : (body?.items ?? []);
      setProperties(list.filter((property) => property?.landId));
    } catch (error) {
      console.error("Failed to load properties:", error);
      // Non-fatal: the picker just stays empty and says so.
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { properties, loading, reload: load };
}

/**
 * Dropdown of live properties. `valueKey` picks which id the value carries:
 * "landId" for property-scoped routes, "id" for a fractionalizedAssetId.
 */
export default function PropertySelect({
  id,
  value,
  onChange,
  properties,
  loading = false,
  disabled = false,
  valueKey = "landId",
  placeholder = "Select a property",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  properties: LiveProperty[];
  loading?: boolean;
  disabled?: boolean;
  valueKey?: "landId" | "id";
  placeholder?: string;
  className?: string;
}) {
  const selectClass =
    className ??
    "mt-2 w-full rounded-2xl border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#111418] outline-none transition focus:border-[#2b8cee] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2a3b4d] dark:bg-[#101922] dark:text-white";

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className={selectClass}
    >
      <option value="">
        {loading
          ? "Loading properties..."
          : properties.length === 0
            ? "No live properties found"
            : placeholder}
      </option>
      {properties.map((property) => (
        <option key={property.id ?? property.landId} value={property[valueKey]}>
          {propertyLabel(property)}
        </option>
      ))}
    </select>
  );
}
