import { Skeleton } from '@/components/ui/skeleton';

export default function RosterMonthLoading() {
  return (
    <div className="max-w-[100rem] mx-auto px-2 sm:px-4 py-4 space-y-4 animate-in fade-in-50 duration-300">
      {/* Top Toolbar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36 bg-indigo-100" />
        </div>
      </div>

      {/* Filter & View Switcher Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Roster Grid Matrix Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Table Header */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 p-3 gap-2">
          <Skeleton className="h-6 w-48 shrink-0" />
          <Skeleton className="h-6 w-32 shrink-0" />
          <div className="grid grid-cols-12 flex-1 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>

        {/* Table Rows (Simulating 12 brands) */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 10 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center p-2.5 gap-2 hover:bg-slate-50/50">
              <div className="w-48 shrink-0 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <div className="w-32 shrink-0">
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-12 flex-1 gap-1">
                {Array.from({ length: 12 }).map((_, colIdx) => (
                  <Skeleton
                    key={colIdx}
                    className={`h-7 w-full rounded ${
                      (rowIdx + colIdx) % 7 === 0 ? 'bg-slate-200/40' : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
