import { Sparkles } from "lucide-react";

const ITEMS = [
  "No recommendations",
  "No Shorts",
  "No comments",
  "No autoplay",
  "Lesson-by-lesson progress",
  "Playlists as classrooms",
  "Saved in your browser",
  "Free API key",
];

/**
 * Infinite scrolling strip of promises under the hero. Two identical copies
 * make the -50% loop seamless; motion is switched off under
 * prefers-reduced-motion (see globals.css) and the strip reads as a static row.
 */
export function Marquee() {
  return (
    <div className="border-y bg-muted/30">
      <div className="marquee-fade overflow-hidden py-3.5">
        <div className="animate-marquee flex w-max items-center">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex items-center gap-8 pr-8"
            >
              {ITEMS.map((item) => (
                <span
                  key={item}
                  className="flex shrink-0 items-center gap-2 text-xs font-semibold tracking-widest whitespace-nowrap text-muted-foreground uppercase"
                >
                  <Sparkles className="size-3.5 text-primary" aria-hidden />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
