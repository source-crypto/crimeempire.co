import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Zap, Star, Clock } from 'lucide-react';

export default function RewardsHistory({ playerData }) {
  const { data: completedMissions = [], isLoading } = useQuery({
    queryKey: ['missions', 'completed', playerData?.id],
    queryFn: () => base44.entities.Mission.filter(
      { assigned_to_player: playerData.id, status: 'completed' },
      '-updated_date',
      50
    ),
    enabled: !!playerData?.id,
    refetchInterval: 30000
  });

  const totals = completedMissions.reduce(
    (acc, m) => ({
      crypto: acc.crypto + (m.rewards?.crypto || 0),
      experience: acc.experience + (m.rewards?.experience || 0),
      reputation: acc.reputation + (m.rewards?.reputation || 0),
    }),
    { crypto: 0, experience: 0, reputation: 0 }
  );

  const difficultyColors = {
    easy: 'bg-green-700',
    medium: 'bg-yellow-700',
    hard: 'bg-orange-700',
    extreme: 'bg-red-700'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-900/40 to-orange-900/20 border border-yellow-500/30 text-center">
          <Award className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">${totals.crypto.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Total Crypto Earned</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/30 text-center">
          <Zap className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-purple-400">{totals.experience.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Total XP Earned</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-900/40 to-blue-900/20 border border-cyan-500/30 text-center">
          <Star className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-cyan-400">+{totals.reputation}</p>
          <p className="text-xs text-gray-400">Total Reputation</p>
        </div>
      </div>

      {/* Feed */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5 text-purple-400" />
            Reward History
            <Badge className="ml-auto bg-purple-700">{completedMissions.length} missions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {completedMissions.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No completed missions yet. Accept and complete missions to see rewards here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {completedMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-4 rounded-xl border border-purple-500/15 bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white">{mission.title}</h4>
                        {mission.difficulty && (
                          <Badge className={`text-xs ${difficultyColors[mission.difficulty] || 'bg-gray-700'}`}>
                            {mission.difficulty}
                          </Badge>
                        )}
                        <Badge className="text-xs bg-slate-700 text-gray-300 capitalize">
                          {(mission.mission_type || '').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(mission.updated_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {mission.rewards?.crypto > 0 && (
                      <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                        <Award className="w-3 h-3" />
                        +${mission.rewards.crypto.toLocaleString()}
                      </span>
                    )}
                    {mission.rewards?.experience > 0 && (
                      <span className="flex items-center gap-1 text-purple-400 font-semibold">
                        <Zap className="w-3 h-3" />
                        +{mission.rewards.experience} XP
                      </span>
                    )}
                    {mission.rewards?.reputation > 0 && (
                      <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                        <Star className="w-3 h-3" />
                        +{mission.rewards.reputation} REP
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}