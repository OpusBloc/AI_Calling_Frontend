"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FLAG = "play_login_intro";
const LOGO = 120;
const LOGO_SRC = "/Opus_bloc_loder_image.png"; // same image for BOTH halves

const waitForTarget = (selector: string, timeout = 1500) =>
  new Promise<HTMLElement | null>((resolve) => {
    const start = performance.now();
    const tick = () => {
      const el = document.querySelector<HTMLElement>(selector);
      const r = el?.getBoundingClientRect();
      if (el && r && r.width > 0 && r.height > 0) return resolve(el);
      if (performance.now() - start > timeout) return resolve(null);
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
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setActive(true);
    } catch {}
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const fly = flyRef.current;
    const backdrop = backdropRef.current;
    if (!fly || !backdrop) return;

    let cancelled = false;
    let mark: HTMLElement | null = null;
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
    const safety = window.setTimeout(finish, 7000);

    (async () => {
      try {
        const left = fly.querySelector<HTMLElement>(".logo-left");
        const right = fly.querySelector<HTMLElement>(".logo-right");
        if (!left || !right) return;

        // 1. Halves enter and merge
        const ease = "cubic-bezier(0.22,1,0.36,1)";
        await Promise.all([
          animate(
            left,
            [
              { transform: "translateX(-60vw)", opacity: 0 },
              { transform: "translateX(0)", opacity: 1 },
            ],
            { duration: 900, easing: ease }
          ),
          animate(
            right,
            [
              { transform: "translateX(60vw)", opacity: 0 },
              { transform: "translateX(0)", opacity: 1 },
            ],
            { duration: 900, easing: ease }
          ),
        ]);
        if (cancelled) return;

        // 2. Wait for the real sidebar logo
        const target = await waitForTarget(".ob-brand-mark");
        if (cancelled) return;

        if (target) {
          mark = target;
          target.style.opacity = "0";

          // Fade the centered mark away and reveal the unchanged sidebar logo.
          await Promise.all([
            animate(fly, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 }),
            animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 }),
            animate(target, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 }),
          ]);
          if (cancelled) return;

          target.style.opacity = "1";
        } else {
          await Promise.all([
            animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 }),
            animate(fly, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 }),
          ]);
        }
      } catch {
        // animations cancelled
      } finally {
        window.clearTimeout(safety);
        if (mark) mark.style.opacity = "";
        finish();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      animations.forEach((a) => a.cancel());
      if (mark) mark.style.opacity = "";
    };
  }, [active]);

  if (!active) return null;

  const half = (cls: string, clip: string) => (
    <div
      className={cls}
      style={{ position: "absolute", inset: 0, clipPath: clip, opacity: 0 }}
    >
      <Image src={LOGO_SRC} alt="" width={LOGO} height={LOGO} priority />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999]" aria-hidden>
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
        <div style={{ position: "relative", width: LOGO, height: LOGO }}>
{/* lower-left half: enters from the left */}
{half("logo-left", "polygon(0 0, 0 100%, 100% 100%)")}

{/* upper-right half: enters from the right */}
{half("logo-right", "polygon(0 0, 100% 0, 100% 100%)")}
        </div>
      </div>
    </div>
  );
}
