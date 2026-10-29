import type { Metadata } from "next";
import { RecentView } from "@/features/library";

export const metadata: Metadata = {
  title: "Recently watched",
  description:
    "The YouTube videos and playlists you opened most recently, with lesson counts and progress — ready to pick up where you left off.",
};

export default RecentView;
