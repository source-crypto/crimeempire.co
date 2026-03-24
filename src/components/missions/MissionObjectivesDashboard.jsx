import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Target, Award, Zap, Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function MissionObjectivesDashboard({ playerData }) {
  const queryClient = useQueryClient();

  const { data: activeMissions = [], isLoading } = useQuery({
    queryKey: ['missions', 'active_objectives', playerData?.id],
    queryFn: () => base44.entities.Mission.filter(
      { assigned_to_player: playerData.id, status: 'active' },
      '-created_date',
      20
    ),
    enabled: !!playerData?.id,
    refetchInterval: 10000
  });

  const toggleObjectiveMutation = useMutation({
    mutationFn: async ({ mission, objIndex }) => {
      const objectives = (mission.objectives || []).map((obj, i) =>
        i === objIndex ? { ...obj, completed: !obj.completed, progress: !obj.completed ? 100 : 0 } : obj
      );
      await base44.entities.Mission.update(mission.id, { objectives });
      return { mission, objectives };
    },
    onSuccess: ({ objectives }) => {
      queryClient.invalidateQueries(['missions']);
      const allDone = objectives.every(o => o.completed);
      if (allDone) toast.success('All objectives complete! You can now finish this mission.');
      else toast.success('Objective updated');
    },
    onError: (err) => toast.error(err.message)
  });

  const completeMission = useMutation({
    mutationFn: async (mission) => {
      await base44.entities.Mission.update(mission.id, { status: 'completed' });
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + (mission.rewards?.crypto || 0),
        experience: (playerData.experience || 0) + (mission.rewards?.experience || 0),
        total_earnings: (playerData.total_earnings || 0) + (mission.rewards?.crypto || 0),
      });
    },
    onSuccess: (_, mission) => {
      queryClient.invalidateQueries(['missions', 'active_objectives']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Mission complete! +$${(mission.rewards?.crypto || 0).toLocaleString()}`);
    },
    onError: (err) => toast.error(err.message)
  });

  function calcProgress(mission) {
    const objs = mission.objectives || [];
    if (!objs.length) return 0;
    const done = objs.filter(o => o.completed).length;
    return Math.round((done / objs.length) * 100);
  }

  const difficultyColors = {
    easy: 'bg-green-700',
    medium: 'bg-yellow-700',
    hard: 'bg-orange-700',
    extreme: 'bg-red-700'
  };

  const progressBarColors = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-orange-500',
    extreme: 'bg-red-500'
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Active Mission Progress</h3>
          <Badge className="bg-purple-700">{activeMissions.length} active</Badge>
        </div>
      </div>

      {activeMissions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-white mb-1">No active missions</p>
          <p className="text-sm">Accept missions from the Mission Board to start tracking progress here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeMissions.map((mission) => {
            const progress = calcProgress(mission);
            const allDone = progress === 100;
            const objectives = mission.objectives || [];

            return (
              <Card key={mission.id} className="glass-panel border-purple-500/20">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-white font-bold">{mission.title}</h4>
                        <Badge className={difficultyColors[mission.difficulty] || 'bg-gray-700'}>
                          {mission.difficulty}
                        </Badge>
                        <Badge className="bg-slate-700 text-gray-300 capitalize text-xs">
                          {(mission.mission_type || '').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">{mission.narrative || mission.description}</p>
                    </div>
                    <div className="text-right ml-4 min-w-[60px]">
                      <p className="text-2xl font-bold text-white">{progress}%</p>
                      <p className="text-xs text-gray-400">complete</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progressBarColors[mission.difficulty] || 'bg-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{objectives.filter(o => o.completed).length} of {objectives.length} objectives done</span>
                      {allDone && <span className="text-green-400 font-semibold">Ready to complete!</span>}
                    </div>
                  </div>

                  {/* Objectives */}
                  <div className="space-y-2 mb-4">
                    {objectives.map((obj, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                          obj.completed
                            ? 'bg-green-900/20 border border-green-500/20'
                            : 'bg-slate-900/40 border border-slate-700/30 hover:border-purple-500/30'
                        }`}
                        onClick={() => toggleObjectiveMutation.mutate({ mission, objIndex: idx })}
                      >
                        {obj.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                        <span className={`text-sm flex-1 ${obj.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {obj.description}
                        </span>
                        {obj.completed && (
                          <Badge className="bg-green-800 text-green-200 text-xs">Done</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Rewards Preview */}
                  <div className="flex gap-3 text-xs mb-4 flex-wrap">
                    {mission.rewards?.crypto > 0 && (
                      <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                        <Award className="w-3 h-3" /> +${mission.rewards.crypto.toLocaleString()}
                      </span>
                    )}
                    {mission.rewards?.experience > 0 && (
                      <span className="flex items-center gap-1 text-purple-400 font-semibold">
                        <Zap className="w-3 h-3" /> +{mission.rewards.experience} XP
                      </span>
                    )}
                    {mission.rewards?.reputation > 0 && (
                      <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                        <Star className="w-3 h-3" /> +{mission.rewards.reputation} REP
                      </span>
                    )}
                  </div>

                  {/* Complete Button */}
                  <Button
                    size="sm"
                    className={`w-full font-semibold transition-all ${
                      allDone
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
                        : 'bg-slate-700 text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => allDone && completeMission.mutate(mission)}
                    disabled={!allDone || completeMission.isPending}
                  >
                    {allDone ? '🎯 Complete Mission & Claim Rewards' : `Complete All ${objectives.length - objectives.filter(o => o.completed).length} Remaining Objectives First`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}