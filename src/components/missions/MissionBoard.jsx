import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target, Clock, Award, Users, CheckCircle, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const missionTypeColors = {
  story: 'from-purple-600 to-pink-600',
  side_quest: 'from-blue-600 to-cyan-600',
  crew_mission: 'from-orange-600 to-red-600',
  faction_conflict: 'from-red-600 to-orange-600',
  heist_preparation: 'from-green-600 to-emerald-600'
};

const difficultyColors = {
  easy: 'bg-green-600',
  medium: 'bg-yellow-600',
  hard: 'bg-orange-600',
  extreme: 'bg-red-600'
};

export default function MissionBoard({ playerData }) {
  const [selectedMission, setSelectedMission] = useState(null);
  const queryClient = useQueryClient();

  const { data: availableMissions = [] } = useQuery({
    queryKey: ['missions', 'available', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({ status: 'available' }),
    enabled: !!playerData,
    refetchInterval: 30000
  });

  const { data: activeMissions = [] } = useQuery({
    queryKey: ['missions', 'active', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({
      assigned_to_player: playerData.id,
      status: 'active'
    }),
    enabled: !!playerData
  });

  const generateMissionMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a unique mission for a crime game player:

Player Context:
- Level: ${playerData.level}
- Crew: ${playerData.crew_id ? 'Yes' : 'No'}
- Territories: ${playerData.territory_count}
- Playstyle: ${playerData.playstyle}
- Total Earnings: $${playerData.total_earnings}

Generate a procedural mission with:
1. Title (short, engaging)
2. Description (narrative hook)
3. Narrative (story context, 2-3 sentences)
4. Mission type (story/side_quest/crew_mission/faction_conflict)
5. Difficulty (easy/medium/hard/extreme)
6. Objectives array (3-5 objectives with descriptions)
7. Rewards (crypto, experience, reputation)
8. Requirements (min_level, crew_required)

Make it unique and adapted to player's progress. Return JSON.`;

      const aiMission = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            narrative: { type: 'string' },
            mission_type: { type: 'string' },
            difficulty: { type: 'string' },
            objectives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  completed: { type: 'boolean' },
                  progress: { type: 'number' }
                }
              }
            },
            rewards: {
              type: 'object',
              properties: {
                crypto: { type: 'number' },
                experience: { type: 'number' },
                reputation: { type: 'number' }
              }
            },
            requirements: {
              type: 'object',
              properties: {
                min_level: { type: 'number' },
                crew_required: { type: 'boolean' }
              }
            }
          }
        }
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const mission = await base44.entities.Mission.create({
        ...aiMission,
        status: 'available',
        expires_at: expiresAt.toISOString(),
        generated_by_ai: true,
        context_data: {
          player_level: playerData.level,
          playstyle: playerData.playstyle
        }
      });

      return mission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success('New mission generated!');
    }
  });

  const acceptMissionMutation = useMutation({
    mutationFn: async (mission) => {
      await base44.entities.Mission.update(mission.id, {
        assigned_to_player: playerData.id,
        assigned_to_crew: playerData.crew_id,
        status: 'active'
      });

      if (playerData.crew_id) {
        await base44.entities.CrewActivity.create({
          crew_id: playerData.crew_id,
          activity_type: 'heist_completed',
          title: 'Mission Accepted',
          description: `${playerData.username} accepted: ${mission.title}`,
          player_id: playerData.id,
          player_username: playerData.username
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success('Mission accepted!');
      setSelectedMission(null);
    }
  });

  const completeMissionMutation = useMutation({
    mutationFn: async (mission) => {
      await base44.entities.Mission.update(mission.id, {
        status: 'completed'
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + (mission.rewards?.crypto || 0),
        experience: playerData.experience + (mission.rewards?.experience || 0),
        total_earnings: playerData.total_earnings + (mission.rewards?.crypto || 0)
      });

      if (playerData.crew_id && mission.rewards?.reputation) {
        const crews = await base44.entities.Crew.filter({ id: playerData.crew_id });
        if (crews[0]) {
          await base44.entities.Crew.update(crews[0].id, {
            reputation: crews[0].reputation + mission.rewards.reputation
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      queryClient.invalidateQueries(['player']);
      toast.success('Mission completed!');
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-purple-400" />
              Mission Board
            </CardTitle>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => generateMissionMutation.mutate()}
              disabled={generateMissionMutation.isPending}
            >
              {generateMissionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Mission
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="available">
            Available ({availableMissions.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeMissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableMissions.map((mission) => {
              const canAccept = mission.requirements?.min_level <= playerData.level &&
                (!mission.requirements?.crew_required || playerData.crew_id);

              return (
                <Card key={mission.id} className="glass-panel border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-1">{mission.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {mission.description}
                        </p>
                      </div>
                      <Badge className={difficultyColors[mission.difficulty]}>
                        {mission.difficulty}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4 text-green-400" />
                        <span className="text-white">
                          ${(mission.rewards?.crypto || 0).toLocaleString()}
                        </span>
                        <span className="text-purple-400 ml-2">
                          {mission.rewards?.experience || 0} XP
                        </span>
                      </div>
                      {mission.expires_at && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          Expires in 48h
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className={`w-full bg-gradient-to-r ${
                        missionTypeColors[mission.mission_type]
                      }`}
                      onClick={() => acceptMissionMutation.mutate(mission)}
                      disabled={!canAccept || acceptMissionMutation.isPending}
                    >
                      {canAccept ? 'Accept Mission' : 'Requirements Not Met'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="space-y-4">
            {activeMissions.map((mission) => (
              <Card key={mission.id} className="glass-panel border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white mb-1">{mission.title}</h3>
                      <p className="text-sm text-gray-400">{mission.narrative}</p>
                    </div>
                    <Badge className={difficultyColors[mission.difficulty]}>
                      {mission.difficulty}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-semibold text-white">Objectives:</h4>
                    {mission.objectives?.map((obj, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle
                          className={`w-4 h-4 ${
                            obj.completed ? 'text-green-400' : 'text-gray-600'
                          }`}
                        />
                        <span className={obj.completed ? 'text-gray-400 line-through' : 'text-white'}>
                          {obj.description}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => completeMissionMutation.mutate(mission)}
                    disabled={completeMissionMutation.isPending}
                  >
                    Complete Mission
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}