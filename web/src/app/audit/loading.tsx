import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLoading() {
  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6 space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Tabs & Search Filter Bar Skeleton */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Event Timeline Rows Skeleton */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            <Skeleton className="h-3 w-28 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
