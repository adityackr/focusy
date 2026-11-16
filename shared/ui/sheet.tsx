"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { lockBodyScroll, unlockBodyScroll } from "@/shared/ui/scroll-lock";

interface SheetContextValue {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  setOpen: () => {},
});

export type SheetSide = "right" | "left" | "top" | "bottom";

const SIDE_CLASSES: Record<SheetSide, string> = {
  right: "inset-y-0 right-0 h-full w-full border-l",
  left: "inset-y-0 left-0 h-full w-full border-r",
  top: "inset-x-0 top-0 w-full border-b",
  bottom: "inset-x-0 bottom-0 w-full border-t",
};

/** Accessible overlay panel used for workspace-sized surfaces. */
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <SheetContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetContent({
  side = "right",
  className,
  closeLabel = "Close",
  children,
}: {
  side?: SheetSide;
  className?: string;
  closeLabel?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = React.useContext(SheetContext);
  const mounted = useSheetSurface(open, setOpen);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute flex flex-col bg-background shadow-2xl",
          "animate-in fade-in-0 slide-in-from-right duration-200",
          SIDE_CLASSES[side],
          className
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label={closeLabel}
          className="absolute right-3 top-3 z-10 h-8 w-8 text-muted-foreground"
        >
          <X className="size-4" />
        </Button>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function SheetHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 flex-col gap-1.5 border-b p-4 pr-12", className)}>
      {children}
    </div>
  );
}

export function SheetTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn("text-base font-semibold", className)}>{children}</h2>;
}

export function SheetDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

/** Portal mount + Escape/scroll-lock behavior for `SheetContent`. */
function useSheetSurface(open: boolean, setOpen: (value: boolean) => void) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open, setOpen]);

  return mounted;
}
