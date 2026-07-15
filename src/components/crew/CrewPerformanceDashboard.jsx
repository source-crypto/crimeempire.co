import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, TrendingUp, Shield, DollarSign, AlertTriangle, HeartCrack } from 'lucide-react';
import CrewMemberPerformanceRow from './CrewMemberPerformanceRow';
import LiveShiftStatus from './LiveShiftStatus';

const SORTS = [
  { key: 'performance', label: 'Performance' },
  { key: 'standing', label: 'Reputation' },
  { key: 'level', label: 'Level' },
];

function metricsFor(m) {
  const skills = m.skills || {};
  const vals = ['combat', 'stealth', 'driving', 'hacking', 'negotiation'].map(k => skills[k] ?? 0);
  const skillsAvg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
  return {
    performance: Math.round(skillsAvg * 0.7 + (m.morale ?? 75) * 0.3),
    standing: Math.round((m.morale ?? 75) * 0.5 + (m.loyalty ?? 50) * 0.5),
  };
}

export default function CrewPerformanceDashboard({ crewId }) {
  const [sort, setSort] = useState('performance');
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: crewId }, '-created_date', 100),
    enabled: !!crewId,
  });

  const enriched = useMemo(() => members.map(m => ({ ...m, _m: metricsFor(m) })), [members]);
  const sorted = useMemo(() => {
    const arr = [...enriched];
    arr.sort((a, b) => {
      if (sort === 'level') return (b.level ?? 1) - (a.level ?? 1);
      return (b._m[sort]) - (a._m[sort]);
    });
    return arr;
  }, [enriched, sort]);

  const avgPerf = enriched.length ? Math.round(enriched.reduce((s, m) => s + m._m.performance, 0) / enriched.length) : 0;
  const avgStand = enriched.length ? Math.round(enriched.reduce((s, m) => s + m._m.standing, 0) / enriched.length) : 0;
  const onMission = enriched.filter(m => m.status === 'on_mission').length;
  const injured = enriched.filter(m => m.status === 'injured').length;
  const payroll = enriched.reduce((s, m) => s + (m.salary || 0), 0);

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;

  const stats = [
    { label: 'Crew Size', value: enriched.length, icon: Users, color: 'text-purple-400' },
    { label: 'Avg Performance', value: avgPerf, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Avg Reputation', value: avgStand, icon: Shield, color: 'text-cyan-400' },
    { label: 'On Mission', value: onMission, icon: AlertTriangle, color: 'text-orange-400' },
    { label: 'Injured', value: injured, icon: HeartCrack, color: 'text-red-400' },
    { label: 'Payroll/cycle', value: `$${payroll.toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="glass-panel border-purple-500/20">
              <CardContent className="p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LiveShiftStatus crewId={crewId} />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400">Sort by:</span>
        {SORTS.map(s => (
          <button key={s.key} onClick={() => setSort(s.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${sort === s.key ? 'bg-purple-600/40 border-purple-500 text-white' : 'border-slate-700 text-gray-400 hover:border-purple-500/50'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-10 text-center text-gray-400">No crew members found. Recruit crew members first.</CardContent>
        </Card>
      ) : (
        <Card className="glass-panel border-purple-500/20 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-purple-500/20 text-xs text-gray-400 font-semibold uppercase tracking-wide">
            <div className="col-span-12 md:col-span-3">Member</div>
            <div className="col-span-6 md:col-span-3">Job Title</div>
            <div className="col-span-6 md:col-span-3">Reputation</div>
            <div className="col-span-6 md:col-span-2">Performance</div>
            <div className="col-span-6 md:col-span-1 text-right">Status</div>
          </div>
          {sorted.map(m => <CrewMemberPerformanceRow key={m.id} member={m} />)}
        </Card>
      )}
    </div>
  );
}