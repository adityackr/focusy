import type { Metadata } from "next";
import { AppShell } from "@/features/shell";

// Library, Recent and Favorites are rendered from the visitor's localStorage —
// a crawler would only see an empty shell, so they stay out of the index while
// still letting link equity flow to the marketing pages.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
