"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "./ui/utils";

/* --------------------------------- Data ---------------------------------- */

/**
 * Load data on mount and expose a `reload` for after mutations
 */
export function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

export * from "./ui/utils";
export * from "./ui/controls";
export * from "./ui/feedback";
export * from "./ui/navigation";
export * from "./ui/forms";
export * from "./ui/tables";