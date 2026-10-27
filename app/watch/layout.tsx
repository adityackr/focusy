import { TopBar } from "@/features/shell";

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      {children}
    </div>
  );
}