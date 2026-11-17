import { Reveal } from "@/features/landing/components/reveal";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/ui/button";
import {
  ArrowRight,
  Award,
  BarChart3,
  BellRing,
  Bookmark,
  CheckCircle2,
  Code2,
  Flame,
  Inbox,
  NotebookPen,
  Tags,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

function ToolkitCard({
  icon: Icon,
  kicker,
  title,
  text,
  delay = 0,
  className,
  children,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  text: string;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <article className="group card-sweep relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="icon-wiggle flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              {kicker}
            </p>
            <h3 className="mt-0.5 font-bold leading-tight">{title}</h3>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
        <div className="mt-5 flex-1">{children}</div>
      </article>
    </Reveal>
  );
}

const INBOX_ITEMS = [
  { title: "CSS Grid in 20 minutes", tags: ["css", "layout"] },
  { title: "TypeScript generics, explained", tags: ["typescript"] },
  { title: "System design primer", tags: ["architecture"], watched: true },
];

function InboxMock() {
  return (
    <div className="space-y-2">
      {INBOX_ITEMS.map((item, i) => (
        <div
          key={item.title}
          className={cn(
            "animate-pop flex items-center gap-2.5 rounded-xl border bg-background/80 p-2.5 transition-transform duration-300 group-hover:translate-x-0.5",
            item.watched && "opacity-60",
          )}
          style={{ animationDelay: `${120 + i * 110}ms` }}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Inbox className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{item.title}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
              item.watched
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 text-primary",
            )}
          >
            {item.watched ? "Watched" : "To watch"}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 pt-1 text-[10px] font-medium text-muted-foreground">
        <Tags className="size-3" /> Up to 10 tags per link · searchable notes
      </div>
    </div>
  );
}

const STREAK_BARS = [35, 52, 44, 68, 58, 84, 50, 72, 90, 64, 82, 100];

function AnalyticsMock() {
  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Current streak
          </p>
          <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
            12 <span className="text-sm font-semibold text-muted-foreground">days</span>
          </p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
          <Flame className="size-4" />
        </span>
      </div>
      <div className="mt-4 flex h-16 items-end gap-1" aria-hidden>
        {STREAK_BARS.map((height, i) => (
          <span
            key={height + i}
            className="bar-rise flex-1 rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary"
            style={{ height: `${height}%`, animationDelay: `${i * 55}ms` }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span>5 min = a study day</span>
        <span className="font-semibold text-primary">+18% this week</span>
      </div>
    </div>
  );
}

function ReminderMock() {
  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <span className="relative flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span aria-hidden className="ping-ring rounded-xl text-primary/70" />
          <BellRing className="size-4" />
        </span>
        <span className="flex h-6 w-11 items-center rounded-full bg-primary p-0.5" aria-hidden>
          <span className="animate-pop ml-auto size-5 rounded-full bg-white shadow-sm" />
        </span>
      </div>
      <div className="mt-4 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold">Focusy</span>
          <span className="text-muted-foreground">19:30 · now</span>
        </div>
        <p className="mt-1.5 text-xs font-semibold leading-snug">
          3 lessons left. Pick up where you stopped?
        </p>
        <div className="mt-3 flex items-center justify-between text-[9px] font-medium text-muted-foreground">
          <span>Daily goal</span>
          <span>18 / 30 min</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full w-[60%] rounded-full bg-primary" />
        </div>
      </div>
      <p className="mt-3 text-[10px] font-medium text-muted-foreground">
        One local nudge a day. No push servers.
      </p>
    </div>
  );
}

function CertificateMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/12 via-card to-[#5B78F0]/10 p-4 text-center">
      <div
        aria-hidden
        className="animate-spin-slow absolute -right-10 -top-10 size-32 rounded-full border border-dashed border-primary/20"
      />
      <span className="relative mx-auto flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        <Award className="size-5" />
      </span>
      <p className="relative mt-3 text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
        Certificate unlocked
      </p>
      <h4 className="relative mt-1 text-sm font-extrabold">Advanced TypeScript</h4>
      <p className="relative mt-1 text-[10px] text-muted-foreground">
        12 of 12 lessons complete
      </p>
      <div className="relative mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-primary">
        <CheckCircle2 className="size-3.5" /> Ready to download or print
      </div>
    </div>
  );
}

/** The tools that turn a distraction-free player into a learning system. */
export function LearningToolkitSection() {
  return (
    <section id="toolkit" className="border-y bg-muted/30">
      <div className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <SectionHeading
          kicker="The learning toolkit"
          title="More than a player. A system for finishing."
          subtitle="Save what you find, keep the moments that matter, build a streak, and turn completed courses into something you can keep. Every tool is built in — and stays in your browser."
        />

        <div className="mt-9 grid gap-4 lg:grid-cols-12">
          <ToolkitCard
            icon={NotebookPen}
            kicker="Notes & bookmarks"
            title="Never lose the moment"
            text="Write Markdown notes against the current playback time, or bookmark an exact second and jump back to it later."
            className="lg:col-span-7"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1226] p-4 text-white shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400">
                <span>02 · Core concepts</span>
                <span>12:42 / 28:10</span>
              </div>
              <div className="relative mt-3 h-1.5 rounded-full bg-white/15" aria-hidden>
                <div className="absolute inset-y-0 left-0 w-[58%] rounded-full bg-primary" />
                {[34, 58, 78].map((left, i) => (
                  <span
                    key={left}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${left}%` }}
                  >
                    {i === 1 ? (
                      <span className="relative flex size-2.5">
                        <span className="ping-ring text-primary" />
                        <span className="relative size-2.5 rounded-full border-2 border-[#0B1226] bg-primary" />
                      </span>
                    ) : (
                      <span className="block size-1.5 rounded-full bg-white/40" />
                    )}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div
                  className="animate-pop rounded-xl border border-white/10 bg-white/5 p-3"
                  style={{ animationDelay: "180ms" }}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    <Bookmark className="size-3" /> Bookmark · 12:42
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-zinc-200">
                    “useMemo() finally clicked”
                  </p>
                </div>
                <div
                  className="animate-pop rounded-xl border border-white/10 bg-white/5 p-3"
                  style={{ animationDelay: "300ms" }}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    <NotebookPen className="size-3" /> Note · 18:06
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-zinc-200">
                    Re-read the effects section before the exercise.
                  </p>
                </div>
              </div>
            </div>
          </ToolkitCard>

          <ToolkitCard
            icon={Inbox}
            kicker="Learning inbox"
            title="A queue for your curiosity"
            text="Save any YouTube link without committing it to your library. Tag it, add a note, and mark it watched when you're done."
            delay={80}
            className="lg:col-span-5"
          >
            <InboxMock />
          </ToolkitCard>

          <ToolkitCard
            icon={BarChart3}
            kicker="Analytics & goals"
            title="Proof that you're showing up"
            text="Real study time, lesson and course completions, a 12-month activity map, streaks and goals — all measured locally."
            delay={0}
            className="lg:col-span-4"
          >
            <AnalyticsMock />
          </ToolkitCard>

          <ToolkitCard
            icon={BellRing}
            kicker="Learning reminders"
            title="Nudges, not noise"
            text="Pick a time and Focusy sends at most one local reminder a day — only when lessons or your daily goal are still waiting."
            delay={80}
            className="lg:col-span-4"
          >
            <ReminderMock />
          </ToolkitCard>

          <ToolkitCard
            icon={Award}
            kicker="Certificates"
            title="Finish with something to keep"
            text="Complete every lesson and unlock a locally generated certificate — download it, print it, or save a PDF. No public profile needed."
            delay={160}
            className="lg:col-span-4"
          >
            <CertificateMock />
          </ToolkitCard>
        </div>

        <Reveal delay={120}>
          <article className="group card-sweep relative mt-4 overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl lg:grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <Code2 className="size-4" /> Focusy Studio
              </div>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Watch the tutorial. Then build it.
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Every video, course and playlist lesson can open a coding workspace,
                so you can practice the exact thing you just learned without
                switching tabs. Projects save automatically and return with the lesson.
              </p>
              <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                {[
                  "Monaco editor with syntax highlighting",
                  "Live Sandpack preview & console",
                  "HTML, React, TypeScript, Express",
                  "Projects restored per lesson",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/add"
                className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full sm:w-fit")}
              >
                Add a video to practice <ArrowRight className="size-4" />
              </Link>
            </div>

            <div
              aria-hidden
              className="relative min-h-[280px] overflow-hidden border-t border-white/10 bg-[#0B1226] p-4 text-white lg:border-l lg:border-t-0 sm:p-6"
            >
              <div className="animate-orb absolute -right-16 -top-16 size-56 rounded-full bg-primary/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0E1730] shadow-2xl">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                  <span className="size-2 rounded-full bg-[#FF5F57]" />
                  <span className="size-2 rounded-full bg-[#FEBC2E]" />
                  <span className="size-2 rounded-full bg-[#28C840]" />
                  <span className="ml-2 text-[9px] font-medium text-zinc-500">
                    lesson-03.tsx
                  </span>
                  <span className="ml-auto rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                    ● Running
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 text-[10px] leading-6 sm:text-xs">
                  <code>
                    <span className="text-[#C792EA]">export default function</span>{" "}
                    <span className="text-[#82AAFF]">Lesson</span>() {"{"}
                    {"\n"}  <span className="text-[#C792EA]">const</span> [count, setCount] ={" "}
                    <span className="text-[#82AAFF]">useState</span>(<span className="text-[#F78C6C]">0</span>);
                    {"\n\n"}  <span className="text-[#C792EA]">return</span> (
                    {"\n"}    <span className="text-[#89DDFF]">&lt;button</span>{" "}
                    <span className="text-[#FFCB6B]">onClick</span>=
                    {"{() => setCount(count + 1)}"}<span className="text-[#89DDFF]">&gt;</span>
                    {"\n"}      Practice {"{"}count{"}"} times
                    {"\n"}    <span className="text-[#89DDFF]">&lt;/button&gt;</span>
                    {"\n"}  );
                    {"\n"}{"}"}
                    <span className="typewriter-caret ml-0.5" />
                  </code>
                </pre>
                <div className="border-t border-white/10 p-4">
                  <div className="rounded-xl bg-white p-3 text-center text-black shadow-lg">
                    <p className="text-[10px] font-semibold text-zinc-500">Preview</p>
                    <p className="mt-1 text-sm font-extrabold">Hello, Focusy 👋</p>
                    <span className="mt-2 inline-block rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                      Practice 3 times
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
            {[
              "No account",
              "No uploads",
              "No tracking",
              "Free forever",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary" /> {item}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
