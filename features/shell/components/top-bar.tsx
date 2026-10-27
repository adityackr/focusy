"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/library", label: "Library", match: (p: string) => p === "/library" },
  { href: "/recent", label: "Recent", match: (p: string) => p === "/recent" },
  { href: "/favorites", label: "Favorites", match: (p: string) => p === "/favorites" },
  { href: "/settings", label: "Settings", match: (p: string) => p === "/settings" },
];

export function TopBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <LogoMark size={32} />
          <span className="text-sm font-extrabold tracking-tight">
            Focus<span className="text-primary">y</span>
          </span>
        </Link>

        <nav className="ml-3 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.match(pathname) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                l.match(pathname) && "bg-accent text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </Button>
          <Link
            href="/add"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              pathname === "/add" && "ring-2 ring-ring/40"
            )}
          >
            Add video
          </Link>
        </div>
      </div>
    </header>
  );
}