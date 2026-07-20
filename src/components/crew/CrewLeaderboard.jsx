import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

function medalGradient(rank) {
  if (rank === 1) return 'from-yellow-400 to-amber-500';
  if (rank === 2) return 'from-gray-300 to-gray-400';
  if (rank === 3) return 'from-orange-400 to-amber-700';
  return 'from-slate-600 to-slate-700';
}

export default function CrewLeaderboard({ members }) {
  const scored = members
    .map((m) => ({ ...m, _score: (m._m?.standing || 0) + (m._m?.performance || 0) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);
  if (scored.length === 0) return null;

  return (
    <Card className="glass-panel border-amber-500/20">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Crew Leaderboard
          <span className="text-xs text-gray-500 normal-case">ranked by reputation + performance</span>
        </h3>
        <div className="space-y-2">
          {scored.map((m, i) => {
            const rank = i + 1;
            return (
              <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-900/40">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${medalGradient(rank)} flex items-center justify-center font-bold text-slate-900 text-sm shrink-0`}>
                  {rank <= 3 ? <Medal className="w-4 h-4" /> : rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{m.member_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{m.member_type} · Lvl {m.level ?? 1}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-amber-300">{m._score}</p>
                  <p className="text-[10px] text-gray-500">score</p>
                </div>
                <div className="text-right hidden sm:block shrink-0">
                  <p className="text-xs text-cyan-300">Rep {m._m?.standing ?? 0}</p>
                  <p className="text-xs text-green-300">Perf {m._m?.performance ?? 0}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}