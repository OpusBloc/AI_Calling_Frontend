/**
 * Shown immediately while any route below the root layout loads, so clicking
 * a link to another page (property, user, trade, …) gives instant feedback
 * instead of looking like nothing happened.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-canvas" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}
