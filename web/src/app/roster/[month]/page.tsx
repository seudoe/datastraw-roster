import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

export default async function RosterMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
        <div>
          <Badge className="bg-amber-600 text-white mb-1">TODO(Stage 7–9)</Badge>
          <div className="font-semibold text-sm text-amber-900">
            Monthly Roster Grid Workspace ({month})
          </div>
          <div className="text-xs text-amber-700">
            Primary 5-view roster grid (Company, Pods, Brands, Processes, Employees) will be delivered in Stages 7–9.
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Monthly Roster Grid ({month})
          </CardTitle>
          <CardDescription>
            Scheduled for integration once CP-SAT solver generation orchestration is established in Stage 7.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg text-slate-400 text-sm">
          Roster interactive matrix, cell editing, conflict chips, and live validation will render here.
        </CardContent>
      </Card>
    </div>
  );
}
