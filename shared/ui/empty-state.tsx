import { cn } from "@/shared/lib/utils";

/**
 * The one empty state for every list in the app (videos, playlists, folders,
 * missing categories). Keeping it here is what keeps those screens looking
 * like the same product.
 */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-7" />
      </span>
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      </div>
      {action}
    </div>
  );
}
