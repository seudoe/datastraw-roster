import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

export default function RipplePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
        <div>
          <Badge className="bg-amber-600 text-white mb-1">TODO(Stage 10)</Badge>
          <div className="font-semibold text-sm text-amber-900">
            The Ripple Engine — Change-Impact Simulator
          </div>
          <div className="text-xs text-amber-700">
            Simulates blast radius of changes across brands and proposes ranked quick fixes or CP-SAT minimal-disruption repairs. Delivered in Stage 10.
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Change-Impact Simulator &amp; Blast Radius
          </CardTitle>
          <CardDescription>
            ChangeSet builder, cascade graph, ranked quick fixes, and minimal-disruption repair.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg text-slate-400 text-sm">
          ChangeSet builder, impact graph, and repair comparison will render here.
        </CardContent>
      </Card>
    </div>
  );
}
