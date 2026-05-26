import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Settings, Clock, DollarSign, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const STATUS_COLORS = {
  active: 'bg-green-600',
  idle: 'bg-yellow-600',
  offline: 'bg-gray-600',
  upgrading: 'bg-purple-600',
};

export default function AIEmployeeCard({ employee, playerId }) {
  const [expanded, setExpanded] = useState(false);
  const [scheduleType, setScheduleType] = useState(employee.schedule_type || 'interval');
  const [intervalMins, setIntervalMins] = useState(employee.schedule_interval_mins || 60);
  const [cronExpr, setCronExpr] = useState(employee.schedule_cron || '0 * * * *');
  const [instructions, setInstructions] = useState(employee.system_instructions || '');
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.AIEmployeeManager.update(employee.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aiEmployeeManager', playerId] }),
  });

  const collectMutation = useMutation({
    mutationFn: async () => {
      const accumulated = employee.accumulated_income || 0;
      if (accumulated <= 0) return;
      const players = await base44.entities.Player.filter({ id: playerId });
      const player = players[0];
      if (!player) return;
      await Promise.all([
        base44.entities.AIEmployeeManager.update(employee.id, {
          accumulated_income: 0,
          total_earned: (employee.total_earned || 0) + accumulated,
          last_collection: new Date().toISOString(),
        }),
        base44.entities.Player.update(player.id, {
          buy_power: (player.buy_power || 0) + accumulated,
        }),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aiEmployeeManager', playerId] });
      qc.invalidateQueries({ queryKey: ['player'] });
    },
  });

  const handleSaveConfig = () => {
    saveMutation.mutate({
      schedule_type: scheduleType,
      schedule_interval_mins: intervalMins,
      schedule_cron: cronExpr,
      system_instructions: instructions,
    });
  };

  return (
    <Card className="glass-panel border-blue-500/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">{employee.ai_name}</h3>
            <p className="text-xs text-gray-400">{employee.skill} · Level {employee.skill_level}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[employee.status] || 'bg-gray-600'} text-xs`}>
              {employee.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="bg-slate-900/40 rounded p-2 text-center">
            <DollarSign className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
            <p className="text-gray-400">Rate</p>
            <p className="text-green-400 font-semibold">${employee.passive_income_rate}/hr</p>
          </div>
          <div className="bg-slate-900/40 rounded p-2 text-center">
            <Zap className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
            <p className="text-gray-400">Efficiency</p>
            <p className="text-cyan-400 font-semibold">{employee.efficiency || 100}%</p>
          </div>
          <div className="bg-slate-900/40 rounded p-2 text-center">
            <Clock className="w-3 h-3 text-purple-400 mx-auto mb-0.5" />
            <p className="text-gray-400">Pending</p>
            <p className="text-purple-400 font-semibold">${(employee.accumulated_income || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(employee.accumulated_income || 0) > 0 && (
            <Button size="sm" className="flex-1 bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/30 text-xs"
              onClick={() => collectMutation.mutate()} disabled={collectMutation.isPending}>
              Collect ${(employee.accumulated_income || 0).toLocaleString()}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white"
            onClick={() => setExpanded(!expanded)}>
            <Settings className="w-3 h-3 mr-1" />
            Config
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
            <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide flex items-center gap-1">
              <Settings className="w-3 h-3" /> Schedule & Task Config
            </p>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Schedule Type</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={scheduleType} onChange={e => setScheduleType(e.target.value)}>
                <option value="interval">Interval (every N minutes)</option>
                <option value="cron">Cron Expression</option>
              </select>
            </div>

            {scheduleType === 'interval' ? (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Interval (minutes)</label>
                <input type="number" min="5" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={intervalMins} onChange={e => setIntervalMins(parseInt(e.target.value) || 60)} />
                <p className="text-xs text-gray-500 mt-0.5">Minimum: 5 minutes</p>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Cron Expression</label>
                <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono"
                  value={cronExpr} onChange={e => setCronExpr(e.target.value)} placeholder="0 * * * *" />
                <p className="text-xs text-gray-500 mt-0.5">Format: minute hour day month weekday</p>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">System Instructions</label>
              <textarea rows={3} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white resize-none"
                value={instructions} onChange={e => setInstructions(e.target.value)}
                placeholder="What should this employee focus on?" />
            </div>

            <div className="flex justify-end">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                onClick={handleSaveConfig} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Config'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}