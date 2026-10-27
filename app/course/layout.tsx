import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";

// Courses live in the visitor's localStorage — private per-browser pages
// that should never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      {children}
    </div>
  );
}