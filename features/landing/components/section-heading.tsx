import { cn } from "@/shared/lib/utils";

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
  return (
    <div className={className}>
      <p className="text-sm font-bold uppercase tracking-widest text-primary">{kicker}</p>
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
