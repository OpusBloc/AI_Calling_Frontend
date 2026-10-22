export const API_CONFIG = {
  BASE_URL:
    process.env.NEXT_PUBLIC_BACKEND_URL || "https://43.204.62.3/production",

  /**
   * The channel-partner service — its own repository and process (`cp-backend`,
   * dev :3001). Every `/channel-partner/*` route has been removed from the main
   * backend, so this has to address that service directly.
   *
   * It deliberately no longer falls back to NEXT_PUBLIC_BACKEND_URL. That
   * fallback was right while the split was in progress; now it would send every
   * partner request to a backend that no longer defines those routes, and a 404
   * reads in these tabs as "this partner has nothing" rather than as a
   * misconfigured deployment. An unset variable lands on the dev port instead,
   * which is correct locally and fails loudly (connection refused) anywhere else.
   */
  CHANNEL_PARTNER_BASE_URL:
    process.env.NEXT_PUBLIC_CHANNEL_PARTNER_BACKEND_URL ||
    "http://localhost:3001",
};
