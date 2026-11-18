import { SectionHeading } from "@/features/landing/components/section-heading";
import { Reveal } from "@/features/landing/components/reveal";
import { JsonLd } from "@/shared/components/json-ld";

export const FAQS = [
  {
    q: "Is Focusy free?",
    a: "Yes. There is no subscription, account or paywall — Focusy runs entirely in your browser. Importing metadata uses your own free YouTube Data API v3 key, so the only optional cost is whatever quota you choose to use.",
  },
  {
    q: "Do I need a YouTube API key?",
    a: "Only for automatic imports. A free YouTube Data API v3 key (about two minutes to create — Settings walks you through it) fetches playlist details and video chapters instantly. Without a key you can still add videos manually, and the Learning Inbox falls back to YouTube's keyless oEmbed metadata.",
  },
  {
    q: "Where is my data stored?",
    a: "In your browser: localStorage for your library, notes, bookmarks, inbox, progress and analytics, and IndexedDB for Studio project files. There is no account, server-side watch history or tracking. Your API key is only used directly from your browser against YouTube's API.",
  },
  {
    q: "Can I take notes and bookmark moments?",
    a: "Yes. Both the playlist and course players support timestamped Markdown notes and bookmarks on the exact playback second. Notes live under /notes, bookmarks under /bookmarks, and every item deep-links back to the right lesson and time. Notes and bookmarks are included in backups.",
  },
  {
    q: "What is the Learning Inbox?",
    a: "A holding queue for YouTube links you are not ready to add to your library. Save a URL, give it up to 10 tags and a note, then mark it watched when you are done. The inbox opens links on YouTube, is searchable, and is included in your backup file.",
  },
  {
    q: "How do learning reminders work?",
    a: "Reminders are optional local browser notifications. Pick a time and Focusy will send at most one notification a day, only when unfinished lessons or today's study goal are still waiting. They run only while a Focusy tab is open — there is no push server or background service — and the settings stay on that device.",
  },
  {
    q: "Do certificates and Studio cost extra?",
    a: "No. Finishing every lesson unlocks a locally generated certificate you can download, print or save as a PDF. Any lesson can also open Focusy Studio, a built-in coding workspace with a Monaco editor and live Sandpack preview. Neither sends your work to a Focusy server.",
  },
  {
    q: "Do ads or recommendations still show up?",
    a: "Recommendations, Shorts, comments and the autoplay rabbit hole are gone — the player is fully custom with native controls hidden. Monetized videos can still show YouTube's pre-roll ads inside the embed; that is controlled by the creator, not the player.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. The whole app is responsive: grids collapse to single columns, sidebars become stacked lists or slide-in drawers, and the player chrome adapts to touch. Focusy is installable as a PWA too, though video playback and imports still need a network connection.",
  },
  {
    q: "Can I move Focusy to another device?",
    a: "Yes. Settings can export everything in this browser to one JSON file and restore it on another device or browser. The backup includes your library, progress, notes, bookmarks, inbox, attachments, Studio projects and completion certificates — including certificates for courses or playlists you have since deleted. The app and lesson sidebar preferences are saved per device.",
  },
  {
    q: "What if I clear my browser data?",
    a: "Clearing site data resets the local app. Export a backup first from Settings — it includes your library, notes, bookmarks, inbox, Studio projects, attachments and saved certificates. The Data & storage card shows exactly what is using space and when you last backed up.",
  },
];

/** FAQPage structured data mirroring the questions rendered below. */
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
      <JsonLd data={FAQ_JSON_LD} />
      <SectionHeading kicker="FAQ" title="Questions, answered" />
      <div className="mt-8 space-y-3">
        {FAQS.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details
              className="group rounded-2xl border bg-card px-5 py-4 transition-colors open:border-primary/40 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                {f.q}
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all group-open:rotate-45"
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