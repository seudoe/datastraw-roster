import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Cpu, ShieldCheck, Zap, Layers, RefreshCw } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">RosterIQ</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              Stage 1 Initialized
            </Badge>
          </div>
          <p className="text-slate-600 mt-1">
            Smart Roster Management &amp; Change-Impact Simulation System
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-slate-900 text-white">Next.js 16 + React 19</Badge>
          <Badge className="bg-sky-600 text-white">Google OR-Tools CP-SAT</Badge>
          <Button asChild size="sm" variant="outline">
            <Link href="/roster/2026-12">Open Demo</Link>
          </Button>
        </div>
      </div>

      {/* Hero Overview */}
      <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-white">Reliable Roster Optimization with Independent Verification</CardTitle>
          <CardDescription className="text-slate-300">
            Resolves complex D2C multi-brand operating calendars and staffing rules with CP-SAT mathematical optimization, zero timezone bugs, and instant blast-radius impact analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
            <Cpu className="h-6 w-6 text-sky-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm">OR-Tools Solver</div>
              <div className="text-xs text-slate-300">Stateless CP-SAT Microservice</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm">TS Domain Core</div>
              <div className="text-xs text-slate-300">Pure calendar rules &amp; validator</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
            <Zap className="h-6 w-6 text-amber-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Ripple Engine</div>
              <div className="text-xs text-slate-300">Leave impact &amp; ranked fixes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Calendar className="h-5 w-5" />
              <CardTitle className="text-base">Roster Grid</CardTitle>
            </div>
            <CardDescription>
              5 synchronized views: Company, Pods, Brands, Processes, and Employees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Stage 7–9</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <RefreshCw className="h-5 w-5" />
              <CardTitle className="text-base">Ripple Simulator</CardTitle>
            </div>
            <CardDescription>
              Simulate leave blast radius and apply minimal-disruption CP-SAT repairs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Stage 10</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Layers className="h-5 w-5" />
              <CardTitle className="text-base">Resilience Heatmap</CardTitle>
            </div>
            <CardDescription>
              SPOF analysis, brand bus factor, and employee criticality index.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Stage 11</Badge>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
