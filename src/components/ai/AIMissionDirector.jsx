import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AIMissionDirector({ playerData, playerReputation }) {
  const queryClient = useQueryClient();
  const [expandedMission, setExpandedMission] = useState(null);

  const { data: director } = useQuery({
    queryKey: ['missionDirector', playerData?.id],
    queryFn: async () => {
      const dirs = await base44.entities.AIMissionDirector.filter({ player_id: playerData.id });
      if (dirs.length === 0) {
        await base44.entities.AIMissionDirector.create({
          player_id: playerData.id,
          active_missions: [],
          difficulty_modifier: 1,
          performance_rating: 50,
          average_success_rate: 50,
          reputation_factor: 1,
          mission_suggestions: generateSuggestions()
        });
        return (await base44.entities.AIMissionDirector.filter({ player_id: playerData.id }))[0];
      }
      return dirs[0];
    },
    enabled: !!playerData?.id,
    refetchInterval: 60000
  });

  const { data: missionModifiers = [] } = useQuery({
    queryKey: ['missionModifiers', playerData?.id],
    queryFn: () => base44.entities.MissionModifier.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const adjustMissionsMutation = useMutation({
    mutationFn: async () => {
      if (!director || !playerReputation) return;

      const performanceMultiplier = director.average_success_rate > 75 ? 1.2 : 
                                   director.average_success_rate < 40 ? 0.7 : 1;
      const reputationMultiplier = playerReputation.overall_tier >= 4 ? 1.3 : 1;
      
      let newDifficulty = Math.max(0.5, Math.min(2.0, performanceMultiplier * reputationMultiplier));
      
      await base44.entities.AIMissionDirector.update(director.id, {
        difficulty_modifier: newDifficulty,
        performance_rating: Math.min(100, Math.max(0, director.performance_rating + (Math.random() * 10 - 5))),
        reputation_factor: reputationMultiplier,
        mission_suggestions: generateSuggestions(),
        next_difficulty_adjustment: new Date(Date.now() + 600000).toISOString()
      });

      toast.success('Missions adjusted based on performance');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missionDirector']);
    }
  });

  const completeMissionMutation = useMutation({
    mutationFn: async (success) => {
      if (!director) return;

      const newCompleted = success ? director.missions_completed + 1 : director.missions_completed;
      const newFailed = success ? director.missions_failed : director.missions_failed + 1;
      const newSuccessRate = (newCompleted / (newCompleted + newFailed)) * 100;

      await base44.entities.AIMissionDirector.update(director.id, {
        missions_completed: newCompleted,
        missions_failed: newFailed,
        average_success_rate: newSuccessRate
      });

      queryClient.invalidateQueries(['missionDirector']);
    },
    onSuccess: () => {
      toast.success('Mission result recorded');
    }
  });

  const generateSuggestions = () => {
    return [
      { mission_type: 'Black Market Trade', difficulty: 'medium', reward: 15000, urgency: 70 },
      { mission_type: 'Courier Run', difficulty: 'easy', reward: 8000, urgency: 60 },
      { mission_type: 'Territory Raid', difficulty: 'hard', reward: 35000, urgency: 85 },
      { mission_type: 'Data Heist', difficulty: 'extreme', reward: 50000, urgency: 90 }
    ];
  };

  if (!director) return <div className="text-white">Loading mission director...</div>;

  const difficultyColor = director.difficulty_modifier < 0.8 ? 'text-green-400' :
                         director.difficulty_modifier > 1.5 ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="space-y-4">
      {/* Director Status */}
      <Card className="glass-panel border-purple-500/30 bg-gradient-to-r from-slate-900/50 via-purple-900/20 to-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-purple-400" />
            Mission Director
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Difficulty</p>
              <p className={`text-2xl font-bold ${difficultyColor}`}>{director.difficulty_modifier.toFixed(2)}x</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-cyan-400">{Math.round(director.average_success_rate)}%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-400">{director.missions_completed}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-400">{director.missions_failed}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Performance</span>
              <span className="text-gray-300">{Math.round(director.performance_rating)}%</span>
            </div>
            <Progress value={director.performance_rating} className="h-2" />
          </div>

          <button
            onClick={() => adjustMissionsMutation.mutate()}
            disabled={adjustMissionsMutation.isPending}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-semibold"
          >
            Recalibrate Missions
          </button>
        </CardContent>
      </Card>

      {/* Mission Suggestions */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Target className="w-4 h-4 text-cyan-400" />
            Recommended Missions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {director.mission_suggestions.map((mission, idx) => {
              const isExpanded = expandedMission === idx;
              const diffColor = mission.difficulty === 'easy' ? 'bg-green-600' :
                               mission.difficulty === 'medium' ? 'bg-yellow-600' :
                               mission.difficulty === 'hard' ? 'bg-orange-600' : 'bg-red-600';

              const adjustedReward = Math.round(mission.reward * director.difficulty_modifier);

              return (
                <div
                  key={idx}
                  onClick={() => setExpandedMission(isExpanded ? null : idx)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isExpanded ? 'border-cyan-500/50 bg-slate-900/50' : 'border-cyan-500/20 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-sm">{mission.mission_type}</h4>
                      <p className="text-xs text-gray-400">Dynamic reward based on difficulty</p>
                    </div>
                    <Badge className={diffColor}>{mission.difficulty}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Base Reward</p>
                      <p className="text-green-400 font-semibold">${mission.reward.toLocaleString()}</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Adjusted</p>
                      <p className="text-cyan-400 font-semibold">${adjustedReward.toLocaleString()}</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Urgency</p>
                      <p className="text-purple-400 font-semibold">{mission.urgency}%</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-cyan-500/20 space-y-2">
                      <p className="text-xs text-gray-300">
                        This mission reward scales with your performance rating and reputation tier.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => completeMissionMutation.mutate(true)}
                          className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                        >
                          Complete (Success)
                        </button>
                        <button
                          onClick={() => completeMissionMutation.mutate(false)}
                          className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                        >
                          Complete (Failed)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Modifiers */}
      {missionModifiers.length > 0 && (
        <Card className="glass-panel border-orange-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              Active Mission Modifiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missionModifiers.slice(0, 3).map((modifier) => (
                <div key={modifier.id} className="p-2 bg-slate-900/50 rounded border border-orange-500/20 text-xs">
                  <div className="flex justify-between mb-1">
                    <p className="text-white font-semibold">Difficulty: {modifier.original_difficulty} → {modifier.adjusted_difficulty}</p>
                    {modifier.enforcement_escalation && (
                      <Badge className="bg-red-600">Chase Risk</Badge>
                    )}
                  </div>
                  <p className="text-gray-400">
                    ${modifier.original_reward.toLocaleString()} → ${modifier.adjusted_reward.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">📊 Director Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-gray-400">
          <p>• Missions scale with your success rate</p>
          <p>• High-profile actions trigger LE response</p>
          <p>• Reputation unlocks more challenging missions</p>
          <p>• Market conditions affect mission urgency</p>
          <p>• Failed high-heat missions trigger chase sequences</p>
        </CardContent>
      </Card>
    </div>
  );
}