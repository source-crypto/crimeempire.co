import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CloudRain, Shield, TrendingUp, Swords, Crown, Users, AlertTriangle } from 'lucide-react';

function gaugeColor(v) {
  if (v >= 75) return 'bg-red-500';
  if (v >= 50) return 'bg-orange-500';
  if (v >= 30) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function WorldStatePanel({ worldState }) {
  const ws = worldState || {};
  const tiles = [
    { label: 'Time of Day', value: ws.timeOfDay?.label || '—', icon: Clock, color: 'text-cyan-400' },
    { label: 'Weather', value: ws.weather?.label || '—', icon: CloudRain, color: 'text-blue-400' },
    { label: 'Police Presence', value: `${ws.policePresence ?? 0}/100`, icon: Shield, color: 'text-red-400', gauge: ws.policePresence },
    { label: 'Economy', value: (ws.economicCondition || 'stable').toUpperCase(), icon: TrendingUp, color: ws.economicCondition === 'boom' ? 'text-green-400' : ws.economicCondition === 'crash' ? 'text-red-400' : 'text-yellow-400' },
    { label: 'Territory Tension', value: `${ws.territoryTension ?? 0}/100`, icon: Swords, color: 'text-orange-400', gauge: ws.territoryTension },
    { label: 'Reputation Tier', value: `Tier ${ws.repTier ?? 1}`, icon: Crown, color: 'text-yellow-400' },
    { label: 'Faction Activity', value: `${ws.factionActivity ?? 0} ops`, icon: Users, color: 'text-purple-400' },
    { label: 'Escalation', value: (ws.escalation || 'normal').toUpperCase(), icon: AlertTriangle, color: ws.escalation === 'critical' ? 'text-red-400' : ws.escalation === 'high' ? 'text-orange-400' : 'text-green-400' },
  ];
  return (
    <Card className="glass-panel border-purple-500/20">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Live World State</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="p-3 rounded-lg bg-slate-900/40 border border-purple-500/10">
                <div className="flex items-center gap-1 mb-1"><Icon className="w-3.5 h-3.5 opacity-70" /><span className="text-xs text-gray-400">{t.label}</span></div>
                <p className={`text-sm font-bold ${t.color}`}>{t.value}</p>
                {t.gauge != null && (
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2"><div className={`h-full rounded-full ${gaugeColor(t.gauge)}`} style={{ width: `${t.gauge}%` }} /></div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}