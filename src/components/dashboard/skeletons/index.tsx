import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/* KPI card skeleton — matches HomeKPICards layout                     */
/* ------------------------------------------------------------------ */
export const KpiCardSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
);

export const KpiGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <KpiCardSkeleton key={i} />
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Chart skeleton — title + animated bars                              */
/* ------------------------------------------------------------------ */
interface ChartSkeletonProps {
  height?: number;
  bars?: number;
  title?: boolean;
}
export const ChartSkeleton = ({ height = 280, bars = 8, title = true }: ChartSkeletonProps) => (
  <Card>
    {title && (
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
    )}
    <CardContent>
      <div
        className="flex items-end justify-between gap-2 px-2"
        style={{ height }}
        aria-hidden="true"
      >
        {Array.from({ length: bars }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + ((i * 13) % 65)}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Table skeleton                                                      */
/* ------------------------------------------------------------------ */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}
export const TableSkeleton = ({
  rows = 6,
  columns = 4,
  showHeader = true,
}: TableSkeletonProps) => (
  <Card>
    <CardContent className="p-0">
      <div className="divide-y">
        {showHeader && (
          <div
            className="grid gap-4 px-4 py-3 bg-muted/40"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
        )}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 w-full max-w-[180px]" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/* ------------------------------------------------------------------ */
/* List skeleton — used inside cards (engagement / activity)           */
/* ------------------------------------------------------------------ */
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-44" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full shrink-0" />
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Full dashboard skeleton — replaces the page-level spinner           */
/* ------------------------------------------------------------------ */
export const DashboardSkeleton = () => (
  <div className="space-y-6 w-full animate-fade-in" aria-busy="true" aria-live="polite">
    {/* Welcome */}
    <div className="space-y-2">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>

    {/* KPI grid */}
    <KpiGridSkeleton count={8} />

    {/* Two-column body */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <ListSkeleton rows={4} />
          </CardContent>
        </Card>
        <ChartSkeleton height={220} bars={10} />
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);
