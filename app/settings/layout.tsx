import type { Metadata } from "next";
import { TopBar } from "@/features/shell";
import { JsonLd } from "@/shared/components/json-ld";
import { absoluteUrl } from "@/shared/lib/site";

export const metadata: Metadata = {
  title: "Settings — connect your YouTube API key",
  description:
    "Connect your free YouTube Data API v3 key in ~2 minutes. Your key stays in this browser's localStorage and never touches a server.",
  alternates: { canonical: "/settings" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/settings"),
    title: "Settings — connect your YouTube API key · Focusy",
    description:
      "Connect your free YouTube Data API v3 key in ~2 minutes. Your key stays in this browser's localStorage and never touches a server.",
  },
};

/** Home › Settings */
const BREADCRUMBS = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Settings", item: absoluteUrl("/settings") },
  ],
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <JsonLd data={BREADCRUMBS} />
      <TopBar />
      {children}
    </div>
  );
}
