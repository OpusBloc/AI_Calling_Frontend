"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import clsx from "clsx";
import styles from "./skeleton.module.css";

export type SkeletonProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  className?: string;
};

export function useSkeletonVisibility(loading: boolean) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (loading) {
      if (visible) return;
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, 150);
      return () => window.clearTimeout(timer);
    }

    if (!visible) return;
    const remaining = Math.max(0, 300 - (Date.now() - shownAt.current));
    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, [loading, visible]);

  return visible;
}

export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx("block", styles.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/** Holds content loading indicators for 150ms before showing and 300ms after. */
export function SkeletonBoundary({
  loading,
  skeleton,
  children,
  className,
  as = "div",
  announcement,
}: {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  as?: ElementType;
  announcement?: ReactNode;
}) {
  const visible = useSkeletonVisibility(loading);

  if (as === "tbody") {
    if (loading && !visible) return <tbody className={className} />;
    return (
      <tbody
        className={className}
        aria-busy={visible ? "true" : undefined}
        aria-live={visible ? "polite" : undefined}
      >
        {visible ? announcement ?? <tr className="sr-only"><td>Loading…</td></tr> : null}
        {visible ? skeleton : children}
      </tbody>
    );
  }

  if (loading && !visible) return null;
  if (visible) {
    const Container = as;
    return (
      <Container className={className} aria-busy="true" aria-live="polite">
        {announcement ?? <span className="sr-only">Loading…</span>}
        {skeleton}
      </Container>
    );
  }
  return <>{children}</>;
}

export function RouteSkeleton({ children }: { children: ReactNode }) {
  const visible = useSkeletonVisibility(true);
  if (!visible) return null;
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}
