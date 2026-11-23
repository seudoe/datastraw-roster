'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Calendar,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RosterViewMode } from './types';
import type { Conflict } from '@/domain/validator/types';

interface RosterToolbarProps {
  month: string;
  activeVersion: number;
  availableVersions: { version: number; status: string; createdAt: string }[];
  onSelectVersion: (version: number) => void;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'SUPERSEDED';
  viewMode: RosterViewMode;
  onViewModeChange: (mode: RosterViewMode) => void;
  conflicts: Conflict[];
  onOpenConflictSheet: () => void;
  onRegenerate: (profile: string) => Promise<void>;
  onPublish: () => Promise<void>;
  canEdit: boolean;
}

export function RosterToolbar({
  month,
  activeVersion,
  availableVersions,
  onSelectVersion,
  status,
  viewMode,
  onViewModeChange,
  conflicts,
  onOpenConflictSheet,
  onRegenerate,
  onPublish,
  canEdit,
}: RosterToolbarProps) {
  const [isRegenOpen, setIsRegenOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('BALANCED');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const errorCount = conflicts.filter((c) => c.severity === 'ERROR' && !c.acknowledged).length;
  const warnCount = conflicts.filter((c) => c.severity === 'WARN' && !c.acknowledged).length;

  const handleRunSolve = async () => {
    setIsGenerating(true);
    try {
      await onRegenerate(selectedProfile);
      setIsRegenOpen(false);
      toast.success(`Generated optimized roster using ${selectedProfile} profile`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishClick = async () => {
    if (errorCount > 0) {
      toast.error(
        `Cannot publish: ${errorCount} unacknowledged critical conflict(s). Inspect and acknowledge exceptions first.`,
      );
      onOpenConflictSheet();
      return;
    }

    setIsPublishing(true);
    try {
      await onPublish();
      toast.success('Roster published successfully! Prior published versions superseded.');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Roster Workspace ({month})
              </h1>
              <Badge
                className={
                  status === 'PUBLISHED'
                    ? 'bg-emerald-600 text-white'
                    : status === 'DRAFT'
                    ? 'bg-indigo-600 text-white'
                    : status === 'IN_REVIEW'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-400 text-white'
                }
              >
                {status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-dimensional shift scheduling matrix and live constraint compliance inspector.
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Version Switcher */}
          {availableVersions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Version:</span>
              <Select
                value={String(activeVersion)}
                onValueChange={(val) => {
                  if (val) onSelectVersion(parseInt(val, 10));
                }}
              >
                <SelectTrigger className="w-28 h-8 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableVersions.map((v) => (
                    <SelectItem key={v.version} value={String(v.version)}>
                      v{v.version} ({v.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conflict Inspector Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenConflictSheet}
            className={`gap-1.5 h-8 text-xs font-semibold ${
              errorCount > 0
                ? 'border-rose-300 text-rose-700 bg-rose-50/70 hover:bg-rose-100'
                : warnCount > 0
                ? 'border-amber-300 text-amber-700 bg-amber-50/70 hover:bg-amber-100'
                : 'text-slate-700 hover:text-indigo-600'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Conflicts ({errorCount + warnCount})
          </Button>

          {/* Re-generate CP-SAT Dialog */}
          {canEdit && (
            <Dialog open={isRegenOpen} onOpenChange={setIsRegenOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    Re-Optimize
                  </Button>
                }
              />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Re-Optimize Roster with CP-SAT
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Choose an objective weight profile to trade off coverage, agent preferences, and fairness.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div
                    onClick={() => setSelectedProfile('BALANCED')}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProfile === 'BALANCED'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-900 flex items-center justify-between">
                      <span>BALANCED (Recommended)</span>
                      <Badge variant="outline">Default</Badge>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Equitable balance between client SLA coverage ($100k gap penalty) and staff rest targets.
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedProfile('COVERAGE_FIRST')}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProfile === 'COVERAGE_FIRST'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-900">COVERAGE_FIRST</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Aggressive $500k gap penalty prioritizing client SLAs above all agent preferences.
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedProfile('FAIRNESS_FIRST')}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProfile === 'FAIRNESS_FIRST'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-900">FAIRNESS_FIRST</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Minimizes weekend shift spread and enforces equal rest day distribution across the pod.
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedProfile('PREFERENCE_FIRST')}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProfile === 'PREFERENCE_FIRST'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-900">PREFERENCE_FIRST</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Heavily honors preferred weekly-off days ($1,500 penalty per violation).
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsRegenOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRunSolve}
                    disabled={isGenerating}
                    className="bg-indigo-600 text-white"
                  >
                    {isGenerating ? 'Solving with CP-SAT...' : 'Run Optimization'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Publish Button (if DRAFT) */}
          {canEdit && status === 'DRAFT' && (
            <Button
              size="sm"
              onClick={handlePublishClick}
              disabled={isPublishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isPublishing ? 'Publishing...' : 'Publish Roster'}
            </Button>
          )}

          {/* Ripple Simulator Link */}
          <Link
            href="/ripple"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'h-8 text-xs font-semibold text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100 gap-1.5',
            })}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Ripple Simulator
          </Link>
        </div>
      </div>

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> Views:
          </span>

          <Button
            size="xs"
            variant={viewMode === 'COMPANY' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('COMPANY')}
            className={viewMode === 'COMPANY' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600'}
          >
            1. Company Matrix
          </Button>

          <Button
            size="xs"
            variant={viewMode === 'PODS' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('PODS')}
            className={viewMode === 'PODS' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600'}
          >
            2. Pods Scoped
          </Button>

          <Button
            size="xs"
            variant={viewMode === 'BRANDS' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('BRANDS')}
            className={viewMode === 'BRANDS' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600'}
          >
            3. Brands SLA (25)
          </Button>

          <Button
            size="xs"
            variant={viewMode === 'PROCESSES' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('PROCESSES')}
            className={viewMode === 'PROCESSES' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600'}
          >
            4. Processes View
          </Button>

          <Button
            size="xs"
            variant={viewMode === 'EMPLOYEES' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('EMPLOYEES')}
            className={viewMode === 'EMPLOYEES' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600'}
          >
            5. Agent Schedules
          </Button>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Click any cell to edit shift &amp; lock assignment
        </div>
      </div>
    </div>
  );
}
