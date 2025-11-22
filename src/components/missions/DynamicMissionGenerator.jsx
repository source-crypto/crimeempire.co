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

  const generateMissionMutation = useMutation({
    mutationFn: async () => {
      const currentPhase = governance[0]?.escalation_phase || 'normal';
      
      const prompt = `Generate dynamic mission based on current world state.

Player: ${playerData.username} (Level ${playerData.level})
Crew: ${playerData.crew_id ? 'Yes' : 'No'}
Escalation Phase: ${currentPhase}

Active Economic Events:
${economicEvents.map(e => `- ${e.event_name} (${e.severity}): ${e.event_type}`).join('\n')}

Faction Activities:
${factionActivities.slice(0, 5).map(a => `- ${a.faction_name}: ${a.activity_type} targeting ${a.target_name}`).join('\n')}

Supply Line Status: ${supplyLines.length} active

Generate:
1. Mission title and narrative (immersive story)
2. Type: story/side_quest/crew_mission/faction_conflict
3. Difficulty: easy/medium/hard/extreme
4. Objectives (3-5 specific tasks)
5. Rewards (crypto, XP, reputation, items)
6. Requirements (level, crew, resources)
7. AI interaction opportunities
8. Phase-specific bonuses (${currentPhase})

Make it contextual and urgent.`;

      const mission = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            narrative: { type: "string" },
            mission_type: { type: "string" },
            difficulty: { type: "string" },
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
            rewards: {
              type: "object",
              properties: {
                crypto: { type: "number" },
                experience: { type: "number" },
                reputation: { type: "number" },
                items: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            },
            requirements: {
              type: "object",
              properties: {
                min_level: { type: "number" },
                crew_required: { type: "boolean" },
                territory_control: { type: "number" }
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
          escalation_phase: currentPhase
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
              AI analyzes current world state to generate contextual missions
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
              <div>Events: {economicEvents.length}</div>
              <div>Conflicts: {factionActivities.length}</div>
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