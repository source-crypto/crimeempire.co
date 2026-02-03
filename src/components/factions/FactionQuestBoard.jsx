import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Clock, Award, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function FactionQuestBoard({ playerData, factionMembership }) {
  const queryClient = useQueryClient();
  const [selectedQuest, setSelectedQuest] = useState(null);

  const { data: quests = [] } = useQuery({
    queryKey: ['factionQuests', factionMembership?.faction_id],
    queryFn: () => base44.entities.FactionQuest.filter({ 
      faction_id: factionMembership.faction_id,
      status: 'available'
    }),
    enabled: !!factionMembership?.faction_id
  });

  const { data: activeQuests = [] } = useQuery({
    queryKey: ['activeFactionQuests', playerData?.id],
    queryFn: async () => {
      const allQuests = await base44.entities.FactionQuest.list();
      return allQuests.filter(q => q.status === 'active' && q.created_by === playerData.created_by);
    },
    enabled: !!playerData?.id
  });

  const acceptQuestMutation = useMutation({
    mutationFn: async (quest) => {
      return await base44.entities.FactionQuest.update(quest.id, {
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['factionQuests']);
      queryClient.invalidateQueries(['activeFactionQuests']);
      toast.success('Quest accepted!');
    }
  });

  const completeQuestMutation = useMutation({
    mutationFn: async (quest) => {
      await base44.entities.FactionQuest.update(quest.id, {
        status: 'completed'
      });

      const rewards = quest.rewards || {};
      const updates = {};
      
      if (rewards.crypto) {
        updates.crypto_balance = playerData.crypto_balance + rewards.crypto;
      }
      if (rewards.reputation) {
        updates.endgame_points = (playerData.endgame_points || 0) + rewards.reputation;
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.Player.update(playerData.id, updates);
      }

      if (rewards.faction_points) {
        await base44.entities.FactionMember.update(factionMembership.id, {
          contribution_points: (factionMembership.contribution_points || 0) + rewards.faction_points
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['factionQuests']);
      queryClient.invalidateQueries(['activeFactionQuests']);
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['playerFaction']);
      toast.success('Quest completed! Rewards collected.');
    }
  });

  const difficultyColors = {
    easy: 'bg-green-600',
    medium: 'bg-yellow-600',
    hard: 'bg-orange-600',
    extreme: 'bg-red-600'
  };

  const rankOrder = ['associate', 'soldier', 'captain', 'underboss', 'leader'];
  const canAcceptQuest = (quest) => {
    const playerRankIndex = rankOrder.indexOf(factionMembership?.rank || 'associate');
    const questRankIndex = rankOrder.indexOf(quest.required_rank);
    return playerRankIndex >= questRankIndex;
  };

  return (
    <div className="space-y-6">
      {/* Active Quests */}
      {activeQuests.length > 0 && (
        <Card className="glass-panel border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Active Quests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeQuests.map((quest) => {
              const completedObjectives = quest.objectives?.filter(o => o.completed).length || 0;
              const totalObjectives = quest.objectives?.length || 0;
              const progress = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

              return (
                <div key={quest.id} className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{quest.quest_name}</h4>
                      <p className="text-sm text-gray-400">{quest.description}</p>
                    </div>
                    <Badge className={difficultyColors[quest.difficulty]}>{quest.difficulty}</Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    {quest.objectives?.map((obj, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {obj.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-gray-500" />
                        )}
                        <span className={obj.completed ? 'text-green-400' : 'text-gray-400'}>
                          {obj.objective}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Progress value={progress} className="h-2 mb-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs">
                      {quest.rewards?.crypto && (
                        <span className="text-green-400">💰 ${quest.rewards.crypto.toLocaleString()}</span>
                      )}
                      {quest.rewards?.faction_points && (
                        <span className="text-purple-400">⭐ {quest.rewards.faction_points} pts</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => completeQuestMutation.mutate(quest)}
                      disabled={progress < 100 || completeQuestMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Complete
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Quests */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Available Faction Quests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quests.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No quests available. Check back later.
            </div>
          ) : (
            quests.map((quest) => {
              const canAccept = canAcceptQuest(quest);
              
              return (
                <div key={quest.id} className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold">{quest.quest_name}</h4>
                        <Badge className={difficultyColors[quest.difficulty]}>{quest.difficulty}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {quest.required_rank}+
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">{quest.description}</p>
                    </div>
                  </div>

                  {quest.objectives && (
                    <div className="my-3 space-y-1">
                      {quest.objectives.map((obj, idx) => (
                        <div key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                          <Target className="w-3 h-3" />
                          {obj.objective}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-3 text-xs">
                      {quest.rewards?.crypto && (
                        <span className="text-green-400">💰 ${quest.rewards.crypto.toLocaleString()}</span>
                      )}
                      {quest.rewards?.reputation && (
                        <span className="text-yellow-400">👑 +{quest.rewards.reputation}</span>
                      )}
                      {quest.rewards?.faction_points && (
                        <span className="text-purple-400">⭐ +{quest.rewards.faction_points} pts</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => acceptQuestMutation.mutate(quest)}
                      disabled={!canAccept || acceptQuestMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {canAccept ? 'Accept Quest' : 'Rank Too Low'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}