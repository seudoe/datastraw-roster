'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export function GuidedDemoBanner() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetSeed = async () => {
    if (!confirm('Reset database to clean deterministic state (32 employees, 25 brands, December 2026 baseline)?')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/scenarios/reset-seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Demo data successfully reset');
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to reset seed');
      }
    } catch {
      toast.error('Network error during reset');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <aside aria-label="Demo Walkthrough Guide" className="bg-slate-900 border-b border-indigo-900/60 text-white shrink-0 shadow-md">
      {/* Collapsed Pill / Minimal Bar */}
      <div className="px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 text-[11px] font-bold tracking-wide uppercase px-2 py-0.5">
            Assessment Evaluator Tour
          </Badge>
          <span className="text-xs text-slate-300 hidden sm:inline font-medium">
            Test the 4 core assessment scenarios &amp; Ripple Engine with 1 click:
          </span>
          {/* Quick Scenario Pills when collapsed */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/ripple?employeeCode=EMP002&startDate=2026-12-08&endDate=2026-12-10"
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors font-medium flex items-center gap-1"
            >
              <Zap className="h-3 w-3 text-amber-400" /> Scenario 1: Sole Resource
            </Link>
            <Link
              href="/ripple?employeeCode=EMP021&startDate=2026-12-28&endDate=2026-12-29"
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors font-medium flex items-center gap-1"
            >
              <ShieldAlert className="h-3 w-3 text-sky-400" /> Scenario 2: Qualification
            </Link>
            <Link
              href="/ripple?employeeCode=EMP018&startDate=2026-12-21&endDate=2026-12-23"
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors font-medium flex items-center gap-1"
            >
              <Layers className="h-3 w-3 text-purple-400" /> Scenario 3: Cascade Gap
            </Link>
            <Link
              href="/roster/2026-12?view=brands"
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors font-medium flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3 text-emerald-400" /> Scenario 4: Structural Gap
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-indigo-300 hover:text-white hover:bg-slate-800 h-7 px-2.5 gap-1.5"
          >
            <span>{isExpanded ? 'Hide Details' : 'Full Tour Guide'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Full Drawer */}
      {isExpanded && (
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/70 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Scenario 1 */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-400">Scenario 1</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-950/40 text-amber-300 border-amber-800">
                    Sole Resource
                  </Badge>
                </div>
                <div className="font-semibold text-xs text-white mt-1">
                  EMP002 Leave on 365-Day BR_02
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Dec 8–10 outage triggers 3-day brand gap. Floater EMP008 recommended automatically.
                </div>
              </div>
              <Link
                href="/ripple?employeeCode=EMP002&startDate=2026-12-08&endDate=2026-12-10"
                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" /> Test in Ripple
              </Link>
            </div>

            {/* Scenario 2 */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-sky-400">Scenario 2</span>
                  <Badge variant="outline" className="text-[10px] bg-sky-950/40 text-sky-300 border-sky-800">
                    Qualification
                  </Badge>
                </div>
                <div className="font-semibold text-xs text-white mt-1">
                  EMP021 NDR Lead Outage
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Dec 28–29 leave. Peer CS agents cannot cover NDR. Floater EMP032 with NDR skill borrowed.
                </div>
              </div>
              <Link
                href="/ripple?employeeCode=EMP021&startDate=2026-12-28&endDate=2026-12-29"
                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Test in Ripple
              </Link>
            </div>

            {/* Scenario 3 */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-400">Scenario 3</span>
                  <Badge variant="outline" className="text-[10px] bg-purple-950/40 text-purple-300 border-purple-800">
                    Cascade Impact
                  </Badge>
                </div>
                <div className="font-semibold text-xs text-white mt-1">
                  EMP018 Multi-Brand Cascade
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Dec 21–23 leave breaks both BR_17 &amp; BR_18. Solved via minimal-disruption CP-SAT repair.
                </div>
              </div>
              <Link
                href="/ripple?employeeCode=EMP018&startDate=2026-12-21&endDate=2026-12-23"
                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-colors"
              >
                <Layers className="h-3.5 w-3.5" /> Test in Ripple
              </Link>
            </div>

            {/* Scenario 4 */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-400">Scenario 4</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-950/40 text-emerald-300 border-emerald-800">
                    Structural Gaps
                  </Badge>
                </div>
                <div className="font-semibold text-xs text-white mt-1">
                  BR_03 &amp; BR_18 365-Day Analysis
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  1 agent + 365-day calendar = mathematically impossible coverage under 6-day labor law limit.
                </div>
              </div>
              <Link
                href="/roster/2026-12?view=brands"
                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" /> Inspect Grid
              </Link>
            </div>
          </div>

          {/* Quick links footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-800">
            <div className="flex items-center gap-4 text-slate-400">
              <span className="font-medium text-slate-300">Quick Access:</span>
              <Link href="/resilience" className="hover:text-white transition-colors flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Resilience &amp; SPOF Heatmap
              </Link>
              <Link href="/audit" className="hover:text-white transition-colors flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-purple-400" /> Audit Trail &amp; Version History
              </Link>
              <Link href="/absences?employeeCode=EMP009" className="hover:text-white transition-colors flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-400" /> Safe Dates Pre-Check (EMP009)
              </Link>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleResetSeed}
              disabled={isResetting}
              className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white h-7 px-2.5 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Demo Seed
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
