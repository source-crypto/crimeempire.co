import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DynamicMissionGenerator({ playerData }) {
  const queryClient = useQueryClient();

  const { data: economicEvents = [] } = useQuery({
    queryKey: ['economicEvents'],
    queryFn: () => base44.entities.EconomicEvent.filter({ status: 'active' })
  });

  const { data: factionActivities = [] } = useQuery({
    queryKey: ['factionActivities'],
    queryFn: () => base44.entities.FactionActivity.filter({ status: 'executing' })
  });

  const { data: supplyLines = [] } = useQuery({
    queryKey: ['supplyLines', playerData?.crew_id],
    queryFn: () => base44.entities.SupplyLine.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id
  });

  const { data: governance = [] } = useQuery({
    queryKey: ['governance'],
    queryFn: () => base44.entities.Governance.list()
  });

  const { data: playerReputation } = useQuery({
    queryKey: ['playerReputation', playerData?.id],
    queryFn: async () => {
      const reps = await base44.entities.PlayerReputation.filter({ player_id: playerData.id });
      return reps[0] || {};
    },
    enabled: !!playerData?.id
  });

  const { data: completedMissions = [] } = useQuery({
    queryKey: ['completedMissions', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({ 
      assigned_to_player: playerData.id, 
      status: 'completed' 
    }),
    enabled: !!playerData?.id
  });

  const generateMissionMutation = useMutation({
    mutationFn: async () => {
      const currentPhase = governance[0]?.escalation_phase || 'normal';
      const playerLevel = playerData.level || 1;
      const missionCount = completedMissions.length;
      
      // Calculate dynamic difficulty
      const baseDifficulty = Math.min(100, 20 + (playerLevel * 3) + (missionCount * 2));
      const difficultyScale = playerData.stats?.heists_completed > 5 ? 1.2 : 1.0;
      const adjustedDifficulty = Math.floor(baseDifficulty * difficultyScale);
      
      const prompt = `Generate AI-driven dynamic mission with personalized narrative and mission chain potential.

Player Profile:
- Name: ${playerData.username}
- Level: ${playerLevel}
- Playstyle: ${playerData.playstyle || 'balanced'}
- Reputation: Law ${playerReputation.law_enforcement_rep || 0}, Faction ${playerReputation.faction_rep || 0}
- Completed Missions: ${missionCount}
- Stats: ${playerData.stats?.heists_completed || 0} heists, ${playerData.stats?.battles_won || 0} battles won

Dynamic Difficulty: ${adjustedDifficulty}/100 (scales with progression)

World Context:
- Escalation Phase: ${currentPhase}
- Economic Events: ${economicEvents.map(e => e.event_name).join(', ')}
- Faction Activities: ${factionActivities.slice(0, 3).map(a => `${a.faction_name} ${a.activity_type}`).join(', ')}

Generate:
1. Mission chain structure: Make this part of a 3-mission chain with:
   - Chain ID and position (1/3, 2/3, or 3/3)
   - Next mission hint and unlocks
   - Branching paths based on player choices
2. Personalized narrative: Reference player's playstyle, past choices, and reputation
3. Dynamic difficulty: Base objectives on calculated difficulty ${adjustedDifficulty}/100
4. Type: story/side_quest/crew_mission/faction_conflict/chain_finale
5. Difficulty tier: easy/medium/hard/extreme/legendary
6. Choice-driven objectives: Include 2-3 decision points that affect outcomes
7. Adaptive rewards: Scale with difficulty and player progression
8. Requirements: Based on player level and mission chain position
9. Chain consequences: How choices ripple to next missions

Create immersive, choice-driven narrative that remembers player's journey.`;

      const mission = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            narrative: { type: "string" },
            mission_type: { type: "string" },
            difficulty: { type: "string" },
            chain_info: {
              type: "object",
              properties: {
                chain_id: { type: "string" },
                position: { type: "number" },
                total_in_chain: { type: "number" },
                next_mission_hint: { type: "string" },
                unlocks_next: { type: "boolean" },
                branching_paths: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      choice: { type: "string" },
                      leads_to: { type: "string" }
                    }
                  }
                }
              }
            },
            objectives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  progress: { type: "number" },
                  completed: { type: "boolean" },
                  is_choice_point: { type: "boolean" },
                  choices: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        option: { type: "string" },
                        consequence: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            rewards: {
              type: "object",
              properties: {
                crypto: { type: "number" },
                experience: { type: "number" },
                reputation: { type: "number" },
                items: { type: "array", items: { type: "string" } },
                bonus_for_playstyle: { type: "string" }
              }
            },
            requirements: {
              type: "object",
              properties: {
                min_level: { type: "number" },
                crew_required: { type: "boolean" },
                territory_control: { type: "number" },
                previous_mission: { type: "string" }
              }
            },
            personalization: {
              type: "object",
              properties: {
                references_past: { type: "array", items: { type: "string" } },
                playstyle_bonus: { type: "string" },
                reputation_impact: { type: "string" }
              }
            }
          }
        }
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const created = await base44.entities.Mission.create({
        title: mission.title,
        description: mission.narrative,
        narrative: mission.narrative,
        mission_type: mission.mission_type,
        difficulty: mission.difficulty,
        objectives: mission.objectives,
        rewards: mission.rewards,
        requirements: mission.requirements,
        assigned_to_player: playerData.id,
        assigned_to_crew: playerData.crew_id,
        status: 'available',
        generated_by_ai: true,
        context_data: {
          economic_events: economicEvents.length,
          faction_activities: factionActivities.length,
          escalation_phase: currentPhase,
          player_level: playerLevel,
          difficulty_scale: adjustedDifficulty,
          chain_info: mission.chain_info,
          personalization: mission.personalization
        },
        expires_at: expiresAt.toISOString()
      });

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success('New mission generated!');
    }
  });

  if (!playerData) return null;

  return (
    <Card className="glass-panel border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          AI Mission Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <p className="text-sm text-gray-300 mb-2">
              <strong>Mission Chains:</strong> Interconnected objectives with branching paths
            </p>
            <p className="text-sm text-gray-300 mb-2">
              <strong>Dynamic Difficulty:</strong> Scales with Level {playerData?.level} + {completedMissions.length} missions
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mt-2">
              <div>Playstyle: {playerData?.playstyle || 'balanced'}</div>
              <div>Completed: {completedMissions.length}</div>
              <div>Phase: {governance[0]?.escalation_phase || 'normal'}</div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
            onClick={() => generateMissionMutation.mutate()}
            disabled={generateMissionMutation.isPending}
          >
            {generateMissionMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Generate Dynamic Mission</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}