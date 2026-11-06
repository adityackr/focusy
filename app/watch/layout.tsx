import { AppShell } from "@/features/shell";

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}