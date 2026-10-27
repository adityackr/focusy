import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Connect your free YouTube Data API v3 key in ~2 minutes. Your key stays in this browser's localStorage and never touches a server.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      {children}
    </div>
  );
}