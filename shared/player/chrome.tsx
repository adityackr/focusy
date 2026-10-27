import { cn } from "@/shared/lib/utils";

/** Icon/label button in the dark player chrome. */
export function ChromeButton({
  children,
  label,
  onClick,
  active,
  primary,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-md transition-colors hover:bg-white/15 [&_svg]:size-[18px]",
        active && "bg-white/15",
        primary && "bg-white text-black hover:bg-white/85"
      )}
    >
      {children}
    </button>
  );
}

/** Popup menu card above a chrome button (speed / quality / chapters). */
export function MenuCard({
  title,
  children,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute right-0 bottom-11 z-40 overflow-hidden rounded-lg border border-white/15 bg-black/95 py-1 shadow-xl",
        wide ? "w-64" : "w-36"
      )}
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/50 uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}

/** Row inside a MenuCard. */
export function MenuItem({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-white/10",
        selected ? "font-semibold text-white" : "text-white/80"
      )}
    >
      <span className="font-mono tabular-nums">{children}</span>
      {selected && <span aria-hidden>✓</span>}
    </button>
  );
}

/** Keyboard-key chip (shortcut hints under the player). */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 font-mono text-[10px] font-medium">
      {children}
    </kbd>
  );
}