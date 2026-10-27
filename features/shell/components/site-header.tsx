"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isApp =
    pathname.startsWith("/library") ||
    pathname.startsWith("/watch") ||
    pathname.startsWith("/course");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={36} className="drop-shadow-md" />
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight">
              Focus<span className="text-primary">y</span>
            </span>
            <span className="block text-[11px] font-medium text-muted-foreground">
              distraction-free learning
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { href: "/#features", label: "Features" },
            { href: "/#how", label: "How it works" },
            { href: "/library", label: "Library" },
            { href: "/settings", label: "Settings" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isApp && l.href === "/library" && "text-foreground",
                pathname === l.href && "text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
            href="/library"
            className={cn(buttonVariants({ variant: "outline" }), "hidden sm:inline-flex")}
          >
            My library
          </Link>
          <Link href="/add" className={cn(buttonVariants())}>
            Add video
          </Link>
        </div>
      </div>
    </header>
  );
}