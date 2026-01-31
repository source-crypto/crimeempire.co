import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Zap, ChevronRight, Award, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedMissionSystem({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedMission, setSelectedMission] = useState(null);
  const [currentStage, setCurrentStage] = useState(null);

  const { data: missions = [] } = useQuery({
    queryKey: ['missions', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({ 
      assigned_to_player: playerData.id,
      status: 'available'
    }),
    enabled: !!playerData?.id
  });

  const { data: missionStages = [] } = useQuery({
    queryKey: ['missionStages', selectedMission?.id],
    queryFn: () => base44.entities.MissionStage.filter({ mission_id: selectedMission.id }),
    enabled: !!selectedMission?.id
  });

  const generateMultiStageMissionMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a complex multi-stage mission with branching narrative.

Player Profile:
- Level: ${playerData.level}
- Skills: ${JSON.stringify(playerData.skills || {})}
- Resources: $${playerData.crypto_balance}
- Crew: ${playerData.crew_id ? 'Yes' : 'No'}

Create a 3-5 stage mission with:
1. Each stage has its own narrative and objectives
2. Player choices that affect next stages
3. Dynamic difficulty based on player progression
4. Multiple possible endings
5. Adaptive rewards

Each stage should have:
- Stage title and narrative
- 2-3 objectives
- 2-3 player choices with consequences
- Difficulty adjustment (0.8-1.5 multiplier)
- Stage rewards

Mission types: infiltration, heist, territory_war, rescue, sabotage`;

      const generated = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            mission_title: { type: "string" },
            mission_description: { type: "string" },
            mission_type: { type: "string" },
            base_difficulty: { type: "string" },
            total_stages: { type: "number" },
            stages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stage_number: { type: "number" },
                  stage_title: { type: "string" },
                  narrative: { type: "string" },
                  objectives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        progress: { type: "number" },
                        completed: { type: "boolean" }
                      }
                    }
                  },
                  choices: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        choice_text: { type: "string" },
                        next_stage: { type: "number" },
                        consequences: {
                          type: "object",
                          properties: {
                            crypto_modifier: { type: "number" },
                            difficulty_modifier: { type: "number" },
                            narrative_impact: { type: "string" }
                          }
                        }
                      }
                    }
                  },
                  difficulty_adjustment: { type: "number" },
                  rewards: {
                    type: "object",
                    properties: {
                      crypto: { type: "number" },
                      experience: { type: "number" },
                      items: { type: "array", items: { type: "string" } }
                    }
                  }
                }
              }
            },
            final_rewards: {
              type: "object",
              properties: {
                crypto: { type: "number" },
                experience: { type: "number" },
                reputation: { type: "number" }
              }
            }
          }
        }
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);

      const mission = await base44.entities.Mission.create({
        title: generated.mission_title,
        description: generated.mission_description,
        narrative: generated.mission_description,
        mission_type: generated.mission_type,
        difficulty: generated.base_difficulty,
        objectives: [],
        rewards: generated.final_rewards,
        requirements: {
          min_level: Math.max(1, playerData.level - 2),
          crew_required: generated.total_stages >= 4
        },
        assigned_to_player: playerData.id,
        status: 'available',
        generated_by_ai: true,
        expires_at: expiresAt.toISOString()
      });

      for (const stage of generated.stages) {
        await base44.entities.MissionStage.create({
          mission_id: mission.id,
          stage_number: stage.stage_number,
          stage_title: stage.stage_title,
          narrative_text: stage.narrative,
          objectives: stage.objectives,
          choices: stage.choices,
          difficulty_adjustment: stage.difficulty_adjustment,
          status: stage.stage_number === 1 ? 'active' : 'locked',
          completion_rewards: stage.rewards
        });
      }

      return mission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success('Multi-stage mission generated!');
    }
  });

  const makeChoiceMutation = useMutation({
    mutationFn: async ({ stageId, choice }) => {
      const stage = missionStages.find(s => s.id === stageId);
      
      await base44.entities.MissionStage.update(stageId, {
        status: 'completed'
      });

      if (choice.consequences?.crypto_modifier) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance + choice.consequences.crypto_modifier
        });
      }

      const nextStageNum = choice.next_stage;
      const nextStage = missionStages.find(s => s.stage_number === nextStageNum);
      
      if (nextStage) {
        const adjustedDifficulty = (nextStage.difficulty_adjustment || 1) * 
                                   (choice.consequences?.difficulty_modifier || 1);
        
        await base44.entities.MissionStage.update(nextStage.id, {
          status: 'active',
          difficulty_adjustment: adjustedDifficulty
        });
        
        setCurrentStage(nextStage);
      } else {
        await base44.entities.Mission.update(selectedMission.id, {
          status: 'completed'
        });

        const rewards = selectedMission.rewards || {};
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: (playerData.crypto_balance || 0) + (rewards.crypto || 0),
          experience: (playerData.experience || 0) + (rewards.experience || 0),
          total_earnings: (playerData.total_earnings || 0) + (rewards.crypto || 0)
        });

        toast.success('Mission completed!');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missionStages']);
      queryClient.invalidateQueries(['missions']);
      queryClient.invalidateQueries(['player']);
    }
  });

  if (!playerData) return null;

  const activeStage = missionStages.find(s => s.status === 'active');

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              Enhanced Mission System
            </CardTitle>
            <Button
              size="sm"
              onClick={() => generateMultiStageMissionMutation.mutate()}
              disabled={generateMultiStageMissionMutation.isPending}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              {generateMultiStageMissionMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Generate Multi-Stage Mission</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {missions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => setSelectedMission(mission)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedMission?.id === mission.id
                    ? 'bg-cyan-900/30 border-2 border-cyan-500'
                    : 'bg-slate-900/50 border border-cyan-500/20 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-white">{mission.title}</div>
                  <Badge className={
                    mission.difficulty === 'easy' ? 'bg-green-600' :
                    mission.difficulty === 'medium' ? 'bg-yellow-600' :
                    mission.difficulty === 'hard' ? 'bg-orange-600' : 'bg-red-600'
                  }>
                    {mission.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{mission.description}</p>
                {mission.generated_by_ai && (
                  <div className="mt-2">
                    <Badge className="bg-purple-600 text-xs">AI Generated</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedMission && activeStage && (
            <Card className="bg-slate-900/50 border-purple-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">
                    Stage {activeStage.stage_number}: {activeStage.stage_title}
                  </CardTitle>
                  <Badge>
                    Difficulty: x{activeStage.difficulty_adjustment?.toFixed(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">{activeStage.narrative_text}</p>

                <div>
                  <h4 className="text-white font-semibold mb-2">Objectives:</h4>
                  <div className="space-y-2">
                    {(activeStage.objectives || []).map((obj, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          obj.completed ? 'bg-green-600' : 'bg-gray-600'
                        }`}>
                          {obj.completed && '✓'}
                        </div>
                        <span className="text-gray-300">{obj.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(activeStage.choices || []).length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2">Make Your Choice:</h4>
                    <div className="space-y-2">
                      {activeStage.choices.map((choice, idx) => (
                        <Button
                          key={idx}
                          className="w-full justify-between bg-gradient-to-r from-purple-900/50 to-blue-900/50 hover:from-purple-800/50 hover:to-blue-800/50"
                          onClick={() => makeChoiceMutation.mutate({
                            stageId: activeStage.id,
                            choice
                          })}
                        >
                          <span>{choice.choice_text}</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {activeStage.completion_rewards && (
                  <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                      <Award className="w-4 h-4" />
                      <span className="font-semibold">Stage Rewards:</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      ${activeStage.completion_rewards.crypto?.toLocaleString()} • 
                      {activeStage.completion_rewards.experience} XP
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}