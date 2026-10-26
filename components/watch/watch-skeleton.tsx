import { Skeleton } from "@/components/ui/skeleton";

function LessonRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-2">
      <Skeleton className="h-14 w-24 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function WatchSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading playlist" className="mx-auto max-w-350 px-4 py-4 sm:px-6 lg:py-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <div className="ml-auto flex gap-1.5">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="hidden h-8 w-20 rounded-lg sm:block" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Main column */}
        <div className="min-w-0">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-7 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/4" />
          <Skeleton className="mt-4 h-28 w-full rounded-2xl" />
        </div>

        {/* Lesson sidebar */}
        <aside className="min-w-0">
          <div className="rounded-2xl border p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
            <Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="mt-3 h-9 w-full rounded-xl" />
            <div className="mt-3 space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <LessonRowSkeleton key={i} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
