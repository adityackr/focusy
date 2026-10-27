"use client";

import { cn } from "@/shared/lib/utils";
import { useInView } from "@/features/landing/components/reveal";

export function SectionHeading({
  kicker,
  title,
  subtitle,
  className,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const { ref, visible } = useInView();

  return (
    <div ref={ref} className={cn("reveal", visible && "reveal-visible", className)}>
      <div className="flex items-center gap-3">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">{kicker}</p>
        <span aria-hidden className="bar-in h-px w-14 bg-primary/50 sm:w-20" />
      </div>
      <h2
        className={cn(
          "mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}