import {
  EyeOff,
  Heart,
  ListVideo,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/landing/section-heading";

const features = [
  {
    icon: EyeOff,
    title: "Zero distractions",
    text: "No recommended videos, shorts, comments or autoplay rabbit holes. Just the playlist you chose.",
  },
  {
    icon: ListVideo,
    title: "Course-style player",
    text: "A focused player with a clean lesson list in a collapsible sidebar — like a proper course platform.",
  },
  {
    icon: Zap,
    title: "Instant imports",
    text: "Paste any playlist link and the full video list is fetched in seconds via the YouTube Data API.",
  },
  {
    icon: Heart,
    title: "Favorites & recents",
    text: "Pin the playlists you love and automatically keep track of what you watched last.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Everything is stored in your own browser. No account, no tracking, no server-side watch history.",
  },
  {
    icon: Timer,
    title: "Pick up where you left off",
    text: "Per-video progress and resume pointers make long playlists easy to finish.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
      <SectionHeading
        kicker="Features"
        title="Everything you need to actually finish a playlist"
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="p-6">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
