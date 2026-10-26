import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-extrabold tracking-tight">404</p>
      <h1 className="text-xl font-bold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <div className="flex gap-2">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          Go home
        </Link>
        <Link href="/library" className={cn(buttonVariants({ variant: "outline" }))}>
          Open library
        </Link>
      </div>
    </div>
  );
}
