'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [podId, setPodId] = useState('');
  const [primarySkill, setPrimarySkill] = useState<'CS' | 'ACC' | 'NDR' | 'RETENTION'>('CS');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to load employees');
      return res.json();
    },
  });

  const { data: pods = [] } = useQuery({
    queryKey: ['pods'],
    queryFn: async () => {
      const res = await fetch('/api/pods');
      if (!res.ok) throw new Error('Failed to load pods');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      return data;
    },
    onSuccess: () => {
      toast.success('Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsCreateOpen(false);
      setCode('');
      setName('');
      setEmail('');
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      return data;
    },
    onSuccess: () => {
      toast.success('Employee deleted');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !podId) {
      toast.error('Please fill in code, name, and pod');
      return;
    }
    createMutation.mutate({
      code,
      name,
      email,
      podId,
      skills: [primarySkill],
      weeklyOffsPerWeek: 1,
      preferredOffWeekdays: [0],
      unavailableWeekdays: [],
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Employee Directory ({employees.length})
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage agents, qualification skills, pod allocations, and weekly-off preferences.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="h-4 w-4" /> Add Employee
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Employee Code</label>
                <Input
                  placeholder="e.g. EMP033"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <Input
                  placeholder="e.g. Vikram Malhotra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <Input
                  type="email"
                  placeholder="vikram@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Assigned Pod</label>
                <Select value={podId} onValueChange={(v) => v && setPodId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pod" />
                  </SelectTrigger>
                  <SelectContent>
                    {pods.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Primary Skill</label>
                <Select value={primarySkill} onValueChange={(val: any) => setPrimarySkill(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CS">Customer Support (CS)</SelectItem>
                    <SelectItem value="ACC">Accounts (ACC)</SelectItem>
                    <SelectItem value="NDR">Non-Delivery Reporting (NDR)</SelectItem>
                    <SelectItem value="RETENTION">Retention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 text-white">
                  {createMutation.isPending ? 'Saving...' : 'Create Employee'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Pod</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Weekly Off Pref</TableHead>
                <TableHead>Blocked Days</TableHead>
                <TableHead>Assigned Brands</TableHead>
                <TableHead className="w-16 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No employees found. Seed demo data to populate.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp: any) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-mono font-bold text-xs text-indigo-700">
                      {emp.code}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{emp.name}</div>
                      <div className="text-xs text-slate-500">{emp.email || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-slate-700 bg-slate-100">
                        {emp.pod?.name || 'Unassigned'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {emp.skills.map((skill: string) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-[10px] bg-sky-50 text-sky-800 border-sky-200"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {emp.preferredOffWeekdays?.map((w: number) => dayNames[w]).join(', ') || 'Sun'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {emp.unavailableWeekdays?.length > 0 ? (
                        <span className="text-rose-600 font-medium">
                          {emp.unavailableWeekdays.map((w: number) => dayNames[w]).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-700">
                        {emp.assignments?.length || 0} process(es)
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete employee ${emp.name}?`)) {
                            deleteMutation.mutate(emp.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
