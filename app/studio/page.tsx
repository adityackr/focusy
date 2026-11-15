import type { Metadata } from "next";
import { StudioPrototype } from "@/features/studio";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Edit a coding project while you follow a Focusy tutorial, with a live preview.",
  robots: { index: false, follow: false },
};

export default function StudioPrototypePage() {
  return <StudioPrototype />;
}
