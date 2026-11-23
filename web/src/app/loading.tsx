import { Skeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 animate-in fade-in-50 duration-300">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Alert Callout Skeleton */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <div className="space-y-1.5 w-full max-w-xl">
            <Skeleton className="h-4 w-60" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 shrink-0" />
      </div>

      {/* 2-Column Main Section Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((col) => (
          <div key={col} className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="space-y-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-7 w-20" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((row) => (
                <div key={row} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
