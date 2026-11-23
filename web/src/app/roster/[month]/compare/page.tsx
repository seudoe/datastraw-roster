import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitCompare } from 'lucide-react';

export default async function ComparePage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
        <div>
          <Badge className="bg-amber-600 text-white mb-1">TODO(Stage 13)</Badge>
          <div className="font-semibold text-sm text-amber-900">
            Optimization Plan Comparison ({month})
          </div>
          <div className="text-xs text-amber-700">
            Multi-profile plan comparison (BALANCED vs FAIRNESS vs COVERAGE) delivered in Stage 13.
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-600" />
            Plan Comparison
          </CardTitle>
          <CardDescription>Side-by-side metric comparison and candidate promotion.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg text-slate-400 text-sm">
          Plan comparison table and diffs render here.
        </CardContent>
      </Card>
    </div>
  );
}
