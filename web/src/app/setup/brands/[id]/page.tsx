'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Calendar, Users, Layers, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: brandId } = use(params);
  const queryClient = useQueryClient();

  // Dialog states
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);

  // Form states
  const [processName, setProcessName] = useState('');
  const [processType, setProcessType] = useState<'CS' | 'ACC' | 'NDR' | 'RETENTION'>('CS');
  const [defaultMinStaff, setDefaultMinStaff] = useState('1');

  // Coverage rule form
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [ruleWeekday, setRuleWeekday] = useState('0'); // 0=Sun
  const [ruleMinStaff, setRuleMinStaff] = useState('2');
  const [ruleNote, setRuleNote] = useState('');

  // Assignment form
  const [assignProcessId, setAssignProcessId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignRole, setAssignRole] = useState<'PRIMARY' | 'BACKUP'>('PRIMARY');

  const { data: brand, isLoading } = useQuery({
    queryKey: ['brand', brandId],
    queryFn: async () => {
      const res = await fetch(`/api/brands/${brandId}`);
      if (!res.ok) throw new Error('Failed to load brand');
      return res.json();
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createProcessMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create process');
      return data;
    },
    onSuccess: () => {
      toast.success('Process created');
      queryClient.invalidateQueries({ queryKey: ['brand', brandId] });
      setIsProcessDialogOpen(false);
      setProcessName('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createRuleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/coverage-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create rule');
      return data;
    },
    onSuccess: () => {
      toast.success('Coverage rule added');
      queryClient.invalidateQueries({ queryKey: ['brand', brandId] });
      setIsRuleDialogOpen(false);
      setRuleNote('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`/api/coverage-rules/${ruleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rule');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Coverage rule removed');
      queryClient.invalidateQueries({ queryKey: ['brand', brandId] });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create assignment');
      return data;
    },
    onSuccess: () => {
      toast.success('Assignment created');
      queryClient.invalidateQueries({ queryKey: ['brand', brandId] });
      setIsAssignmentDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete assignment');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Assignment deleted');
      queryClient.invalidateQueries({ queryKey: ['brand', brandId] });
    },
  });

  if (isLoading || !brand) {
    return <div className="text-center py-12 text-slate-500">Loading brand configuration...</div>;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/setup/brands"
            className={buttonVariants({ variant: 'outline', size: 'icon', className: 'h-9 w-9' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                {brand.code}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{brand.name}</h1>
              <Badge variant={brand.priority === 3 ? 'destructive' : 'secondary'}>
                Priority {brand.priority}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Governing Calendar:{' '}
              <span className="font-semibold text-slate-700">
                {brand.calendar?.name} ({brand.calendar?.rule})
              </span>
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="processes" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="processes" className="gap-2 text-xs">
            <Layers className="h-4 w-4" /> Processes ({brand.processes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2 text-xs">
            <Calendar className="h-4 w-4" /> Coverage Rules
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2 text-xs">
            <Users className="h-4 w-4" /> Staff Assignments
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Processes */}
        <TabsContent value="processes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">Operating Processes</h2>
            <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="bg-indigo-600 text-white gap-1.5">
                    <Plus className="h-4 w-4" /> Add Process
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Operating Process</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Process Name</label>
                    <Input
                      placeholder="e.g. Chat & Email Desk"
                      value={processName}
                      onChange={(e) => setProcessName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Process Type</label>
                    <Select value={processType} onValueChange={(v: any) => setProcessType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CS">Customer Support (CS)</SelectItem>
                        <SelectItem value="ACC">Accounts Escalation (ACC)</SelectItem>
                        <SelectItem value="NDR">Non-Delivery Reporting (NDR)</SelectItem>
                        <SelectItem value="RETENTION">Retention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Default Required Staff</label>
                    <Input
                      type="number"
                      min={0}
                      value={defaultMinStaff}
                      onChange={(e) => setDefaultMinStaff(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        createProcessMutation.mutate({
                          brandId,
                          name: processName,
                          type: processType,
                          defaultMinStaff: Number(defaultMinStaff),
                        })
                      }
                      className="bg-indigo-600 text-white"
                    >
                      Save Process
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Process Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Default Staff</TableHead>
                  <TableHead>Calendar Override</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.processes.map((proc: any) => (
                  <TableRow key={proc.id}>
                    <TableCell className="font-semibold text-slate-900">{proc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        {proc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{proc.defaultMinStaff} person/day</TableCell>
                    <TableCell>
                      {proc.calendar ? (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-800">
                          {proc.calendar.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Inherits brand calendar</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 2: Coverage Rules */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">Day-Specific Minimum Staffing Rules</h2>
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="bg-indigo-600 text-white gap-1.5">
                    <Plus className="h-4 w-4" /> Add Coverage Rule
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Specific Coverage Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Target Process</label>
                    <Select value={selectedProcessId} onValueChange={(v) => v && setSelectedProcessId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select process" />
                      </SelectTrigger>
                      <SelectContent>
                        {brand.processes.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Day of the Week</label>
                    <Select value={ruleWeekday} onValueChange={(v) => v && setRuleWeekday(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((day, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            Every {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Minimum Required Staff</label>
                    <Input
                      type="number"
                      min={0}
                      value={ruleMinStaff}
                      onChange={(e) => setRuleMinStaff(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Note (Optional)</label>
                    <Input
                      placeholder="e.g. High weekend chat volume"
                      value={ruleNote}
                      onChange={(e) => setRuleNote(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        createRuleMutation.mutate({
                          processId: selectedProcessId || brand.processes[0]?.id,
                          weekday: Number(ruleWeekday),
                          minStaff: Number(ruleMinStaff),
                          note: ruleNote,
                        })
                      }
                      className="bg-indigo-600 text-white"
                    >
                      Save Rule
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Process</TableHead>
                  <TableHead>Applicable Condition</TableHead>
                  <TableHead>Min Staff</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-16 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.processes.flatMap((p: any) => p.rules).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-500 text-xs">
                      No specific rules configured (all days use default process staffing).
                    </TableCell>
                  </TableRow>
                ) : (
                  brand.processes.flatMap((p: any) =>
                    p.rules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-semibold text-xs">{p.name}</TableCell>
                        <TableCell className="text-xs font-medium text-indigo-700">
                          {rule.date
                            ? `Date: ${rule.date.split('T')[0]}`
                            : rule.weekday !== null
                            ? `Every ${dayNames[rule.weekday]}`
                            : 'Default'}
                        </TableCell>
                        <TableCell className="font-bold">{rule.minStaff} person(s)</TableCell>
                        <TableCell className="text-xs text-slate-500">{rule.note || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )),
                  )
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 3: Assignments */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">Assigned Staff Members</h2>
            <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="bg-indigo-600 text-white gap-1.5">
                    <Plus className="h-4 w-4" /> Assign Employee
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Employee to Process</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Target Process</label>
                    <Select value={assignProcessId} onValueChange={(v) => v && setAssignProcessId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select process" />
                      </SelectTrigger>
                      <SelectContent>
                        {brand.processes.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Employee</label>
                    <Select value={assignEmployeeId} onValueChange={(v) => v && setAssignEmployeeId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} ({e.code}) — {e.skills.join(', ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Assignment Role</label>
                    <Select value={assignRole} onValueChange={(v: any) => setAssignRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIMARY">PRIMARY (Main Owner)</SelectItem>
                        <SelectItem value="BACKUP">BACKUP (Cross-trained Floater)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        createAssignmentMutation.mutate({
                          processId: assignProcessId || brand.processes[0]?.id,
                          employeeId: assignEmployeeId,
                          role: assignRole,
                          allocationPct: 100,
                        })
                      }
                      className="bg-indigo-600 text-white"
                    >
                      Assign
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead className="w-16 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.processes.flatMap((p: any) => p.assignments).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-500 text-xs">
                      No employees assigned to this brand yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  brand.processes.flatMap((p: any) =>
                    p.assignments.map((asgn: any) => (
                      <TableRow key={asgn.id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{asgn.employee.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{asgn.employee.code}</div>
                        </TableCell>
                        <TableCell className="text-xs">{p.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={asgn.role === 'PRIMARY' ? 'default' : 'secondary'}
                            className={
                              asgn.role === 'PRIMARY'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }
                          >
                            {asgn.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{asgn.allocationPct}%</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAssignmentMutation.mutate(asgn.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )),
                  )
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
