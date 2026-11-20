"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FLAG = "play_login_intro";
const LOGO = 120;
const LOGO_SRC = "/Opus_bloc_loder_image.png";
const COVER = LOGO * 1.7;
const COVER_OFFSET = (LOGO - COVER) / 2;
const REVEAL_IN_DURATION = 650;
const REVEAL_OUT_DURATION = 520;

const waitForDashboardUI = () =>
  new Promise<HTMLElement | null>((resolve) => {
    const tick = () => {
      const dashboard = document.querySelector<HTMLElement>('[data-dashboard-ready="true"]');
      const costUiReady = document.querySelector('[data-dashboard-costs-error="true"], [data-costsplit-ready="true"]');
      const bounds = dashboard?.getBoundingClientRect();
      if (dashboard && costUiReady && bounds && bounds.width > 0 && bounds.height > 0) return resolve(dashboard);
      requestAnimationFrame(tick);
    };
    tick();
  });

export default function RevealLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const flyRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Re-check the flag on every route change (layout doesn't remount after login)
  useEffect(() => {
    if (pathname.startsWith("/auth")) return;
    try {
      if (!sessionStorage.getItem(FLAG)) return;
      sessionStorage.removeItem(FLAG);
      setActive(true);
    } catch {}
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const fly = flyRef.current;
    const backdrop = backdropRef.current;
    if (!fly || !backdrop) return;

    let cancelled = false;
    let dashboard: HTMLElement | null = null;
    const animations: Animation[] = [];

    const animate = (
      el: HTMLElement,
      frames: Keyframe[],
      options: KeyframeAnimationOptions
    ) => {
      const a = el.animate(frames, { fill: "forwards", ...options });
      animations.push(a);
      return a.finished;
    };

    const finish = () => {
      if (!cancelled) setActive(false);
    };
    (async () => {
      try {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const cover = fly.querySelector<HTMLElement>(".post-login-logo-cover");
        if (!cover) return;

        if (!reducedMotion) {
          const revealIn = cover.getAnimations()[0];
          if (revealIn) await revealIn.finished;
          else await new Promise((resolve) => window.setTimeout(resolve, REVEAL_IN_DURATION));
        }
        if (cancelled) return;

        // Keep the logo moving while the dashboard and cost summary load. Without
        // this, the intro finishes its first reveal and appears stuck on the logo.
        const waitingAnimation = !reducedMotion
          ? cover.animate(
              [
                { transform: "rotate(45deg) scaleY(0)" },
                { transform: "rotate(45deg) scaleY(1)" },
              ],
              {
                duration: 1100,
                direction: "alternate",
                iterations: Infinity,
                easing: "cubic-bezier(0.65,0,0.35,1)",
              },
            )
          : null;
        if (waitingAnimation) animations.push(waitingAnimation);

        dashboard = await waitForDashboardUI();
        if (cancelled || !dashboard) return;

        waitingAnimation?.cancel();
        cover.style.transform = "rotate(45deg) scaleY(0)";

        dashboard.style.opacity = "0";
        if (!reducedMotion) {
          const revealOut = cover.animate(
            [
              { transform: "rotate(45deg) scaleY(0)" },
              { transform: "rotate(45deg) scaleY(1)" },
            ],
            { duration: REVEAL_OUT_DURATION, easing: "cubic-bezier(0.65,0,0.35,1)", fill: "forwards" },
          );
          animations.push(revealOut);
          await revealOut.finished;
        }
        if (cancelled) return;

        await Promise.all([
          animate(fly, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 }),
          animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 }),
          animate(dashboard, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 }),
        ]);
        if (cancelled) return;

        dashboard.style.opacity = "1";
      } catch {
        // animations cancelled
      } finally {
        if (dashboard) dashboard.style.opacity = "";
        finish();
      }
    })();

    return () => {
      cancelled = true;
      animations.forEach((a) => a.cancel());
      if (dashboard) dashboard.style.opacity = "";
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9999]" aria-hidden>
      <style>{`
        @keyframes opus-cover {
          from { transform: rotate(45deg) scaleY(1); }
          to { transform: rotate(45deg) scaleY(0); }
        }
        .post-login-logo-cover {
          transform-origin: center;
          animation: opus-cover ${REVEAL_IN_DURATION}ms cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .post-login-logo-cover {
            animation: none;
            transform: rotate(45deg) scaleY(1);
          }
        }
      `}</style>
      <div ref={backdropRef} className="absolute inset-0 bg-surface" />
      <div
        ref={flyRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: LOGO,
          height: LOGO,
          marginLeft: -LOGO / 2,
          marginTop: -LOGO / 2,
        }}
      >
        <div className="post-login-logo-mark">
          <Image src={LOGO_SRC} alt="" width={LOGO} height={LOGO} priority style={{ objectFit: "contain", display: "block" }} />
        </div>
        <div
          className="post-login-logo-cover"
          style={{
            position: "absolute",
            left: COVER_OFFSET,
            top: COVER_OFFSET,
            width: COVER,
            height: COVER,
            backgroundColor: "var(--surface)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
