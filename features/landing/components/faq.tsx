import { SectionHeading } from "@/features/landing/components/section-heading";
import { Reveal } from "@/features/landing/components/reveal";

const FAQS = [
  {
    q: "Do I need a YouTube API key?",
    a: "Only for auto-importing. A free YouTube Data API v3 key (≈2 minutes to create — the in-app Settings page walks you through it) lets Focusy fetch playlist details and video chapters instantly. Without a key you can still add videos in manual mode by pasting the chapter list yourself.",
  },
  {
    q: "Where is my data stored?",
    a: "Entirely in your browser (localStorage). No account, no server-side watch history, no tracking. Your API key never leaves your device — it's used directly from the browser against YouTube's API.",
  },
  {
    q: "How do video lessons work?",
    a: "Creators already put timestamps like “00:00 Intro” in their descriptions. Focusy parses each timestamp into a lesson that plays only its own segment of the video, tracks completion, and remembers where you left off — like Udemy or Coursera, but for any YouTube video.",
  },
  {
    q: "Do ads or recommendations still show up?",
    a: "Recommendations, Shorts, comments and the autoplay rabbit hole are gone — the player is fully custom with native controls hidden. Monetized videos can still show YouTube's pre-roll ads inside the embed; that's controlled by the creator, not the player.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. The whole app is responsive: grids collapse to single columns, sidebars become stacked lists or slide-in drawers, and the custom player chrome adapts to touch.",
  },
  {
    q: "What happens if I clear my browser data?",
    a: "Libraries and progress live in localStorage, so clearing site data resets the app. Everything is re-importable in seconds — paste the same links and you're back where you were.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
      <SectionHeading kicker="FAQ" title="Questions, answered" />
      <div className="mt-8 space-y-3">
        {FAQS.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details
              className="group rounded-2xl border bg-card px-5 py-4 transition-colors open:border-primary/40 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all group-open:rotate-45 group-open:bg-primary group-open:text-primary-foreground"
                >
                  +
                </span>
              </summary>
              <p className="faq-answer mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}