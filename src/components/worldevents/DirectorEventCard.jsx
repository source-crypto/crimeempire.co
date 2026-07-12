import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles } from 'lucide-react';

const SEV_META = { minor: 'bg-green-600', moderate: 'bg-yellow-600', major: 'bg-orange-600', catastrophic: 'bg-red-600' };

function EffectTile({ label, value, fmt }) {
  const positive = value >= 0;
  const tone = label === 'Heat' || label === 'Wanted' ? (positive ? 'text-red-400' : 'text-green-400') : (positive ? 'text-green-400' : 'text-red-400');
  const bg = label === 'Heat' ? 'bg-red-950/30 border-red-500/20' : label === 'Revenue' ? 'bg-green-950/30 border-green-500/20' : label === 'Defense' ? 'bg-blue-950/30 border-blue-500/20' : 'bg-yellow-950/30 border-yellow-500/20';
  return (
    <div className={`p-2 rounded border ${bg}`}>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className={`font-bold text-xs ${tone}`}>{fmt(value)}</p>
    </div>
  );
}

export default function DirectorEventCard({ spec, onTrigger, disabled }) {
  return (
    <Card className="glass-panel border-purple-500/20 flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-white font-bold leading-tight">{spec.title}</h4>
          <Badge className={`${SEV_META[spec.severity]} text-white`}>{spec.severity}</Badge>
        </div>
        <p className="text-xs text-gray-400 mb-3">{spec.narrative}</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <EffectTile label="Heat" value={spec.effects.heat} fmt={(v) => `${v > 0 ? '+' : ''}${v}`} />
          <EffectTile label="Revenue" value={spec.effects.revenue} fmt={(v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`} />
          <EffectTile label="Defense" value={spec.effects.defense} fmt={(v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`} />
          <EffectTile label="Wanted" value={spec.effects.wanted} fmt={(v) => `${v > 0 ? '+' : ''}${v}`} />
        </div>
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Trigger Factors</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(spec.factors).map(([k, v]) => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-purple-500/20 text-gray-400">{k}: {String(v)}</span>
            ))}
          </div>
        </div>
        <div className="mt-auto">
          <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-red-600" onClick={onTrigger} disabled={disabled}>
            <Zap className="w-4 h-4 mr-1" /> Trigger Event
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}