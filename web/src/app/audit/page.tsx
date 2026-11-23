import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

export default function AuditPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
        <div>
          <Badge className="bg-amber-600 text-white mb-1">TODO(Stage 12)</Badge>
          <div className="font-semibold text-sm text-amber-900">
            System Audit Trail &amp; Notification Center
          </div>
          <div className="text-xs text-amber-700">
            Mutation logging, actor audit history, and notification feeds delivered in Stage 12.
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Audit Log Trail
          </CardTitle>
          <CardDescription>
            Complete history of managerial approvals, roster edits, and config changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg text-slate-400 text-sm">
          Searchable audit events table and notification log will render here.
        </CardContent>
      </Card>
    </div>
  );
}
