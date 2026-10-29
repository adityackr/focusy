import type { Metadata } from "next";
import { TopBar } from "@/features/shell";

// Courses live in the visitor's localStorage — private per-browser pages
// that should never be indexed (crawlers would only see an empty shell),
// but links from them may still be followed.
export const metadata: Metadata = {
  title: "Course player",
  robots: { index: false, follow: true },
};

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      {children}
    </div>
  );
}
