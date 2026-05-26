import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Brain, Users, CheckCircle, Clock, XCircle, Activity, Zap } from 'lucide-react';

const STATUS_COLORS = {
  active: '#22c55e',
  idle: '#f59e0b',
  offline: '#6b7280',
  upgrading: '#8b5cf6',
};

const STATUS_ICONS = {
  active: CheckCircle,
  idle: Clock,
  offline: XCircle,
  upgrading: Zap,
};

export default function AIEmployeeDashboard({ employees, recentLogs }) {
  const totalActive = employees.filter(e => e.status === 'active').length;
  const totalAccumulated = employees.reduce((sum, e) => sum + (e.accumulated_income || 0), 0);
  const totalEarned = employees.reduce((sum, e) => sum + (e.total_earned || 0), 0);
  const avgEfficiency = employees.length > 0
    ? (employees.reduce((sum, e) => sum + (e.efficiency || 100), 0) / employees.length).toFixed(0)
    : 100;

  const statusCounts = employees.reduce((acc, e) => {
    const s = e.status || 'idle';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status] || '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-400">{totalActive}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-2xl font-bold text-blue-400">{employees.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-cyan-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Avg Efficiency</p>
              <p className="text-2xl font-bold text-cyan-400">{avgEfficiency}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Total Earned</p>
              <p className="text-2xl font-bold text-purple-400">${totalEarned.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="glass-panel border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">No employees yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Event Log */}
        <Card className="glass-panel border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Recent Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {recentLogs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
              ) : (
                recentLogs.map((log, i) => {
                  const Icon = STATUS_ICONS[log.type] || Activity;
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Icon className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-300">{log.message}</span>
                        <span className="text-gray-600 ml-2">{log.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}