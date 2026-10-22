/**
 * Human names for the screen / page keys the website and app trackers record
 * (their `describeRoute`: dynamic segments become `[id]`), so admins read
 * "Property details" instead of "/fractional-marketplace/[id]".
 *
 * A key can carry scopes after `#`:
 *   app    `<screen>#modal:<name>`   a popup (AppModal trackName)
 *          `<key>#header` / `#footer` the fixed top / bottom bar of a screen or popup
 *   web    `<page>#overlay`          fixed layers (header, menus, popups)
 * e.g. "/fractional-marketplace/[id]#modal:select_tokens#footer"
 *   → "Property details · Select tokens popup · Bottom bar".
 *
 * Unknown keys still read well: the path is turned into words.
 */

const PAGES: Record<string, string> = {
  "/": "Home",
  "/marketPlace": "Marketplace",
  "/fractional-marketplace/[id]": "Property details",
  "/property/[id]": "My property",
  "/property/[id]/cancel": "Cancel listing",
  "/fractionalization": "List a property",
  "/activity": "Activity",
  "/notifications": "Notifications",
  "/profile": "Profile",
  "/user": "Profile",
  "/kyc": "KYC verification",
  "/refunds": "Refunds & cancellations",
  "/pre-booking-refunds": "Pre-booking refunds",
  "/tickets": "Rewards",
  "/news": "News",
  "/news/[id]": "News article",
  "/faq": "FAQs",
  "/contact-us": "Contact us",
  "/terms": "Terms & conditions",
  "/privacy": "Privacy policy",
  "/auth/login": "Login",
  "/auth/otp": "OTP verification",
  "/auth/forgot-password": "Forgot password",
  "/auth/email": "Email verification",
  "/auth/verify-phone": "Phone verification",
  "/auth/logout": "Logout",
  "/partner": "Partner home",
  "/partner/activation": "Partner activation",
  "/partner/success": "Partner activated",
  "/partner/market": "Partner market",
  "/partner/referrals": "Partner referrals",
  "/partner/notifications": "Partner notifications",
  "/partner/profile": "Partner profile",
  "/partner/property/[id]": "Partner property",
  "/partner/brochure/[id]": "Partner brochure",
  "/partner/referral/[id]": "Referral details",
};

/** App popups by their AppModal `trackName`. */
const POPUPS: Record<string, string> = {
  filters: "Filters",
  sort: "Sort",
  select_tokens: "Select tokens",
  buy: "Buy",
  prebook: "Pre-book",
  documents: "Documents",
  gallery: "Photo gallery",
  description: "Description",
  cancel: "Cancel",
  expiry: "Listing expiry",
  returns_info: "Returns info",
  graph_info: "Graph info",
  kyc_required: "KYC required",
  bank_required: "Bank details required",
  phone_required: "Phone required",
  account_picker: "Account switcher",
  account_switching: "Switching account",
};

const BARS: Record<string, string> = {
  header: "Top bar",
  footer: "Bottom bar",
  overlay: "Fixed header & popups",
};

const words = (s: string) =>
  s
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

/** "/fractional-marketplace/[id]" → "Property details". */
export function pageName(path: string | null | undefined): string {
  const p = (path ?? "").trim();
  if (!p) return "Unknown page";
  if (PAGES[p]) return PAGES[p];
  // Unknown: last meaningful segments as words, "[id]" → "details".
  const parts = p.split("/").filter(Boolean);
  if (!parts.length) return "Home";
  const last = parts[parts.length - 1];
  return last === "[id]" && parts.length > 1
    ? `${words(parts[parts.length - 2])} details`
    : words(last);
}

/** One scope after "#": "modal:filters" → "Filters popup", "footer" → "Bottom bar". */
export function scopeName(scope: string): string {
  if (BARS[scope]) return BARS[scope];
  if (scope === "modal") return "Popup";
  if (scope.startsWith("modal:")) {
    const name = scope.slice("modal:".length);
    return `${POPUPS[name] ?? words(name)} popup`;
  }
  return words(scope);
}

/** A full tracked key, scopes included, as admins should read it. */
export function screenName(key: string | null | undefined): string {
  const [path, ...scopes] = (key ?? "").split("#");
  return [pageName(path), ...scopes.filter(Boolean).map(scopeName)].join(" · ");
}
