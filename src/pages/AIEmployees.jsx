import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Brain, Plus, X, LayoutDashboard, BookTemplate, Users } from 'lucide-react';
import AIEmployeeDashboard from '@/components/aiemployees/AIEmployeeDashboard';
import AIEmployeeTemplates from '@/components/aiemployees/AIEmployeeTemplates';
import AIEmployeeCard from '@/components/aiemployees/AIEmployeeCard';

export default function AIEmployees() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    ai_name: '', skill: '', skill_level: 1,
    passive_income_rate: 500, system_instructions: '',
    schedule_type: 'interval', schedule_interval_mins: 60, schedule_cron: '0 * * * *',
    status: 'active', efficiency: 100, accumulated_income: 0, total_earned: 0,
  });

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['aiEmployeeManager', playerData?.id],
    queryFn: () => base44.entities.AIEmployeeManager.filter({ base_id: playerData.id }),
    enabled: !!playerData,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AIEmployeeManager.create({
      ...data,
      base_id: playerData.id,
      facility_id: playerData.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aiEmployeeManager', playerData?.id] });
      setShowCreate(false);
      setNewEmployee({
        ai_name: '', skill: '', skill_level: 1,
        passive_income_rate: 500, system_instructions: '',
        schedule_type: 'interval', schedule_interval_mins: 60, schedule_cron: '0 * * * *',
        status: 'active', efficiency: 100, accumulated_income: 0, total_earned: 0,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AIEmployeeManager.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aiEmployeeManager', playerData?.id] }),
  });

  const handleApplyTemplate = (template) => {
    setNewEmployee({
      ai_name: template.name,
      skill: template.skill || '',
      skill_level: template.skill_level || 1,
      passive_income_rate: template.passive_income_rate || 500,
      system_instructions: template.system_instructions || '',
      schedule_type: template.schedule_type || 'interval',
      schedule_interval_mins: template.schedule_interval_mins || 60,
      schedule_cron: template.schedule_cron || '0 * * * *',
      status: 'active', efficiency: 100, accumulated_income: 0, total_earned: 0,
    });
    setShowCreate(true);
  };

  // Build a simple recent activity log from employee data
  const recentLogs = employees.flatMap(e => [
    e.last_collection ? { message: `${e.ai_name} — income collected`, time: new Date(e.last_collection).toLocaleTimeString(), type: 'active' } : null,
    e.status === 'upgrading' ? { message: `${e.ai_name} — currently upgrading`, time: 'now', type: 'idle' } : null,
  ]).filter(Boolean).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Brain className="w-6 h-6 text-blue-400" />
              AI Employee Management
            </CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> New Employee</>}
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-1">Manage your AI-powered workforce</p>
        </CardHeader>
      </Card>

      {/* Create Form */}
      {showCreate && (
        <Card className="glass-panel border-blue-500/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-blue-300 font-semibold">New AI Employee</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name *</label>
                <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newEmployee.ai_name} onChange={e => setNewEmployee(p => ({ ...p, ai_name: e.target.value }))} placeholder="AI Name" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Skill</label>
                <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newEmployee.skill} onChange={e => setNewEmployee(p => ({ ...p, skill: e.target.value }))} placeholder="e.g. logistics" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Skill Level (1-10)</label>
                <input type="number" min="1" max="10" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newEmployee.skill_level} onChange={e => setNewEmployee(p => ({ ...p, skill_level: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Income Rate ($/hr)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newEmployee.passive_income_rate} onChange={e => setNewEmployee(p => ({ ...p, passive_income_rate: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Schedule Type</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newEmployee.schedule_type} onChange={e => setNewEmployee(p => ({ ...p, schedule_type: e.target.value }))}>
                  <option value="interval">Interval</option>
                  <option value="cron">Cron</option>
                </select>
              </div>
              {newEmployee.schedule_type === 'interval' ? (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Interval (mins)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    value={newEmployee.schedule_interval_mins} onChange={e => setNewEmployee(p => ({ ...p, schedule_interval_mins: parseInt(e.target.value) || 60 }))} />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Cron Expression</label>
                  <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono"
                    value={newEmployee.schedule_cron} onChange={e => setNewEmployee(p => ({ ...p, schedule_cron: e.target.value }))} />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">System Instructions</label>
              <textarea rows={2} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white resize-none"
                value={newEmployee.system_instructions} onChange={e => setNewEmployee(p => ({ ...p, system_instructions: e.target.value }))}
                placeholder="What should this employee do?" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => createMutation.mutate(newEmployee)} disabled={!newEmployee.ai_name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600 text-gray-300 data-[state=active]:text-white">
            <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="employees" className="data-[state=active]:bg-blue-600 text-gray-300 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-1" /> Employees ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-blue-600 text-gray-300 data-[state=active]:text-white">
            <BookTemplate className="w-4 h-4 mr-1" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <AIEmployeeDashboard employees={employees} recentLogs={recentLogs} />
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          {employees.length === 0 ? (
            <Card className="glass-panel border-blue-500/20">
              <CardContent className="py-12 text-center">
                <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No AI employees yet</p>
                <p className="text-xs text-gray-500 mt-1">Create one above or apply a template</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map(emp => (
                <AIEmployeeCard key={emp.id} employee={emp} playerId={playerData?.id} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card className="glass-panel border-purple-500/20">
            <CardContent className="p-4">
              <AIEmployeeTemplates onApplyTemplate={handleApplyTemplate} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}