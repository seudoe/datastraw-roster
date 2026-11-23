'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  History,
  GitCompare,
  ExternalLink,
  ShieldCheck,
  Clock,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export interface RosterVersionSummary {
  id: string;
  month: string;
  version: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'SUPERSEDED';
  profile: string;
  parentId?: string | null;
  createdBy: string;
  createdAt: string;
  solverMeta?: any;
  entryCount: number;
}

interface VersionsViewerProps {
  month: string;
  versions: RosterVersionSummary[];
  canPublish: boolean;
}

export function VersionsViewer({ month, versions, canPublish }: VersionsViewerProps) {
  const router = useRouter();
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const publishedVersion = versions.find((v) => v.status === 'PUBLISHED');

  const handlePublish = async (rosterId: string, versionNum: number) => {
    setPublishingId(rosterId);
    try {
      const res = await fetch(`/api/rosters/${rosterId}/publish`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to publish roster version');
      }
      toast.success(`Roster Version ${versionNum} successfully published!`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
                <History className="h-5 w-5 text-indigo-400" />
              </span>
              <h1 className="text-xl font-bold tracking-tight">Roster Version Timeline ({month})</h1>
              <Badge className="bg-indigo-400/20 text-indigo-200 border-indigo-400/30 text-xs font-semibold">
                {versions.length} Total Versions
              </Badge>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Every generation, re-optimization, manual cell revision, and Ripple Engine repair is
              versioned with full immutability and provenance tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/roster/${month}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Return to Roster Grid
            </Link>
          </div>
        </div>
      </div>

      {/* Version List */}
      <div className="space-y-4">
        {versions.length === 0 ? (
          <Card className="border-dashed border-slate-300 py-16 text-center text-xs text-slate-500">
            No versions generated yet for {month}.
          </Card>
        ) : (
          versions.map((ver) => {
            const dateStr = ver.createdAt.replace('T', ' ').slice(0, 19);
            const metrics = ver.solverMeta?.metrics;
            const solveTime = ver.solverMeta?.solveTimeSec;

            return (
              <Card
                key={ver.id}
                className={`transition-all border ${
                  ver.status === 'PUBLISHED'
                    ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                    : 'border-slate-200'
                }`}
              >
                <CardHeader className="pb-3 pt-4 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                        Version {ver.version}
                      </span>
                      <Badge
                        className={
                          ver.status === 'PUBLISHED'
                            ? 'bg-emerald-600 text-white font-bold text-xs'
                            : ver.status === 'SUPERSEDED'
                            ? 'bg-slate-500 text-white text-xs'
                            : 'bg-amber-600 text-white text-xs'
                        }
                      >
                        {ver.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono font-medium">
                        Profile: {ver.profile}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>By {ver.createdBy}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-5 pb-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200 text-xs mb-4">
                    <div>
                      <div className="text-slate-500 text-[11px]">Roster Entries</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {ver.entryCount} Shifts
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Coverage Rate</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {metrics?.coverageRate !== undefined ? `${metrics.coverageRate}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Unfilled Gaps</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {metrics?.totalGaps !== undefined ? `${metrics.totalGaps} Shifts` : '0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Solver Run Time</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {solveTime !== undefined ? `${solveTime}s (CP-SAT)` : 'Immediate'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/roster/${month}?version=${ver.version}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-200 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                        Open in Grid
                      </Link>

                      {publishedVersion && publishedVersion.version !== ver.version && (
                        <Link
                          href={`/roster/${month}/compare?v1=${publishedVersion.version}&v2=${ver.version}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors"
                        >
                          <GitCompare className="h-3.5 w-3.5 text-indigo-600" />
                          Compare with Published (v{publishedVersion.version})
                        </Link>
                      )}
                    </div>

                    {ver.status !== 'PUBLISHED' && canPublish && (
                      <Button
                        onClick={() => handlePublish(ver.id, ver.version)}
                        disabled={publishingId === ver.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-8"
                      >
                        {publishingId === ver.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        Publish Version {ver.version}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
