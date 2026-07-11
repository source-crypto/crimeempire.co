import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, ListChecks, Sparkles, ShieldCheck } from 'lucide-react';

const DIFF_META = {
  easy: 'bg-green-600', medium: 'bg-yellow-600', hard: 'bg-orange-600', extreme: 'bg-red-600',
};
const TYPE_LABEL = {
  story: 'Story', side_quest: 'Side Quest', crew_mission: 'Crew Mission',
  faction_conflict: 'Faction Conflict', heist_preparation: 'Heist Prep',
};

export default function DirectorMissionCard({ spec, onAccept, disabled }) {
  return (
    <Card className="glass-panel border-cyan-500/20 flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-white font-bold leading-tight">{spec.title}</h4>
          <Badge className={`${DIFF_META[spec.difficulty] || 'bg-slate-600'} text-white`}>{spec.difficulty}</Badge>
        </div>
        <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 w-fit mb-2 text-xs">{TYPE_LABEL[spec.mission_type] || spec.mission_type}</Badge>
        <p className="text-xs text-gray-400 mb-3">{spec.narrative}</p>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ListChecks className="w-3 h-3" /> Objectives</p>
          <ul className="space-y-1">
            {spec.objectives.map((o, i) => <li key={i} className="text-xs text-gray-300 flex gap-1"><span className="text-cyan-400">{i + 1}.</span>{o.description}</li>)}
          </ul>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="p-2 rounded bg-green-950/30 border border-green-500/20"><p className="text-gray-400">Crypto</p><p className="text-green-400 font-bold">${spec.rewards.crypto.toLocaleString()}</p></div>
          <div className="p-2 rounded bg-purple-950/30 border border-purple-500/20"><p className="text-gray-400">XP</p><p className="text-purple-400 font-bold">{spec.rewards.experience}</p></div>
          <div className="p-2 rounded bg-yellow-950/30 border border-yellow-500/20"><p className="text-gray-400">Rep</p><p className="text-yellow-400 font-bold">+{spec.rewards.reputation}</p></div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Director Reasoning</p>
          <div className="flex flex-wrap gap-1">
            {spec.factorList.map((f, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-purple-500/20 text-gray-400">{f.factor_type}: {f.reason}</span>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          {spec.requirements.crew_required && <p className="text-[10px] text-orange-400 mb-2 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Crew required</p>}
          <Button size="sm" className="w-full bg-gradient-to-r from-green-600 to-emerald-600" onClick={onAccept} disabled={disabled}>
            <CheckCircle className="w-4 h-4 mr-1" /> Accept Mission
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}