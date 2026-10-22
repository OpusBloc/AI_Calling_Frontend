import { API_CONFIG } from "@/constant";

export const PROPERTY_IMAGE_FALLBACK = "/assets/Background-New.png";

export const resolveImageUrl = (path?: string) => {
  if (!path) return PROPERTY_IMAGE_FALLBACK;

  // ✅ already full url (AWS, CDN, etc)
  if (path.startsWith("http")) return path;

  // ✅ relative path → attach backend base
  return `${API_CONFIG.BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
