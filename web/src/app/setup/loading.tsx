import { Skeleton } from '@/components/ui/skeleton';

export default function SetupLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Search & Actions Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4 shadow-xs">
        <Skeleton className="h-9 w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="py-3 flex items-center justify-between border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
