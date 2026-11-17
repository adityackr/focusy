import type { Metadata } from "next";
import { BookmarksView } from "@/features/bookmarks";

export const metadata: Metadata = {
  title: "Bookmarks",
  description:
    "Important moments from your YouTube lessons, grouped by lesson — with a short description and a link that jumps straight to the second.",
};

export default BookmarksView;
