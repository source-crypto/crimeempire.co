import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedNumber from '@/components/shared/AnimatedNumber';

const SEASON_END = new Date('2026-05-01');
const SEASON_TITLES = ['🏆 Season Champion', '🥈 Crime Lord', '🥉 Street Boss', '💀 Enforcer', '⚔️ Soldier'];
const RANK_COLORS = ['from-yellow-600 to-yellow-400', 'from-gray-400 to-gray-300', 'from-orange-700 to-orange-500'];

function daysUntil(date) {
  return Math.max(0, Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)));
}

export default function SeasonalLeaderboard() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const p = await base44.entities.Player.filter({ created_by: user.email }); return p[0]; },
    enabled: !!user
  });
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayersLeader'],
    queryFn: () => base44.entities.Player.list('-endgame_points', 50),
    refetchInterval: 30000
  });
  const { data: allCrews = [] } = useQuery({
    queryKey: ['allCrewsLeader'],
    queryFn: () => base44.entities.Crew.list('-reputation', 20),
    refetchInterval: 30000
  });

  const topPlayers = allPlayers.filter(p => p.username).slice(0, 10);
  const topCrews = allCrews.filter(c => c.name).slice(0, 5);
  const myRank = topPlayers.findIndex(p => p.id === playerData?.id) + 1;

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-yellow-500/30 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" /> Season 1 Leaderboard
            </h1>
            <p className="text-gray-400 mt-1">Top players earn permanent titles & bonus credits next season</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Season Ends In</p>
            <p className="text-3xl font-bold text-yellow-400">{daysUntil(SEASON_END)}</p>
            <p className="text-xs text-gray-400">days</p>
          </div>
        </div>

        {myRank > 0 && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-center justify-between">
            <span className="text-yellow-300 font-semibold">Your current rank: #{myRank}</span>
            <span className="text-gray-400 text-sm">{SEASON_TITLES[Math.min(myRank - 1, 4)] || '⚔️ Soldier'}</span>
          </div>
        )}
      </div>

      {/* Season Rewards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {SEASON_TITLES.map((title, i) => (
          <Card key={i} className={`glass-panel border ${i === 0 ? 'border-yellow-500/50' : i === 1 ? 'border-gray-400/40' : i === 2 ? 'border-orange-600/40' : 'border-gray-700'}`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl mb-1">{i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⚔️'}</p>
              <p className="text-white text-xs font-bold">#{i + 1}</p>
              <p className="text-gray-300 text-xs mt-1">{title}</p>
              <p className="text-yellow-400 text-xs mt-1">+${[(100000, 50000, 25000, 10000, 5000)[i]?.toLocaleString()]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Leaderboard */}
        <Card className="glass-panel border border-yellow-500/20">
          <CardHeader><CardTitle className="text-yellow-400 flex items-center gap-2"><Crown className="w-5 h-5" />Top Players</CardTitle></CardHeader>
          <CardContent className="p-0">
            {topPlayers.map((p, i) => {
              const isMe = p.id === playerData?.id;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800/40 ${isMe ? 'bg-yellow-900/20' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-gradient-to-br ${RANK_COLORS[i] || 'from-slate-700 to-slate-600'} text-white flex-shrink-0`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isMe ? 'text-yellow-400' : 'text-white'}`}>{p.username} {isMe && '(You)'}</p>
                    <p className="text-xs text-gray-400">Lvl {p.level} · {p.crew_role || 'Solo'}</p>
                  </div>
                  <div className="text-right">
                    <AnimatedNumber value={p.endgame_points || 0} suffix=" pts" className="text-yellow-400 font-bold text-sm" />
                    <p className="text-xs text-gray-500">${((p.total_earnings || 0) / 1000).toFixed(0)}k earned</p>
                  </div>
                </motion.div>
              );
            })}
            {topPlayers.length === 0 && <p className="text-center text-gray-500 py-8">No players ranked yet.</p>}
          </CardContent>
        </Card>

        {/* Crew Leaderboard */}
        <Card className="glass-panel border border-purple-500/20">
          <CardHeader><CardTitle className="text-purple-400 flex items-center gap-2"><Star className="w-5 h-5" />Top Crews</CardTitle></CardHeader>
          <CardContent className="p-0">
            {topCrews.map((crew, i) => (
              <motion.div key={crew.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-4 py-4 border-b border-gray-800/40">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-gradient-to-br ${RANK_COLORS[i] || 'from-slate-700 to-slate-600'} text-white flex-shrink-0`}>
                  {i + 1}
                </div>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: crew.color || '#9333EA' }} />
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{crew.name}</p>
                  <p className="text-xs text-gray-400">{crew.member_count} members · {crew.territory_count} sectors</p>
                </div>
                <div className="text-right">
                  <AnimatedNumber value={crew.reputation || 0} suffix=" rep" className="text-purple-400 font-bold text-sm" />
                  <p className="text-xs text-gray-500">PWR {crew.total_power || 0}</p>
                </div>
              </motion.div>
            ))}
            {topCrews.length === 0 && <p className="text-center text-gray-500 py-8">No crews ranked yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}