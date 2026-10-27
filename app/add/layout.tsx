import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";

export const metadata: Metadata = {
  title: "Add a video",
  description:
    "Paste any YouTube URL or video ID — Focusy fetches the title and splits timestamps into lessons, or lets you paste chapters manually.",
};

export default function AddLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      {children}
    </div>
  );
}