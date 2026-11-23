import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export default function AbsencesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
        <div>
          <Badge className="bg-amber-600 text-white mb-1">TODO(Stage 10)</Badge>
          <div className="font-semibold text-sm text-amber-900">
            Absence Management &amp; Safe-to-Approve Calendar
          </div>
          <div className="text-xs text-amber-700">
            Pre-approval leave impact analysis (green/amber/red days) delivered in Stage 10.
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Leave &amp; Comp-Off Management
          </CardTitle>
          <CardDescription>
            Safe-to-Approve calendar and leave request workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg text-slate-400 text-sm">
          Absence request table and Safe-to-Approve Calendar preview render here.
        </CardContent>
      </Card>
    </div>
  );
}
