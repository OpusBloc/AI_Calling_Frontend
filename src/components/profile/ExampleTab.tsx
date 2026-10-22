"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useAuth } from "@/hooks/useAuth";
import { Badge, Button, Card, CardHeader, ErrorState, Skeleton } from "@/components/ui";

/**
 * Template for a new dashboard tab. Copy this file, rename it, and replace the
 * request with your feature's endpoint. Shows the house patterns: `api` (main
 * backend) or `channelPartnerApi` (`/channel-partner/*`), loading skeleton,
 * backend error message, and `readOnly` for ADMINISTRATIVE.
 */
export default function ExampleTab({ readOnly = false }: { readOnly?: boolean }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/auth/profile");
      setProfile((res.data?.data ?? res.data) as Record<string, unknown>);
    } catch (e) {
      setError(apiErrorMessage(e, "Couldn't load your profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Example tab</h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as {user?.name || user?.email || "—"}{" "}
          <Badge tone={readOnly ? "warn" : "accent"}>{readOnly ? "Read-only" : String(user?.role ?? "")}</Badge>
        </p>
      </div>

      <Card>
        <CardHeader
          title="Your profile"
          description="GET /auth/profile — replace with your feature's endpoint."
          action={
            <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          }
        />
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : (
            <pre className="max-h-80 overflow-auto rounded-md bg-raised p-3 text-xs text-body">
              {JSON.stringify(profile, null, 2)}
            </pre>
          )}
        </div>
      </Card>
    </div>
  );
}
