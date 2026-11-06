"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

type Mode = "light" | "dark" | "system";

const MODES: Mode[] = ["light", "dark", "system"];
const LABELS: Record<Mode, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System theme",
};
const ICONS: Record<Mode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Global `Shift+D` theme shortcut. Mount once (AppShell) — mounting it inside
 * `ThemeToggle` would register a listener per toggle and flip twice.
 */
export function useThemeShortcut() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function isTyping(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    }

    function onKeyDown(e: KeyboardEvent) {
      // Modifier-free Shift+D only: never steal from browser/OS shortcuts and
      // never fire while typing in a field.
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() !== "d" || isTyping(e.target)) return;
      e.preventDefault();
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolvedTheme, setTheme]);
}

/**
 * Theme switch for the app shell: light → dark → system, with the active mode
 * labelled, the shortcut shown, and no hydration flash (the label/icon settle
 * after mount). `collapsed` renders it as a bare icon button.
 */
export function ThemeToggle({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current: Mode =
    mounted && MODES.includes(theme as Mode) ? (theme as Mode) : "system";
  const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
  const Icon = mounted ? ICONS[current] : Sun;
  const label = mounted
    ? `${LABELS[current]} — switch to ${LABELS[next].toLowerCase()}`
    : "Toggle theme";

  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      onClick={() => setTheme(next)}
      aria-label={label}
      aria-keyshortcuts="Shift+D"
      title={`${label} (Shift+D)`}
      className={cn(
        collapsed ? "shrink-0" : "w-full justify-start px-2 text-muted-foreground",
        className
      )}
    >
      <Icon aria-hidden />
      {!collapsed && (
        <>
          <span className="truncate">{mounted ? LABELS[current] : "Theme"}</span>
          <kbd className="ml-auto shrink-0 rounded border bg-muted px-1 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⇧D
          </kbd>
        </>
      )}
    </Button>
  );
}
