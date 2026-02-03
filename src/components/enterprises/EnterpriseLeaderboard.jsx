import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Shield, Swords, Crown } from 'lucide-react';

export default function EnterpriseLeaderboard({ playerData }) {
  const { data: leaderboardData = [] } = useQuery({
    queryKey: ['enterpriseLeaderboard'],
    queryFn: async () => {
      const players = await base44.entities.Player.list();
      const enterprises = await base44.entities.CriminalEnterprise.list();
      const sabotages = await base44.entities.EconomicSabotage.list();
      
      const leaderboard = players.map(player => {
        const playerEnterprises = enterprises.filter(e => e.owner_id === player.id);
        const totalRevenue = playerEnterprises.reduce((sum, e) => sum + (e.total_revenue || 0), 0);
        
        const successfulAttacks = sabotages.filter(s => 
          s.attacker_faction_id === player.id && s.status === 'completed'
        ).length;
        
        const successfulDefenses = sabotages.filter(s => 
          s.target_player_id === player.id && s.status === 'thwarted'
        ).length;

        const influenceScore = 
          totalRevenue / 1000 + 
          playerEnterprises.length * 500 + 
          successfulAttacks * 300 + 
          successfulDefenses * 200 +
          (player.endgame_points || 0) * 100;

        return {
          player_id: player.id,
          player_username: player.username,
          total_revenue: totalRevenue,
          total_enterprises: playerEnterprises.length,
          criminal_influence_score: Math.floor(influenceScore),
          successful_attacks: successfulAttacks,
          successful_defenses: successfulDefenses,
          level: player.level
        };
      });

      return leaderboard
        .sort((a, b) => b.criminal_influence_score - a.criminal_influence_score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
        .slice(0, 50);
    },
    refetchInterval: 60000
  });

  const playerRanking = leaderboardData.find(entry => entry.player_id === playerData?.id);

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Enterprise Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {playerRanking && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">Your Rank</span>
              <Badge className="bg-gradient-to-r from-purple-600 to-cyan-600 text-lg px-3 py-1">
                #{playerRanking.rank}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-gray-400">Revenue</p>
                <p className="text-green-400 font-semibold">${playerRanking.total_revenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Influence</p>
                <p className="text-purple-400 font-semibold">{playerRanking.criminal_influence_score.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Enterprises</p>
                <p className="text-cyan-400 font-semibold">{playerRanking.total_enterprises}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {leaderboardData.slice(0, 10).map((entry, index) => {
            const isCurrentPlayer = entry.player_id === playerData?.id;
            
            return (
              <div
                key={entry.player_id}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrentPlayer
                    ? 'bg-purple-900/30 border-purple-500/50'
                    : 'bg-slate-900/50 border-purple-500/20 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-600 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-700 text-gray-300'
                  }`}>
                    {index === 0 && <Crown className="w-5 h-5" />}
                    {index > 0 && `#${index + 1}`}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{entry.player_username}</span>
                      {isCurrentPlayer && <Badge className="bg-purple-600">You</Badge>}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {entry.criminal_influence_score.toLocaleString()} influence
                      </span>
                      <span>${entry.total_revenue.toLocaleString()}</span>
                      <span>{entry.total_enterprises} enterprises</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="text-center">
                      <Swords className="w-4 h-4 text-red-400 mx-auto" />
                      <span className="text-xs text-gray-400">{entry.successful_attacks}</span>
                    </div>
                    <div className="text-center">
                      <Shield className="w-4 h-4 text-blue-400 mx-auto" />
                      <span className="text-xs text-gray-400">{entry.successful_defenses}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}