import type { Metadata } from "next";
import { TopBar } from "@/features/shell";
import { JsonLd } from "@/shared/components/json-ld";
import { absoluteUrl } from "@/shared/lib/site";

export const metadata: Metadata = {
  title: "Add a video",
  description:
    "Paste any YouTube URL or video ID — Focusy fetches the title and splits timestamps into lessons, or lets you paste chapters manually.",
  alternates: { canonical: "/add" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/add"),
    title: "Add a video · Focusy",
    description:
      "Paste any YouTube URL or video ID — Focusy fetches the title and splits timestamps into lessons, or lets you paste chapters manually.",
  },
};

/** Home › Add a video */
const BREADCRUMBS = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Add a video", item: absoluteUrl("/add") },
  ],
};

export default function AddLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <JsonLd data={BREADCRUMBS} />
      <TopBar />
      {children}
    </div>
  );
}
