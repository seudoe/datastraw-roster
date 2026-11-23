'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitCompare,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { computeVersionDiff, type VersionDiffSummary } from '@/domain/versionDiff';
import type { DayStatus } from '@/domain/types';

export interface VersionCompareItem {
  id: string;
  version: number;
  status: string;
  profile: string;
  createdAt: string;
  createdBy: string;
  solverMeta?: any;
  entries: {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    date: string;
    status: DayStatus;
    processId?: string | null;
  }[];
}

interface CompareViewerProps {
  month: string;
  versions: VersionCompareItem[];
  defaultV1?: number;
  defaultV2?: number;
}

export function CompareViewer({ month, versions, defaultV1, defaultV2 }: CompareViewerProps) {
  const published = versions.find((v) => v.status === 'PUBLISHED');
  const latest = versions[0];

  const [v1Num, setV1Num] = useState<number>(
    defaultV1 || published?.version || versions[1]?.version || 1,
  );
  const [v2Num, setV2Num] = useState<number>(
    defaultV2 || (latest?.version !== v1Num ? latest?.version : versions[1]?.version || 1),
  );
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const versionA = versions.find((v) => v.version === v1Num);
  const versionB = versions.find((v) => v.version === v2Num);

  // Compute diff
  const diffSummary: VersionDiffSummary = useMemo(() => {
    if (!versionA || !versionB) {
      return {
        totalCellsCompared: 0,
        totalChanges: 0,
        shiftsAdded: 0,
        shiftsRemoved: 0,
        processReassignments: 0,
        statusChanges: 0,
        diffs: [],
      };
    }

    const empMap = new Map<string, { code: string; name: string }>();
    for (const e of [...versionA.entries, ...versionB.entries]) {
      if (!empMap.has(e.employeeId)) {
        empMap.set(e.employeeId, { code: e.employeeCode, name: e.employeeName });
      }
    }

    return computeVersionDiff(versionA.entries, versionB.entries, empMap);
  }, [versionA, versionB]);

  const filteredDiffs = diffSummary.diffs.filter((d) => {
    if (typeFilter !== 'ALL' && d.changeType !== typeFilter) return false;
    return true;
  });

  const metricsA = versionA?.solverMeta?.metrics;
  const metricsB = versionB?.solverMeta?.metrics;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
                <GitCompare className="h-5 w-5 text-indigo-400" />
              </span>
              <h1 className="text-xl font-bold tracking-tight">Version &amp; Profile Comparator ({month})</h1>
              <Badge className="bg-indigo-400/20 text-indigo-200 border-indigo-400/30 text-xs font-semibold">
                Cell-by-Cell Differential Analysis
              </Badge>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Compare any two candidate rosters (e.g. Published baseline vs. Re-optimized candidate
              or Ripple Engine repair) with granular shift-level delta breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/roster/${month}/versions`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur-sm transition-colors border border-white/10"
            >
              All Versions Timeline
            </Link>
            <Link
              href={`/roster/${month}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Roster Grid
            </Link>
          </div>
        </div>

        {/* Selector Row */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Base Version (A) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-300">Baseline (Version A):</span>
            <Select
              value={String(v1Num)}
              onValueChange={(val) => val && setV1Num(parseInt(val, 10))}
            >
              <SelectTrigger className="w-56 bg-slate-900 border-slate-700 text-white text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={String(v.version)}>
                    v{v.version} ({v.status}) — {v.profile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Version (B) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-300">Comparison (Version B):</span>
            <Select
              value={String(v2Num)}
              onValueChange={(val) => val && setV2Num(parseInt(val, 10))}
            >
              <SelectTrigger className="w-56 bg-slate-900 border-slate-700 text-white text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={String(v.version)}>
                    v{v.version} ({v.status}) — {v.profile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Metric Delta Comparison Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Differences */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-xs text-slate-500">Total Shift Changes</CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900">
              {diffSummary.totalChanges}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-slate-500">
            Out of {diffSummary.totalCellsCompared} shift cells compared across the month.
          </CardContent>
        </Card>

        {/* Coverage Rate Delta */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-xs text-slate-500">Coverage Rate</CardDescription>
            <CardTitle className="text-xl font-black text-slate-900">
              {metricsA?.coverageRate ?? 100}% → {metricsB?.coverageRate ?? 100}%
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-slate-500">
            {metricsA && metricsB && metricsB.coverageRate >= metricsA.coverageRate ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                +{(metricsB.coverageRate - metricsA.coverageRate).toFixed(1)}% improvement
              </span>
            ) : (
              <span className="text-amber-600 font-bold">
                {(metricsB?.coverageRate - metricsA?.coverageRate).toFixed(1)}% delta
              </span>
            )}
          </CardContent>
        </Card>

        {/* Unfilled Gaps Delta */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-xs text-slate-500">Unfilled Gaps</CardDescription>
            <CardTitle className="text-xl font-black text-slate-900">
              {metricsA?.totalGaps ?? 0} → {metricsB?.totalGaps ?? 0} Shifts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-slate-500">
            Total unfilled demand gaps between baseline and candidate.
          </CardContent>
        </Card>

        {/* Shifts Reassigned / Swapped */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-xs text-slate-500">Process Swaps</CardDescription>
            <CardTitle className="text-2xl font-black text-indigo-600">
              {diffSummary.processReassignments}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-slate-500">
            Agents active on both plans but assigned to different brand duties.
          </CardContent>
        </Card>
      </div>

      {/* Differential Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Filter by Change:</span>
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium border ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              All Diffs ({diffSummary.totalChanges})
            </button>
            <button
              onClick={() => setTypeFilter('SHIFT_ADDED')}
              className={`px-2.5 py-1 rounded text-xs font-medium border ${
                typeFilter === 'SHIFT_ADDED'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              Shifts Added ({diffSummary.shiftsAdded})
            </button>
            <button
              onClick={() => setTypeFilter('SHIFT_REMOVED')}
              className={`px-2.5 py-1 rounded text-xs font-medium border ${
                typeFilter === 'SHIFT_REMOVED'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              Shifts Removed ({diffSummary.shiftsRemoved})
            </button>
            <button
              onClick={() => setTypeFilter('PROCESS_CHANGED')}
              className={`px-2.5 py-1 rounded text-xs font-medium border ${
                typeFilter === 'PROCESS_CHANGED'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              Process Reassigned ({diffSummary.processReassignments})
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Comparing <strong>v{v1Num}</strong> against <strong>v{v2Num}</strong>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3 text-center">Version A (v{v1Num})</th>
                  <th className="py-2.5 px-3 text-center">Version B (v{v2Num})</th>
                  <th className="py-2.5 px-3">Change Type</th>
                  <th className="py-2.5 px-3">Differential Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDiffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {v1Num === v2Num
                        ? 'Identical versions selected: 0 differences.'
                        : 'No cell differences found for the selected filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredDiffs.map((diff, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {diff.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{diff.employeeName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{diff.employeeCode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            diff.beforeStatus === 'WORK'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-mono text-[10px]'
                              : 'bg-slate-100 text-slate-600 font-mono text-[10px]'
                          }
                        >
                          {diff.beforeStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            diff.afterStatus === 'WORK'
                              ? 'bg-emerald-600 text-white font-mono text-[10px]'
                              : 'bg-slate-200 text-slate-700 font-mono text-[10px]'
                          }
                        >
                          {diff.afterStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          className={
                            diff.changeType === 'SHIFT_ADDED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[10px]'
                              : diff.changeType === 'SHIFT_REMOVED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 font-mono text-[10px]'
                              : diff.changeType === 'PROCESS_CHANGED'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono text-[10px]'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 font-mono text-[10px]'
                          }
                        >
                          {diff.changeType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {diff.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
