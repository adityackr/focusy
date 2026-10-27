import { Clapperboard, History, MousePointerClick, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/shared/ui/card";
import { AddPlaylistButton } from "@/features/playlists";
import { buttonVariants } from "@/shared/ui/button";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { Reveal } from "@/features/landing/components/reveal";
import { cn } from "@/shared/lib/utils";

const steps = [
  {
    icon: MousePointerClick,
    title: "Paste a link or ID",
    text: "Any YouTube video URL (its timestamps become lessons) or a whole playlist link.",
  },
  {
    icon: Sparkles,
    title: "We build your classroom",
    text: "Titles, thumbnails, order and chapters are imported automatically with your free API key.",
  },
  {
    icon: Clapperboard,
    title: "Watch distraction-free",
    text: "Learn lesson by lesson — the sidebar keeps every chapter and video one click away.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="border-y bg-muted/40">
      <div className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
        <SectionHeading kicker="How it works" title="From link to classroom in seconds" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <Card className="group card-sweep relative h-full transition-all hover:-translate-y-1 hover:shadow-lg">
                <span
                  aria-hidden
                  className="bar-in absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-[#5B78F0] to-transparent"
                />
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="icon-wiggle relative flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                      <s.icon className="size-5" />
                    </span>
                    <span className="text-4xl font-extrabold text-muted-foreground/30">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/add" className={cn(buttonVariants())}>
            Add a video
          </Link>
          <AddPlaylistButton variant="outline" />
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <History className="size-4" /> Recents and favorites are saved automatically
          </span>
        </div>
      </div>
    </section>
  );
}
