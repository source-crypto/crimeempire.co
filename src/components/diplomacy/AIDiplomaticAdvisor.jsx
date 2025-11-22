import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AIDiplomaticAdvisor({ playerData }) {
  const queryClient = useQueryClient();

  const { data: factions = [] } = useQuery({
    queryKey: ['rivalFactions'],
    queryFn: () => base44.entities.RivalFaction.filter({ is_active: true })
  });

  const { data: diplomacyActions = [] } = useQuery({
    queryKey: ['factionDiplomacy', playerData?.crew_id],
    queryFn: () => base44.entities.FactionDiplomacy.filter({ 
      crew_id: playerData.crew_id 
    }, '-created_date', 5),
    enabled: !!playerData?.crew_id
  });

  const { data: economicEvents = [] } = useQuery({
    queryKey: ['economicEvents'],
    queryFn: () => base44.entities.EconomicEvent.filter({ status: 'active' })
  });

  const { data: factionEconomies = [] } = useQuery({
    queryKey: ['factionEconomies'],
    queryFn: () => base44.entities.FactionEconomy.list()
  });

  const generateAdviceMutation = useMutation({
    mutationFn: async () => {
      const prompt = `AI Diplomatic Advisor Analysis

Player: ${playerData.username}
Crew: ${playerData.crew_id ? 'Yes' : 'No'}

Active Factions:
${factions.slice(0, 5).map(f => `- ${f.name} (${f.faction_type}): Power ${f.power_level}, Aggression ${f.aggression}, Strategy: ${f.strategy}`).join('\n')}

Recent Diplomacy:
${diplomacyActions.slice(0, 3).map(d => `- ${d.action_type} with ${d.target_faction_name}: ${d.status}`).join('\n')}

Economic Events:
${economicEvents.slice(0, 3).map(e => `- ${e.event_name} (${e.severity})`).join('\n')}

Faction Economies:
${factionEconomies.slice(0, 3).map(fe => `- ${fe.faction_name}: Supply ${fe.current_economic_metrics?.supply_volume || 0}`).join('\n')}

Provide comprehensive diplomatic advice:
1. Analyze each faction relationship
2. Identify hidden agendas based on behavior
3. Recommend diplomatic actions
4. Explain economic impacts
5. Assess risks and opportunities
6. Provide transparency on reasoning

Be strategic and insightful.`;

      const advice = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            faction_analyses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  faction_name: { type: "string" },
                  relationship_status: { type: "string" },
                  hidden_agenda: { type: "string" },
                  personality_traits: {
                    type: "array",
                    items: { type: "string" }
                  },
                  economic_interests: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  target_faction: { type: "string" },
                  reasoning: { type: "string" },
                  expected_outcome: { type: "string" },
                  economic_impact: { type: "string" },
                  risk_level: { type: "string" }
                }
              }
            },
            opportunities: {
              type: "array",
              items: { type: "string" }
            },
            warnings: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return advice;
    },
    onSuccess: () => {
      toast.success('Diplomatic analysis complete');
    }
  });

  if (!playerData) return null;

  const advice = generateAdviceMutation.data;

  return (
    <Card className="glass-panel border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-cyan-400" />
            AI Diplomatic Advisor
          </CardTitle>
          <Button
            size="sm"
            onClick={() => generateAdviceMutation.mutate()}
            disabled={generateAdviceMutation.isPending}
            className="bg-gradient-to-r from-cyan-600 to-blue-600"
          >
            {generateAdviceMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /></>
            ) : (
              <>🤖 Analyze</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!advice ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-30" />
            <p className="text-gray-400 text-sm">Click Analyze for AI diplomatic recommendations</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <p className="text-blue-400 font-semibold text-sm mb-2">📊 Overall Assessment</p>
              <p className="text-gray-300 text-sm">{advice.overall_assessment}</p>
            </div>

            {advice.faction_analyses?.length > 0 && (
              <div>
                <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-1">
                  <Eye className="w-4 h-4 text-purple-400" />
                  Faction Intelligence
                </h4>
                <div className="space-y-2">
                  {advice.faction_analyses.map((faction, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-white font-semibold text-sm">{faction.faction_name}</p>
                        <Badge className="bg-purple-600 text-xs">{faction.relationship_status}</Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="p-2 rounded bg-red-900/20 border border-red-500/20">
                          <p className="text-red-400 font-semibold">🎭 Hidden Agenda:</p>
                          <p className="text-gray-300">{faction.hidden_agenda}</p>
                        </div>
                        
                        <div className="p-2 rounded bg-green-900/20 border border-green-500/20">
                          <p className="text-green-400 font-semibold">💰 Economic Interests:</p>
                          <p className="text-gray-300">{faction.economic_interests}</p>
                        </div>

                        {faction.personality_traits?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {faction.personality_traits.map((trait, i) => (
                              <Badge key={i} className="bg-gray-700 text-xs">{trait}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {advice.recommendations?.length > 0 && (
              <div>
                <h4 className="text-white font-semibold text-sm mb-2">💡 AI Recommendations</h4>
                <div className="space-y-2">
                  {advice.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-cyan-400 font-semibold text-sm capitalize">{rec.action}</p>
                        <Badge className={
                          rec.risk_level === 'high' ? 'bg-red-600' :
                          rec.risk_level === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                        }>
                          {rec.risk_level} risk
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <p className="text-white">Target: {rec.target_faction}</p>
                        <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                          <p className="text-blue-400 font-semibold">Reasoning:</p>
                          <p className="text-gray-300">{rec.reasoning}</p>
                        </div>
                        <div className="p-2 rounded bg-green-900/20 border border-green-500/20">
                          <p className="text-green-400 font-semibold">Expected Outcome:</p>
                          <p className="text-gray-300">{rec.expected_outcome}</p>
                        </div>
                        <div className="p-2 rounded bg-yellow-900/20 border border-yellow-500/20">
                          <p className="text-yellow-400 font-semibold">Economic Impact:</p>
                          <p className="text-gray-300">{rec.economic_impact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {advice.warnings?.length > 0 && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                <p className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings
                </p>
                {advice.warnings.map((warning, idx) => (
                  <p key={idx} className="text-gray-300 text-xs">• {warning}</p>
                ))}
              </div>
            )}

            {advice.opportunities?.length > 0 && (
              <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                <p className="text-green-400 font-semibold text-sm mb-2">🎯 Opportunities</p>
                {advice.opportunities.map((opp, idx) => (
                  <p key={idx} className="text-gray-300 text-xs">• {opp}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}