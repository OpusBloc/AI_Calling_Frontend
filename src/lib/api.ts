import axios, { type AxiosInstance } from "axios";
import { getToken, clearToken } from "./auth";
import { getDeviceId } from "@/utils/device";
import { API_CONFIG } from "@/constant";

/**
 * Builds an axios instance with the shared auth behaviour: JWT + device ID on
 * every request, and a global 401 handler.
 *
 * The admin panel talks to two deployed services: the main backend, and the
 * channel-partner service, which now runs from its own repository and process
 * (`cp-backend`, dev :3001). Both verify the same admin JWT against a shared
 * JWT_SECRET, so they differ only in base URL.
 */
const createApi = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    withCredentials: false,
    timeout: 30000, // 30s — prevents auth from hanging forever on bad networks or mixed-content blocks
  });

  // 🔐 Attach JWT + Device ID (SINGLE SOURCE OF TRUTH)
  instance.interceptors.request.use(
    (config) => {
      const token = getToken();

      if (config.headers) {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 🔥 Required for device-based auth / 2FA
        config.headers["x-device-id"] = getDeviceId();
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // 🚫 Global auth error handler
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        clearToken();
        // optional redirect
        window.location.href = "/auth/login";
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

/** Main backend — everything except `/channel-partner/*`. */
export const api = createApi(API_CONFIG.BASE_URL);

/**
 * The channel-partner service — separate repo, separate host.
 *
 * Every `/channel-partner/*` route belongs here, the `admin/` tree included:
 * partners, agreements, commission / milestone / reward rules, brochures and
 * payouts. The main backend no longer defines any of them, so the same call
 * made through `api` answers 404 rather than data.
 *
 * Paths stay exactly as the controller declares them, prefix and all, e.g.
 * `channelPartnerApi.get("/channel-partner/admin/partners")`.
 */
export const channelPartnerApi = createApi(API_CONFIG.CHANNEL_PARTNER_BASE_URL);
