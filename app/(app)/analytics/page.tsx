import type { Metadata } from "next";
import { AnalyticsView } from "@/features/analytics";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Your local learning analytics — active learning time, consistency, course progress, Studio practice and goals, all stored in this browser.",
};

export default AnalyticsView;
