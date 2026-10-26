import { Clapperboard, History, MousePointerClick, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AddPlaylistButton } from "@/components/add-playlist-dialog";
import { SectionHeading } from "@/components/landing/section-heading";

const steps = [
  {
    icon: MousePointerClick,
    title: "Paste a playlist link",
    text: "Copy any youtube.com/playlist?list=… URL or just the playlist ID.",
  },
  {
    icon: Sparkles,
    title: "We build your classroom",
    text: "Titles, thumbnails, order and channel info are imported automatically.",
  },
  {
    icon: Clapperboard,
    title: "Watch distraction-free",
    text: "Open the playlist and learn — the sidebar keeps every lesson one click away.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="border-y bg-muted/40">
      <div className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
        <SectionHeading kicker="How it works" title="From link to classroom in seconds" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
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
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <AddPlaylistButton />
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <History className="size-4" /> Recents and favorites are saved automatically
          </span>
        </div>
      </div>
    </section>
  );
}
