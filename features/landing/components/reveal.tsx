"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Scroll-reveal wrapper: fades/slides children in when they enter the
 * viewport (IntersectionObserver). Honors prefers-reduced-motion and force-
 * reveals after a timeout so content can never stay invisible.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Stagger delay in ms before the transition starts. */
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useInView();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", visible && "reveal-visible", className)}
    >
      {children}
    </div>
  );
}

/** Matches the reduced-motion preference the CSS animations honor too. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Intersection-observer visibility for a single element — shared by `Reveal`
 * and the hero's count-up stats. Force-reveals after a timeout so content can
 * never stay hidden if the observer never fires.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    // Safety net: never leave content hidden (e.g. observer never fires).
    const fallback = setTimeout(() => setVisible(true), 1500);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );
    observer.observe(el);
    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return { ref, visible };
}