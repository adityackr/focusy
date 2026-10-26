import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="text-sm font-extrabold tracking-tight">
              Focus<span className="text-primary">Tube</span>
            </span>
          </Link>
          <Link href="/library" className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground">
            Library
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
