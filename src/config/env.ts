export const APP_CONFIG = {
  // Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local to point at a different
  // OAuth client (e.g. staging). Must be inlined at build time, so it has to
  // be referenced as a full literal — Next.js does not support
  // process.env[key] indirection for NEXT_PUBLIC_* vars.
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "571075156881-i9isam8en6nbraglr1lk34a6j2rqi55u.apps.googleusercontent.com",
};
