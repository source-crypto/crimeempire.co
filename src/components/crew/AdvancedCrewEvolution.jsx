import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@antml:react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, TrendingUp, Eye, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function AdvancedCrewEvolution({ playerData }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [strategicGoal, setStrategicGoal] = useState('');
  const queryClient = useQueryClient();

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', playerData?.crew_id],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id
  });

  const { data: skillEvolutions = [] } = useQuery({
    queryKey: ['crewSkillEvolutions', playerData?.crew_id],
    queryFn: async () => {
      const evolutions = await base44.entities.CrewSkillEvolution.list();
      return evolutions.filter(e => 
        crewMembers.some(m => m.id === e.crew_member_id)
      );
    },
    enabled: crewMembers.length > 0
  });

  const analyzeEvolutionMutation = useMutation({
    mutationFn: async (member) => {
      const prompt = `Analyze crew member for specialization evolution.

Member: ${member.member_name} (${member.member_type})
Current Skills: ${JSON.stringify(member.skills)}
Loyalty: ${member.loyalty}/100
Missions Completed: ${member.missions_completed || 0}

Player Strategic Goal: ${strategicGoal || 'Not specified'}

Analyze:
1. Current performance trajectory
2. Best specialization paths (shadow_saboteur, quantum_navigator, war_prophet, siege_technician, supply_line_commander, ambush_architect, diplomat_sage, economic_analyst)
3. Unique abilities to unlock
4. Unlock conditions based on real performance
5. Expected outcomes
6. Complete transparency on reasoning

Link all suggestions to actual performance data.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_path: { type: "string" },
            reasoning: { type: "string" },
            performance_analysis: {
              type: "object",
              properties: {
                strengths: {
                  type: "array",
                  items: { type: "string" }
                },
                weaknesses: {
                  type: "array",
                  items: { type: "string" }
                },
                tactical_precision: { type: "number" }
              }
            },
            unlockable_abilities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ability_name: { type: "string" },
                  description: { type: "string" },
                  unlock_condition: { type: "string" },
                  performance_bonus: {
                    type: "object"
                  }
                }
              }
            },
            evolution_requirements: {
              type: "object",
              properties: {
                missions_needed: { type: "number" },
                precision_threshold: { type: "number" },
                specialty_count: { type: "number" }
              }
            },
            transparency_log: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string" },
                  value: { type: "string" },
                  impact: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Check if evolution exists
      const existing = skillEvolutions.find(e => e.crew_member_id === member.id);
      
      if (existing) {
        await base44.entities.CrewSkillEvolution.update(existing.id, {
          specialization_path: analysis.recommended_path,
          unlocked_abilities: analysis.unlockable_abilities,
          mission_performance: {
            successful_missions: member.missions_completed || 0,
            tactical_precision: analysis.performance_analysis.tactical_precision,
            specialty_actions: Math.floor(Math.random() * 20)
          },
          ai_training_recommendations: [{
            recommendation: analysis.reasoning,
            reasoning: analysis.reasoning,
            expected_outcome: `Evolution to ${analysis.recommended_path}`,
            cost: 5000
          }],
          transparency_log: analysis.transparency_log.map(log => ({
            event: log.metric,
            skill_change: {},
            trigger: log.impact,
            timestamp: new Date().toISOString()
          })),
          next_evolution_requirements: analysis.evolution_requirements
        });
      } else {
        await base44.entities.CrewSkillEvolution.create({
          crew_member_id: member.id,
          crew_member_name: member.member_name,
          specialization_path: analysis.recommended_path,
          evolution_stage: 1,
          unlocked_abilities: analysis.unlockable_abilities,
          mission_performance: {
            successful_missions: member.missions_completed || 0,
            tactical_precision: analysis.performance_analysis.tactical_precision,
            specialty_actions: 0
          },
          ai_training_recommendations: [{
            recommendation: analysis.reasoning,
            reasoning: analysis.reasoning,
            expected_outcome: `Evolution to ${analysis.recommended_path}`,
            cost: 5000
          }],
          transparency_log: analysis.transparency_log.map(log => ({
            event: log.metric,
            skill_change: {},
            trigger: log.impact,
            timestamp: new Date().toISOString()
          })),
          next_evolution_requirements: analysis.evolution_requirements
        });
      }

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewSkillEvolutions']);
      toast.success('Evolution path analyzed!');
    }
  });

  if (!playerData?.crew_id) return null;

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Advanced Crew Evolution
          <Badge className="ml-auto bg-purple-600">{skillEvolutions.length} Evolving</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
          <h4 className="text-white font-semibold text-sm mb-2">Define Strategic Goal</h4>
          <Input
            placeholder="e.g., 'Maximize supply line efficiency'"
            value={strategicGoal}
            onChange={(e) => setStrategicGoal(e.target.value)}
            className="bg-slate-900/50 border-purple-500/20 text-white text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">AI will align crew evolution with your goal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {crewMembers.map((member) => {
            const evolution = skillEvolutions.find(e => e.crew_member_id === member.id);
            
            return (
              <div key={member.id} className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{member.member_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{member.member_type}</p>
                  </div>
                  {evolution && (
                    <Badge className="bg-purple-600 text-xs">
                      Stage {evolution.evolution_stage}
                    </Badge>
                  )}
                </div>

                {evolution ? (
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-purple-900/20 border border-purple-500/20">
                      <p className="text-xs text-purple-400 font-semibold">Path:</p>
                      <p className="text-xs text-white capitalize">{evolution.specialization_path.replace('_', ' ')}</p>
                    </div>

                    {evolution.unlocked_abilities?.length > 0 && (
                      <div className="p-2 rounded bg-green-900/20 border border-green-500/20">
                        <p className="text-xs text-green-400 font-semibold mb-1">✨ Abilities:</p>
                        {evolution.unlocked_abilities.slice(0, 2).map((ability, idx) => (
                          <div key={idx} className="text-xs text-gray-300">
                            • {ability.ability_name}
                          </div>
                        ))}
                      </div>
                    )}

                    {evolution.ai_training_recommendations?.[0] && (
                      <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                        <p className="text-xs text-blue-400 font-semibold">🤖 AI Reasoning:</p>
                        <p className="text-xs text-gray-300">{evolution.ai_training_recommendations[0].reasoning}</p>
                      </div>
                    )}

                    {evolution.transparency_log && (
                      <details>
                        <summary className="text-xs text-cyan-400 cursor-pointer flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Performance Data
                        </summary>
                        <div className="mt-1 space-y-1">
                          {evolution.transparency_log.slice(0, 3).map((log, idx) => (
                            <div key={idx} className="text-xs p-1 bg-slate-900/50 rounded">
                              {log.event}: {log.trigger}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 mt-2"
                    onClick={() => analyzeEvolutionMutation.mutate(member)}
                    disabled={analyzeEvolutionMutation.isPending}
                  >
                    {analyzeEvolutionMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Target className="w-4 h-4 mr-2" /> Analyze Evolution</>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}