import Link from "next/link";
import { ArrowRight, CheckCircle2, ListVideo, Scissors } from "lucide-react";
import { AddPlaylistButton } from "@/features/playlists";
import { buttonVariants } from "@/shared/ui/button";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { Reveal } from "@/features/landing/components/reveal";
import { cn } from "@/shared/lib/utils";

const CARDS = [
  {
    icon: Scissors,
    kicker: "For single videos",
    title: "One long video → a lesson-by-lesson course",
    text: "Paste any tutorial, lecture, talk or podcast. Focusy splits it by the timestamps in its description into resumable lessons.",
    bullets: [
      "Chapters parsed automatically — or pasted manually, no key needed",
      "Per-lesson progress, resume points and completion tracking",
      "Rename, retime, add or reorder lessons anytime",
    ],
    cta: { href: "/add", label: "Add a video" },
    mock: ["00:00 · Introduction", "05:12 · Setting up", "1:02:03 · Deep dive"],
  },
  {
    icon: ListVideo,
    kicker: "For playlists",
    title: "A whole playlist → a calm classroom",
    text: "Import any YouTube playlist once and watch it start-to-finish with a clean lesson list — nothing competing for your attention.",
    bullets: [
      "Full import: titles, thumbnails, order and channel info",
      "Drag-to-reorder library with favorites and recents",
      "Per-video progress and nested chapters in the sidebar",
    ],
    cta: null,
    mock: ["01 · Getting started", "02 · Core concepts", "03 · Build & ship"],
  },
];

export function SpotlightSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHeading
        kicker="Why Focusy"
        title="Two ways to turn YouTube into a classroom"
        subtitle="Single video or full playlist — either way you get lessons, progress and zero distractions."
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 120}>
          <div
            className="group card-sweep relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="sheen bg-linear-to-r from-primary/90 via-primary to-[#5B78F0] px-6 py-5 text-primary-foreground">
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase opacity-90">
                <c.icon className="size-4" /> {c.kicker}
              </div>
              <h3 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
                {c.title}
              </h3>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{c.text}</p>

              {/* mini classroom mock */}
              <div className="space-y-1.5 rounded-2xl border bg-muted/40 p-3">
                {c.mock.map((m, i) => (
                  <div
                    key={m}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-[13px] font-medium",
                      i === 0 ? "border-primary/50" : "opacity-70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate">{m}</span>
                    {i === 0 && (
                      <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                        <span className="relative flex size-1.5 rounded-full bg-primary">
                          <span aria-hidden className="ping-ring text-primary" />
                        </span>
                        Now playing
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <ul className="space-y-1.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                {c.cta ? (
                  <Link
                    href={c.cta.href}
                    className={cn(buttonVariants(), "w-full sm:w-auto")}
                  >
                    {c.cta.label} <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <AddPlaylistButton className="w-full sm:w-auto" />
                )}
              </div>
            </div>
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}