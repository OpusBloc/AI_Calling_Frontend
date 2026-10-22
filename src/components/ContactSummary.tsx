"use client";

import { FiMail, FiPhone } from "react-icons/fi";

export type ContactInfo = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * A person shown by who they are — name first, then email and phone — with the
 * opaque id demoted to a small caption. Used where admin lists used to show
 * only a shortened UUID (fraud flags, audit log).
 *
 * The name falls back to the email, then the phone, so there is always a
 * readable headline when any contact detail exists.
 */
export default function ContactSummary({
  contact,
  caption,
  loading = false,
  compact = false,
}: {
  contact?: ContactInfo | null;
  /** Secondary identifier, e.g. "PARTNER_1" or "REF_936389". */
  caption?: string | null;
  loading?: boolean;
  /** Single line under the name instead of one line per detail. */
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        <span className="block h-3.5 w-28 animate-pulse rounded bg-raised" />
        <span className="block h-3 w-36 animate-pulse rounded bg-raised" />
      </div>
    );
  }

  const name = contact?.name?.trim() || null;
  const email = contact?.email?.trim() || null;
  const phone = contact?.phone?.trim() || null;
  const headline = name ?? email ?? phone;

  if (!headline) {
    return (
      <div>
        <p className="text-sm text-muted">No contact details</p>
        {caption ? <p className="font-mono text-[11px] text-faint">{caption}</p> : null}
      </div>
    );
  }

  // Don't repeat the detail that is already the headline.
  const showEmail = email && email !== headline;
  const showPhone = phone && phone !== headline;

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-heading" title={headline}>
        {headline}
      </p>
      {compact ? (
        showEmail || showPhone ? (
          <p className="truncate text-xs text-muted">
            {[showEmail ? email : null, showPhone ? phone : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null
      ) : (
        <>
          {showEmail ? (
            <p className="flex items-center gap-1.5 truncate text-xs text-body" title={email}>
              <FiMail className="h-3 w-3 shrink-0 text-muted" />
              {email}
            </p>
          ) : null}
          {showPhone ? (
            <p className="flex items-center gap-1.5 text-xs text-body">
              <FiPhone className="h-3 w-3 shrink-0 text-muted" />
              {phone}
            </p>
          ) : null}
        </>
      )}
      {caption ? (
        <p className="mt-0.5 font-mono text-[11px] text-faint">{caption}</p>
      ) : null}
    </div>
  );
}
