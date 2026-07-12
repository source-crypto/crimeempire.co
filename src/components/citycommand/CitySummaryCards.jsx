import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Map as MapIcon, Building2, TrendingUp } from 'lucide-react';

function MiniCard({ icon: Icon, title, children, color }) {
  return (
    <Card className="glass-panel border-purple-500/20">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-2"><Icon className={`w-4 h-4 ${color}`} /> {title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-bold ${tone || 'text-white'}`}>{value}</span>
    </div>
  );
}

export default function CitySummaryCards({ lawEnforcement = [], territories = [], properties = [], playerCrewId, worldState }) {
  const police = useMemo(() => {
    const active = lawEnforcement.filter(u => u.is_active !== false);
    const byType = {};
    active.forEach(u => { byType[u.unit_type] = (byType[u.unit_type] || 0) + 1; });
    const avgThreat = active.length ? Math.round(active.reduce((s, u) => s + (u.threat_level || 50), 0) / active.length) : 0;
    return { count: active.length, byType, avgThreat };
  }, [lawEnforcement]);

  const turf = useMemo(() => {
    const contested = territories.filter(t => t.is_contested).length;
    const owned = territories.filter(t => t.controlling_crew_id === playerCrewId).length;
    return { total: territories.length, contested, owned };
  }, [territories, playerCrewId]);

  const biz = useMemo(() => {
    const avgCond = properties.length ? Math.round(properties.reduce((s, p) => s + (p.condition ?? 100), 0) / properties.length) : 0;
    const income = properties.reduce((s, p) => s + (p.income_per_hour || 0), 0);
    const illicit = properties.filter(p => p.legitimacy === 'illicit').length;
    return { count: properties.length, avgCond, income, illicit };
  }, [properties]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <MiniCard icon={Shield} title="Police" color="text-red-400">
        <div className="space-y-1">
          <Stat label="Active units" value={police.count} tone="text-red-400" />
          <Stat label="Avg threat" value={`${police.avgThreat}/100`} tone={police.avgThreat > 60 ? 'text-red-400' : 'text-yellow-400'} />
          <div className="pt-1 flex flex-wrap gap-1">
            {Object.entries(police.byType).map(([t, n]) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-red-500/20 text-gray-400">{t}: {n}</span>
            ))}
          </div>
        </div>
      </MiniCard>

      <MiniCard icon={MapIcon} title="Territory" color="text-orange-400">
        <div className="space-y-1">
          <Stat label="Total districts" value={turf.total} tone="text-cyan-400" />
          <Stat label="Your turf" value={turf.owned} tone="text-green-400" />
          <Stat label="Contested" value={turf.contested} tone={turf.contested > 0 ? 'text-red-400' : 'text-gray-400'} />
        </div>
      </MiniCard>

      <MiniCard icon={Building2} title="Businesses" color="text-green-400">
        <div className="space-y-1">
          <Stat label="Owned" value={biz.count} tone="text-cyan-400" />
          <Stat label="Avg condition" value={`${biz.avgCond}%`} tone={biz.avgCond > 70 ? 'text-green-400' : 'text-yellow-400'} />
          <Stat label="Income/hr" value={`$${biz.income.toLocaleString()}`} tone="text-green-400" />
          <Stat label="Illicit" value={biz.illicit} tone={biz.illicit > 0 ? 'text-purple-400' : 'text-gray-400'} />
        </div>
      </MiniCard>

      <MiniCard icon={TrendingUp} title="World Systems" color="text-purple-400">
        <div className="space-y-1">
          <Stat label="Time" value={worldState?.timeOfDay?.label || '—'} tone="text-cyan-400" />
          <Stat label="Weather" value={worldState?.weather?.label || '—'} tone="text-blue-400" />
          <Stat label="Economy" value={(worldState?.economicCondition || 'stable').toUpperCase()} tone={worldState?.economicCondition === 'boom' ? 'text-green-400' : worldState?.economicCondition === 'crash' ? 'text-red-400' : 'text-yellow-400'} />
          <Stat label="Escalation" value={(worldState?.escalation || 'normal').toUpperCase()} tone={worldState?.escalation === 'critical' ? 'text-red-400' : 'text-gray-400'} />
        </div>
      </MiniCard>
    </div>
  );
}