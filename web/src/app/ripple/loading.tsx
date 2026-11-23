import { Skeleton } from '@/components/ui/skeleton';

export default function RippleLoading() {
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
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Scenario Presets Skeleton */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-md" />
        </div>
      </div>

      {/* 2-Column Split: Config & Blast Radius */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Setup Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <Skeleton className="h-5 w-44" />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-full bg-indigo-100" />
            </div>
          </div>
        </div>

        {/* Right Col: Blast Radius Results (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            {/* Blast summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
            {/* Ranked Fixes Skeleton */}
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-36" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
