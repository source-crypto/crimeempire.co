import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Vote, Crown, Landmark, Clock, Coins, Play, Trophy } from 'lucide-react';
import CandidateCard from '@/components/elections/CandidateCard';
import VoteDialog from '@/components/elections/VoteDialog';
import { startElectionCycle, completeElection, castVote, tallyResults, getCurrentHolder } from '@/lib/electionEngine';

const OFFICE_META = {
  mayor: { label: 'Mayor', icon: Landmark, color: 'amber', ring: 'border-amber-500/30', text: 'text-amber-300' },
  president: { label: 'President', icon: Crown, color: 'purple', ring: 'border-purple-500/30', text: 'text-purple-300' },
};

function timeLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Voting closed';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function OfficeElection({ office, player }) {
  const qc = useQueryClient();
  const meta = OFFICE_META[office];
  const Icon = meta.icon;

  const { data: holder } = useQuery({
    queryKey: ['electionHolder', office],
    queryFn: () => getCurrentHolder(office),
  });

  const { data: activeElection, isLoading } = useQuery({
    queryKey: ['activeElection', office],
    queryFn: async () => {
      const r = await base44.entities.Election.filter({ office, status: 'voting' }, '-cycle_number', 1);
      return r[0] || null;
    },
    refetchInterval: 15000,
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['electionVotes', activeElection?.id],
    queryFn: () => base44.entities.ElectionVote.filter({ election_id: activeElection.id }),
    enabled: !!activeElection?.id,
    refetchInterval: 10000,
  });

  const results = useMemo(() => tallyResults(votes), [votes]);
  const totalCrypto = results.reduce((s, r) => s + r.crypto, 0);

  const candidateRows = useMemo(() => {
    if (!activeElection) return [];
    return activeElection.candidates
      .map((c) => {
        const r = results.find((x) => x.candidate_id === c.player_id);
        return { ...c, crypto: r?.crypto || 0, votes: r?.votes || 0 };
      })
      .sort((a, b) => b.crypto - a.crypto);
  }, [activeElection, results]);

  const [voteCandidate, setVoteCandidate] = useState(null);
  const [busy, setBusy] = useState(false);

  const ended = activeElection && new Date(activeElection.ends_at) <= new Date();

  useEffect(() => {
    if (activeElection && ended) {
      (async () => {
        await completeElection(activeElection);
        qc.invalidateQueries(['activeElection', office]);
        qc.invalidateQueries(['electionHolder', office]);
      })();
    }
  }, [activeElection, ended, office, qc]);

  const handleStart = async () => {
    setBusy(true);
    try {
      await startElectionCycle(office);
      qc.invalidateQueries(['activeElection', office]);
    } finally { setBusy(false); }
  };

  const handleVote = async (amount) => {
    setBusy(true);
    try {
      await castVote({ election: activeElection, player, candidate: voteCandidate, cryptoAmount: amount });
      qc.invalidateQueries(['electionVotes', activeElection.id]);
      qc.invalidateQueries(['activeElection', office]);
      qc.invalidateQueries(['player']);
      setVoteCandidate(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {/* Current office holder */}
      <Card className={`glass-panel ${meta.ring}`}>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center"><Icon className={`w-5 h-5 ${meta.text}`} /></div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Current {meta.label}</p>
              <p className={`text-lg font-bold ${meta.text}`}>{holder?.winner_username || 'Office vacant'}</p>
              {holder && <p className="text-xs text-gray-500">Cycle {holder.cycle_number} · since {new Date(holder.completed_at || holder.ends_at).toLocaleDateString()}</p>}
            </div>
          </div>
          <div className="text-xs text-gray-500 max-w-[220px]">
            Rule: no player may hold Mayor and President at the same time, ever. The other office's holder is barred from candidacy.
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" /></div>}

      {!isLoading && !activeElection && (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-8 text-center">
            <Trophy className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-300 mb-4">No active {meta.label} election cycle. Start the next one to nominate 50 random citizens.</p>
            <Button onClick={handleStart} disabled={busy || !player} className="bg-purple-600 hover:bg-purple-500">
              <Play className="w-4 h-4" /> Start {meta.label} Cycle
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && activeElection && ended && (
        <Card className="glass-panel border-purple-500/20"><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" /><p className="text-gray-300">Voting closed — tallying results & declaring winner…</p></CardContent></Card>
      )}

      {!isLoading && activeElection && !ended && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span className="px-2 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300">Cycle {activeElection.cycle_number}</span>
              <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3.5 h-3.5" />{timeLeft(activeElection.ends_at)}</span>
              <span className="flex items-center gap-1 text-cyan-400"><Coins className="w-3.5 h-3.5" />{totalCrypto.toLocaleString()} voted</span>
              <span className="text-gray-400">{activeElection.total_vote_count || 0} votes cast</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {candidateRows.map((c, i) => (
              <CandidateCard key={c.player_id} candidate={c} rank={i + 1} totalCrypto={totalCrypto} onVote={setVoteCandidate} disabled={busy || !player} />
            ))}
          </div>
        </>
      )}

      {voteCandidate && (
        <VoteDialog
          candidate={voteCandidate}
          maxCrypto={player?.crypto_balance || 0}
          open={!!voteCandidate}
          onClose={() => setVoteCandidate(null)}
          onConfirm={handleVote}
          busy={busy}
        />
      )}
    </div>
  );
}

export default function Elections() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: player } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0] || null; },
    enabled: !!user?.email,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
          <Vote className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Elections</h1>
          <p className="text-sm text-gray-400">Crypto-weighted voting for Mayor &amp; President · 50 random nominees per cycle</p>
        </div>
      </div>

      {player && (
        <Card className="glass-panel border-cyan-500/20">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm text-gray-300">Your crypto available to vote with</span>
            <span className="text-lg font-bold text-cyan-400 flex items-center gap-1"><Coins className="w-4 h-4" />{(player.crypto_balance || 0).toLocaleString()}</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mayor">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="mayor"><Landmark className="w-4 h-4 mr-1" /> Mayor</TabsTrigger>
          <TabsTrigger value="president"><Crown className="w-4 h-4 mr-1" /> President</TabsTrigger>
        </TabsList>
        <TabsContent value="mayor" className="mt-4"><OfficeElection office="mayor" player={player} /></TabsContent>
        <TabsContent value="president" className="mt-4"><OfficeElection office="president" player={player} /></TabsContent>
      </Tabs>
    </div>
  );
}