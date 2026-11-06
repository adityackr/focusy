/**
 * Animated backdrop for the marketing page: a drifting grid that fades below
 * the fold plus a few slowly moving color blooms. Fixed behind the content so
 * scrolling feels continuous. All motion is disabled by the reduced-motion
 * rules in globals.css.
 */
export function LandingBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="bg-landing-grid absolute inset-0 opacity-70 dark:opacity-50" />
      <div className="animate-aurora absolute -top-56 left-[calc(50%-34rem)] h-[34rem] w-[68rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.63_0.165_258/0.35),transparent)] blur-2xl" />
      <div
        className="animate-aurora absolute -left-40 top-1/3 size-[30rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.63_0.165_285/0.26),transparent)] blur-3xl"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="animate-aurora absolute -right-40 top-2/3 size-[32rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.14_200/0.22),transparent)] blur-3xl"
        style={{ animationDelay: "-13s" }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}
