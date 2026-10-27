"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { prefersReducedMotion } from "@/features/landing/components/reveal";

/**
 * Typewriter text: types each phrase, holds, deletes it and moves on to the
 * next one, with a blinking caret. The first phrase is rendered as-is so the
 * server output (and no-JS visitors) always show real text — animation only
 * kicks in after mount, and never under prefers-reduced-motion.
 */
export function Typewriter({
  phrases,
  className,
  caretClassName,
  typeSpeed = 55,
  deleteSpeed = 28,
  startDelay = 1400,
  holdDelay = 1900,
}: {
  /** Phrases to cycle through; the first one is shown before hydration. */
  phrases: string[];
  className?: string;
  /** Extra classes for the blinking caret (needed when the text color is transparent). */
  caretClassName?: string;
  /** ms per typed character. */
  typeSpeed?: number;
  /** ms per deleted character. */
  deleteSpeed?: number;
  /** ms to wait before the animation starts. */
  startDelay?: number;
  /** ms to hold a finished phrase before deleting it. */
  holdDelay?: number;
}) {
  // Keeps the effect stable even if the caller passes an inline array.
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  const [text, setText] = useState(phrases[0] ?? "");

  useEffect(() => {
    const list = phrasesRef.current;
    if (list.length === 0 || prefersReducedMotion()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let index = 0;
    let length = list[0].length;
    let deleting = false;

    const tick = () => {
      if (cancelled) return;
      const target = list[index];

      if (!deleting) {
        if (length < target.length) {
          length += 1;
          setText(target.slice(0, length));
          timer = setTimeout(tick, typeSpeed);
        } else if (list.length > 1) {
          deleting = true;
          timer = setTimeout(tick, holdDelay);
        }
        return;
      }

      if (length > 0) {
        length -= 1;
        setText(target.slice(0, length));
        timer = setTimeout(tick, deleteSpeed);
      } else {
        deleting = false;
        index = (index + 1) % list.length;
        timer = setTimeout(tick, typeSpeed * 5);
      }
    };

    timer = setTimeout(tick, startDelay);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [typeSpeed, deleteSpeed, startDelay, holdDelay]);

  return (
    <span className={className}>
      {text}
      <span aria-hidden className={cn("typewriter-caret", caretClassName)} />
    </span>
  );
}