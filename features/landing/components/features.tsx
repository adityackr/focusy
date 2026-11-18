import {
  Award,
  BarChart3,
  BellRing,
  Code2,
  EyeOff,
  Inbox,
  ListVideo,
  NotebookPen,
  Paperclip,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { Reveal } from "@/features/landing/components/reveal";
import { cn } from "@/shared/lib/utils";

const features = [
  {
    icon: EyeOff,
    title: "Zero distractions",
    text: "No recommended videos, Shorts, comments or autoplay rabbit holes. Just the videos and playlists you chose.",
  },
  {
    icon: ListVideo,
    title: "Course-style player",
    text: "One player for long videos and playlists: chapter-by-chapter lessons, a collapsible sidebar that remembers its state, and resume points.",
  },
  {
    icon: NotebookPen,
    title: "Notes & bookmarks",
    text: "Write timestamped Markdown notes or bookmark an exact second. Every note and moment links straight back to the player.",
  },
  {
    icon: Inbox,
    title: "Learning inbox",
    text: "Save YouTube links you're not ready for, tag them, add a note and mark them watched — without cluttering your library.",
  },
  {
    icon: BarChart3,
    title: "Progress you can see",
    text: "Actual study time, completion trends, a 12-month activity map, streaks and daily or weekly learning goals.",
  },
  {
    icon: BellRing,
    title: "Gentle daily reminders",
    text: "One optional local notification when lessons or today's goal are still waiting. No push server, no spam.",
  },
  {
    icon: Award,
    title: "Completion certificates",
    text: "Finish every lesson and download a printable certificate with the course, completion date and your name — even if you delete the course later.",
  },
  {
    icon: Code2,
    title: "Practice in Studio",
    text: "Open a Monaco editor and live preview beside any lesson, so you can try the code while the tutorial is fresh.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Notes, links, streaks and projects stay in your own browser. No account, no tracking, no server-side history.",
  },
  {
    icon: Paperclip,
    title: "Resources beside the lesson",
    text: "Attach PDFs, reference links, code snippets, documentation and downloadable files to a whole course or a single lesson.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
      <SectionHeading
        kicker="Features"
        title="Everything you need to go from saved link to finished skill"
        subtitle="A distraction-free player is just the start. Focusy keeps the notes, moments, momentum and practice around it."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal
            key={f.title}
            delay={(i % 3) * 80}
            className={cn(i === features.length - 1 && "lg:col-span-2")}
          >
            <Card className="group card-sweep h-full transition-all hover:-translate-y-1 hover:shadow-xl">
              <CardContent
                className={cn(
                  "p-6",
                  i === features.length - 1 &&
                    "sm:flex sm:items-center sm:gap-5",
                )}
              >
                <span
                  className={cn(
                    "icon-wiggle mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary",
                    i === features.length - 1 && "sm:mb-0 sm:shrink-0",
                  )}
                >
                  <f.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-bold">{f.title}</h3>
                  <p
                    className={cn(
                      "mt-1.5 text-sm leading-relaxed text-muted-foreground",
                      i === features.length - 1 && "sm:mt-1",
                    )}
                  >
                    {f.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
