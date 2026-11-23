import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

export default async function VersionsPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
        <div>
          <Badge className="bg-amber-600 text-white mb-1">TODO(Stage 12)</Badge>
          <div className="font-semibold text-sm text-amber-900">
            Roster Version History ({month})
          </div>
          <div className="text-xs text-amber-700">
            Immutable version timeline, changelogs, and cell diffs delivered in Stage 12.
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            Version History
          </CardTitle>
          <CardDescription>Full audit trail of published roster versions.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg text-slate-400 text-sm">
          Interactive version list and cell diff viewer render here.
        </CardContent>
      </Card>
    </div>
  );
}
