import { Skeleton } from "@/shared/ui/skeleton";

export default function CourseSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-5 w-2/3" />
            </div>
            <Skeleton className="h-7 w-24 shrink-0 rounded-lg" />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 flex-1 rounded-lg" />
          </div>
        </section>
        <aside className="overflow-hidden rounded-xl border">
          <div className="border-b px-3 py-2">
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-1 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </aside>
      </div>
      <div className="mt-4 space-y-2 border-t pt-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-1.5 w-full" />
      </div>
    </main>
  );
}