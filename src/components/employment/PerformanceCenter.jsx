import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, Brain } from 'lucide-react';
import { toast } from 'sonner';

const KPI_DEFS = [
  { key: 'productivity', label: 'Productivity', icon: '⚡' },
  { key: 'attendance', label: 'Attendance', icon: '📅' },
  { key: 'reliability', label: 'Reliability', icon: '🎯' },
  { key: 'leadership', label: 'Leadership', icon: '👥' },
  { key: 'teamwork', label: 'Teamwork', icon: '🤝' },
  { key: 'efficiency', label: 'Efficiency', icon: '⚙️' },
  { key: 'innovation', label: 'Innovation', icon: '💡' },
  { key: 'customer_satisfaction', label: 'Cust. Satisfaction', icon: '😊' },
  { key: 'training_progress', label: 'Training', icon: '📚' },
];

const scoreColor = (v) => (v >= 80 ? 'text-green-400' : v >= 60 ? 'text-yellow-400' : 'text-red-400');
const barColor = (v) => (v >= 80 ? 'bg-green-500' : v >= 60 ? 'bg-yellow-500' : 'bg-red-500');

export default function PerformanceCenter({ metrics, employment, onRunReview, onAIReview, running }) {
  const [period, setPeriod] = useState('monthly');
  const latest = (metrics || []).find((m) => m.period === period) || metrics?.[0];

  return (
    <div className="space-y-4">
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20 flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2"><Activity className="w-5 h-5 text-purple-400" />Performance Dashboard</CardTitle>
          <div className="flex gap-1">
            {['weekly', 'monthly', 'annual', 'lifetime'].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded text-xs capitalize ${period === p ? 'bg-purple-700 text-white' : 'bg-slate-800 text-gray-400'}`}>
                {p}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {!latest ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No {period} review on record yet.</p>
              <p className="text-xs">Run a performance review to generate transparent KPIs.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-gray-700">
                <div>
                  <p className="text-xs text-gray-400">Overall Score</p>
                  <p className={`text-3xl font-bold ${scoreColor(latest.overall_score)}`}>{Math.round(latest.overall_score)}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>Period: {latest.period_label || latest.period}</p>
                  <p>Current Rating: {employment?.performance_rating}/100</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {KPI_DEFS.map((kpi) => {
                  const v = latest[kpi.key] ?? 0;
                  return (
                    <div key={kpi.key} className="p-3 rounded-lg bg-slate-900/50 border border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{kpi.icon} {kpi.label}</span>
                        <span className={`text-sm font-bold ${scoreColor(v)}`}>{Math.round(v)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div className={`h-full ${barColor(v)} transition-all`} style={{ width: `${Math.min(100, v)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {latest.notes && (
                <div className="bg-slate-900/50 rounded p-3 border border-gray-700 text-xs text-gray-300">
                  <p className="font-semibold text-gray-200 mb-1">Review Notes</p>
                  {latest.notes}
                </div>
              )}
            </>
          )}

          <div className="flex gap-2">
            <Button onClick={onRunReview} disabled={running} className="flex-1 bg-purple-600 hover:bg-purple-700">
              <RefreshCw className="w-4 h-4" /> {running ? 'Reviewing…' : `Run ${period} Review`}
            </Button>
            <Button onClick={onAIReview} disabled={running} variant="outline" className="flex-1 border-purple-500/40 text-purple-300">
              <Brain className="w-4 h-4" /> AI Performance Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}