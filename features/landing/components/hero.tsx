import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";
import { AddPlaylistButton } from "@/components/add-playlist-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

const stats: Array<[string, string]> = [
  ["100%", "distraction-free"],
  ["0", "accounts needed"],
  ["1-click", "video & playlist import"],
];

const mockLessons = ["01 · Getting started", "02 · Core concepts", "03 · Build & ship"];

function HeroCopy() {
  return (
    <div>
      <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
        Learn from YouTube{" "}
        <span className="animate-gradient-text bg-linear-to-r from-primary via-[#5B78F0] to-[#8AA5FF] bg-clip-text text-transparent">
          without the rabbit&nbsp;hole.
        </span>
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Paste a video or a playlist link and get a calm, course-style classroom: chapter-by-chapter
        lessons, a collapsible sidebar, and nothing else competing for your attention.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/add"
          className={cn(buttonVariants({ size: "lg" }), "h-12 px-7 text-base")}
        >
          Add a video <ArrowRight className="size-4" />
        </Link>
        <AddPlaylistButton
          variant="outline"
          className="h-12 px-7 text-base"
        />
      </div>
      <dl className="mt-10 flex flex-wrap gap-8">
        {stats.map(([v, l]) => (
          <div key={l}>
            <dt className="text-2xl font-extrabold tracking-tight">{v}</dt>
            <dd className="text-sm text-muted-foreground">{l}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="animate-float rounded-3xl border bg-card p-3 shadow-2xl shadow-primary/10">
        <div className="overflow-hidden rounded-2xl bg-black">
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-linear-to-br from-zinc-900 via-zinc-900 to-[#251a10] text-white">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/40">
              <Clapperboard className="size-7" />
            </span>
            <p className="text-sm font-medium text-zinc-300">Your YouTube, as a classroom</p>
          </div>
        </div>
        <div className="space-y-2 p-2">
          {mockLessons.map((t, i) => (
            <div
              key={t}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5 text-sm",
                i === 0 ? "border-primary/50 bg-primary/5" : "opacity-70"
              )}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted font-bold">
                {i + 1}
              </span>
              <span className="font-medium">{t}</span>
              {i === 0 && <Badge className="ml-auto">Now playing</Badge>}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="absolute -right-6 -top-6 -z-10 size-40 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-8 -left-8 -z-10 size-48 rounded-full bg-[#5B78F0]/25 blur-3xl" />
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-8rem,oklch(0.55_0.2_262/0.18),transparent)] dark:bg-[radial-gradient(60rem_30rem_at_50%_-8rem,oklch(0.63_0.165_258/0.3),transparent)]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24">
        <Reveal>
          <HeroCopy />
        </Reveal>
        <Reveal delay={150}>
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  );
}
