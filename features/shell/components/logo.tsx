"use client";

import { useId } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Focusy logo mark — a rounded-square tile in tide blue (matching the app
 * theme) carrying a white stylized "F". Geometry lives in the 48×48 viewBox;
 * keep it in sync with app/icon.svg (favicon + PWA master artwork),
 * scripts/generate-pwa-icons.mjs and shared/lib/og-image.tsx.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `ft-amber-${uid}`;
  const clipId = `ft-clip-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8FA8FF" />
          <stop offset="1" stopColor="#3E5CEB" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="4" y="4" width="40" height="40" rx="13" />
        </clipPath>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="13" fill={`url(#${gradientId})`} />
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx="24" cy="11" rx="17" ry="7" fill="#fff" opacity="0.22" />
      </g>
      <g fill="#FFFFFF">
        {/* stem */}
        <rect x="16.5" y="14" width="6.5" height="20" rx="2.5" />
        {/* top arm */}
        <rect x="16.5" y="14" width="15.5" height="6" rx="2.5" />
        {/* middle arm */}
        <rect x="16.5" y="24" width="13.5" height="5.5" rx="2.5" />
      </g>
    </svg>
  );
}
