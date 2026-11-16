import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-8" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-4">
            <Skeleton className="h-16 w-full" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="h-24 w-full" />
      </Card>
      <Card className="p-4">
        <Skeleton className="h-48 w-full" />
      </Card>
      <Card className="p-4">
        <Skeleton className="h-40 w-full" />
      </Card>
    </div>
  );
}
