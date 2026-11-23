import { Skeleton } from '@/components/ui/skeleton';

export default function AbsencesLoading() {
  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6 space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Top Pre-Check Selector & 31-Day Calendar Grid */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-60" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* 31-Day Heatmap Calendar Skeleton (7 columns) */}
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center py-1">
                <Skeleton className="h-3 w-8 mx-auto" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg border border-slate-100 bg-slate-50 p-2 flex flex-col justify-between"
              >
                <Skeleton className="h-3 w-4" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Absence Requests Table Skeleton */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
