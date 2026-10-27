import {
  EyeOff,
  Heart,
  ListVideo,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { Reveal } from "@/features/landing/components/reveal";

const features = [
  {
    icon: EyeOff,
    title: "Zero distractions",
    text: "No recommended videos, shorts, comments or autoplay rabbit holes. Just the videos and playlists you chose.",
  },
  {
    icon: ListVideo,
    title: "Course-style player",
    text: "Chapter-by-chapter lessons with a clean sidebar — split any long video or playlist into a proper course.",
  },
  {
    icon: Zap,
    title: "Two ways to add content",
    text: "Import a whole playlist, or add a single video and let its timestamps become lessons. Your key, your browser.",
  },
  {
    icon: Heart,
    title: "Favorites & recents",
    text: "Videos and playlists each get their own tab — pin what you love and keep track of what you watched last.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Everything is stored in your own browser. No account, no tracking, no server-side watch history.",
  },
  {
    icon: Timer,
    title: "Pick up where you left off",
    text: "Per-lesson progress, resume pointers and completion tracking make long videos easy to finish.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
      <SectionHeading
        kicker="Features"
        title="Everything you need to actually finish what you start"
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 80}>
            <Card className="group card-sweep h-full transition-all hover:-translate-y-1 hover:shadow-xl">
              <CardContent className="p-6">
                <span className="icon-wiggle mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
