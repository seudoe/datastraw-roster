import { Skeleton } from '@/components/ui/skeleton';

export default function ResilienceLoading() {
  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6 space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* KPI Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* 2-Column Section: Brand Bus Factor & Employee Criticality */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Brand Bus Factor (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-60" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Criticality Leaderboard (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 25-Brand Heatmap Skeleton */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
        <div className="space-y-1">
          <Skeleton className="h-5 w-60" />
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, row) => (
            <div key={row} className="flex items-center gap-2">
              <Skeleton className="h-5 w-40 shrink-0" />
              <div className="grid grid-cols-12 flex-1 gap-1">
                {Array.from({ length: 12 }).map((_, col) => (
                  <Skeleton key={col} className="h-5 w-full rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
