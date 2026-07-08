"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Inertia/Livewire-style top progress bar. It starts when a navigation begins
// (an internal link click, a router.push via history.pushState, or back/forward)
// and completes once the new route commits (pathname or query actually changes).
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopTrickle() {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
  }

  useEffect(() => {
    function start() {
      if (trickleRef.current) return; // already running
      if (hideRef.current) clearTimeout(hideRef.current);
      setVisible(true);
      setProgress(8);
      // Ease toward ~90% while we wait for the route to commit; never reach 100
      // until navigation actually finishes.
      trickleRef.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.18));
      }, 200);
    }

    // router.push / replace / prefetch commits go through the History API.
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      start();
      return origPush.apply(this, args);
    };
    history.replaceState = function (...args) {
      start();
      return origReplace.apply(this, args);
    };

    // Immediate feedback on link clicks, before the RSC round-trip begins.
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (
        !href ||
        href.startsWith("#") ||
        (target && target !== "_self") ||
        anchor.hasAttribute("download") ||
        anchor.origin !== window.location.origin
      ) {
        return;
      }
      // Ignore clicks that don't change the URL.
      if (anchor.pathname === window.location.pathname && anchor.search === window.location.search) {
        return;
      }
      start();
    }

    function onPopState() {
      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      stopTrickle();
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, []);

  // Route committed → finish the bar and fade it out. The state updates run in
  // rAF/timeout callbacks so the browser paints the trickle before the fill.
  useEffect(() => {
    stopTrickle();
    if (!visible) return;
    const raf = requestAnimationFrame(() => setProgress(100));
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease 100ms" }}
    >
      <div
        className="h-full bg-blue-600 dark:bg-blue-400 shadow-[0_0_8px] shadow-blue-500/50"
        style={{
          width: `${progress}%`,
          transition: "width 200ms ease-out",
        }}
      />
    </div>
  );
}
