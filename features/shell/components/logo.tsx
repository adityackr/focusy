"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Focusy logo mark — a rounded play button in tide blue,
 * echoing the app theme (primary) with a white foreground.
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
      <path
        d="M20.5 17.8v12.4c0 1.1 1.2 1.8 2.2 1.2l9.6-6.2c.9-.6.9-1.9 0-2.5l-9.6-6.2c-1-.6-2.2.1-2.2 1.3z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
