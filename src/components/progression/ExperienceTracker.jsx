import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Zap, Target, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const activityIcons = {
  missions_completed: Target,
  battles_won: Zap,
  heists_completed: Award,
  territories_captured: TrendingUp,
  contracts_completed: Award,
  trading_volume: TrendingUp,
  skill_usage: Zap
};

const activityLabels = {
  missions_completed: 'Missions Completed',
  battles_won: 'Battles Won',
  heists_completed: 'Heists Completed',
  territories_captured: 'Territories Captured',
  contracts_completed: 'Contracts Completed',
  trading_volume: 'Trading Volume',
  skill_usage: 'Skill Usage'
};

export default function ExperienceTracker({ playerData }) {
  const { data: playerExp } = useQuery({
    queryKey: ['playerExp', playerData?.id],
    queryFn: async () => {
      const exp = await base44.entities.PlayerExperience.filter({ player_id: playerData.id });
      return exp[0];
    },
    enabled: !!playerData?.id
  });

  if (!playerExp) {
    return (
      <Card className="glass-panel border-cyan-500/30 p-6 text-center">
        <p className="text-gray-400">Loading experience data...</p>
      </Card>
    );
  }

  // Calculate experience per level multiplier
  const expPerLevel = playerExp.experience_to_next_level;
  const nextLevelXp = Math.floor(expPerLevel * 1.1); // 10% increase per level

  const levelUpHistory = playerExp.level_up_history || [];

  return (
    <div className="space-y-6">
      {/* Main Level Progress */}
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span>Current Progress</span>
            <Badge className="bg-cyan-600 text-lg px-3 py-1">Level {playerExp.current_level}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400">Experience to Next Level</span>
              <span className="text-cyan-400 font-semibold">
                {playerExp.current_level_experience} / {playerExp.experience_to_next_level}
              </span>
            </div>
            <Progress 
              value={(playerExp.current_level_experience / playerExp.experience_to_next_level) * 100}
              className="h-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/20">
              <p className="text-sm text-gray-400 mb-1">Total Experience</p>
              <p className="text-2xl font-bold text-cyan-400">{playerExp.total_experience.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <p className="text-sm text-gray-400 mb-1">Next Level XP Needed</p>
              <p className="text-2xl font-bold text-purple-400">{nextLevelXp.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Experience Sources */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-yellow-400" />
            Experience Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {playerExp.experience_sources ? Object.entries(playerExp.experience_sources).map(([source, value]) => {
              const Icon = activityIcons[source] || TrendingUp;
              const label = activityLabels[source] || source;
              return (
                <div key={source} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-gray-500">{value} activities</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-purple-600/50">
                      {Math.floor(value * 100 / (playerExp.total_experience || 1))}% total
                    </Badge>
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-400">No experience data yet. Complete activities to earn XP!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Level Up History */}
      {levelUpHistory.length > 0 && (
        <Card className="glass-panel border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-green-400" />
              Level Up History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {levelUpHistory.slice().reverse().map((milestone, idx) => (
                <div key={idx} className="p-3 bg-slate-900/30 rounded-lg border border-green-500/20 flex items-center justify-between">
                  <div>
                    <Badge className="bg-green-600 mr-2">Level {milestone.level}</Badge>
                    <span className="text-sm text-gray-400">
                      {new Date(milestone.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Level Benefits Info */}
      <Card className="glass-panel border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white">Level Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between py-2 border-b border-blue-500/20">
              <span>Every Level Up:</span>
              <span className="text-cyan-400">+1 Skill Point</span>
            </div>
            <div className="flex justify-between py-2 border-b border-blue-500/20">
              <span>Every 5 Levels:</span>
              <span className="text-cyan-400">Unlock New Perk Tier</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Every 10 Levels:</span>
              <span className="text-cyan-400">+1000 Crypto Bonus</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}