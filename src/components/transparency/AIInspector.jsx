import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, ChevronRight, Brain, ShieldAlert, Gauge } from 'lucide-react';

const priorityColor = { low: 'text-gray-400', medium: 'text-blue-400', high: 'text-amber-400', critical: 'text-red-400' };
const riskColor = { low: 'text-green-400', medium: 'text-yellow-400', high: 'text-orange-400', extreme: 'text-red-400' };
const statusColor = { pending: 'text-gray-400', executing: 'text-blue-400', completed: 'text-green-400', failed: 'text-red-400' };

export default function AIInspector() {
  const [agent, setAgent] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const { data: decisions, isLoading } = useQuery({
    queryKey: ['ai-decisions', agent],
    queryFn: async () => {
      const f = agent === 'all' ? {} : { agent_name: agent };
      return base44.entities.AIDecisionLog.filter(f, '-created_date', 100);
    },
  });

  const agents = ['all', ...Array.from(new Set((decisions || []).map((d) => d.agent_name)))];

  return (
    <Card className="glass-panel border border-violet-500/30">
      <CardHeader className="border-b border-violet-500/20">
        <CardTitle className="text-white text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-violet-400" /> Explainable AI Inspector</CardTitle>
        <p className="text-xs text-gray-400 mt-1">Every AI action records its goal, priority, inputs, decision, expected & actual results, confidence, and risk. Inspect why any AI made any decision.</p>
        <div className="flex items-center gap-2 mt-2">
          <select value={agent} onChange={(e) => setAgent(e.target.value)} className="bg-slate-800 text-gray-200 text-xs rounded-md border border-gray-700 px-2 py-1">
            {agents.map((a) => <option key={a} value={a}>{a === 'all' ? 'All Agents' : a}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading decisions…</div>
        ) : (decisions || []).length === 0 ? (
          <p className="text-sm text-gray-500 py-12 text-center">No AI decisions logged yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {decisions.map((d) => (
              <div key={d.id} className="hover:bg-slate-800/40">
                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="w-full text-left p-3 flex items-center gap-3">
                  {expanded === d.id ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <span className="text-xs font-mono text-violet-300 w-40 truncate">{d.decision_id}</span>
                  <Badge variant="outline" className={`text-xs capitalize ${priorityColor[d.priority] || 'text-gray-400'}`}>{d.priority}</Badge>
                  <span className="text-sm text-gray-200 flex-1 truncate"><span className="text-violet-300">{d.agent_name}:</span> {d.decision}</span>
                  <Gauge className={`w-4 h-4 ${d.confidence >= 70 ? 'text-green-400' : d.confidence >= 40 ? 'text-yellow-400' : 'text-red-400'}`} />
                  <span className="text-xs text-gray-400">{d.confidence}%</span>
                </button>
                {expanded === d.id && (
                  <div className="px-12 pb-4 text-xs space-y-2 bg-slate-900/40">
                    <Field label="Agent" value={d.agent_name} />
                    <Field label="Goal" value={d.goal} />
                    <Field label="Priority" value={d.priority} color={priorityColor[d.priority]} />
                    <Field label="Decision" value={d.decision} />
                    <Field label="Reasoning" value={d.reasoning} />
                    <Field label="Expected Result" value={d.expected_result} />
                    <Field label="Actual Result" value={d.actual_result || 'pending…'} />
                    <Field label="Confidence" value={`${d.confidence}%`} />
                    <Field label="Risk" value={d.risk} color={riskColor[d.risk]} icon={<ShieldAlert className="w-3 h-3" />} />
                    <Field label="Status" value={d.status} color={statusColor[d.status]} />
                    <Field label="Affected" value={`${d.affected_entity_name || '—'} (${d.affected_entity_id || '—'})`} />
                    {d.inputs && <Field label="Inputs Considered" value={<pre className="text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(d.inputs, null, 1)}</pre>} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const Field = ({ label, value, color, icon }) => (
  <div className="flex gap-2 items-start">
    <span className="text-gray-500 w-32 shrink-0">{label}:</span>
    <span className={`flex items-center gap-1 break-all ${color || 'text-gray-200'}`}>{icon}{value}</span>
  </div>
);