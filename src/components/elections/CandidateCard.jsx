import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Vote as VoteIcon } from 'lucide-react';

export default function CandidateCard({ candidate, rank, totalCrypto, onVote, disabled }) {
  const pct = totalCrypto > 0 ? Math.min(100, ((candidate.crypto || 0) / totalCrypto) * 100) : 0;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <Card className="glass-panel border-purple-500/20">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-gray-500 w-5">#{rank}</span>
          {medal && <span className="text-base">{medal}</span>}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{candidate.username}</p>
            <p className="text-xs text-gray-500">Level {candidate.level || 1}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-cyan-400 flex items-center gap-1"><Coins className="w-3 h-3" />{(candidate.crypto || 0).toLocaleString()}</span>
          <span className="text-gray-500">{candidate.votes || 0} votes</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-500" onClick={() => onVote(candidate)} disabled={disabled}>
          <VoteIcon className="w-3.5 h-3.5" /> Vote
        </Button>
      </CardContent>
    </Card>
  );
}