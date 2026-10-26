import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  className,
}: {
  kicker: string;
  title: string;
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
    </div>
  );
}
