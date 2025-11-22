import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerActionEventSystem({ playerData }) {
  const queryClient = useQueryClient();

  const { data: actionTriggers = [] } = useQuery({
    queryKey: ['playerActionTriggers', playerData?.id],
    queryFn: () => base44.entities.PlayerActionTrigger.filter({ 
      player_id: playerData.id 
    }, '-created_date', 10),
    enabled: !!playerData,
    refetchInterval: 10000
  });

  const evaluateActionMutation = useMutation({
    mutationFn: async ({ actionType, magnitude, details }) => {
      const prompt = `Evaluate player action and generate economic event response.

Player: ${playerData.username}
Action: ${actionType}
Magnitude: ${magnitude}/100
Details: ${JSON.stringify(details)}

Analyze:
1. Market impact (price shifts, volatility)
2. Faction reactions (each major faction)
3. Cascading effects (secondary impacts)
4. Event generation
5. Complete transparency chain

Provide:
- Event name and description
- Market price impacts
- Faction counter-strategies
- Cascading chain of effects
- Full calculation transparency`;

      const evaluation = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            event_name: { type: "string" },
            event_description: { type: "string" },
            market_impact: { type: "number" },
            price_impacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_type: { type: "string" },
                  price_change: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            faction_reactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  faction_name: { type: "string" },
                  reaction_type: { type: "string" },
                  intensity: { type: "number" },
                  counter_strategy: { type: "string" }
                }
              }
            },
            cascading_effects: {
              type: "array",
              items: { type: "string" }
            },
            transparency_chain: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "string" },
                  calculation: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Create economic event
      const event = await base44.entities.EconomicEvent.create({
        event_name: evaluation.event_name,
        event_type: 'player_triggered',
        severity: magnitude > 70 ? 'major' : magnitude > 40 ? 'moderate' : 'minor',
        price_impacts: evaluation.price_impacts,
        ai_analysis: {
          root_cause: `Player action: ${actionType}`,
          player_opportunities: evaluation.cascading_effects
        },
        transparency_chain: evaluation.transparency_chain,
        status: 'active'
      });

      // Create action trigger record
      const trigger = await base44.entities.PlayerActionTrigger.create({
        player_id: playerData.id,
        player_username: playerData.username,
        action_type: actionType,
        action_magnitude: magnitude,
        action_details: details,
        triggered_event_id: event.id,
        ai_impact_assessment: {
          market_impact: evaluation.market_impact,
          faction_reactions: evaluation.faction_reactions,
          cascading_effects: evaluation.cascading_effects
        },
        transparency_chain: evaluation.transparency_chain,
        status: 'triggered'
      });

      // Apply market impacts
      for (const impact of evaluation.price_impacts) {
        const items = await base44.entities.MarketFluctuation.filter({
          item_type: impact.item_type
        });
        if (items[0]) {
          await base44.entities.MarketFluctuation.update(items[0].id, {
            current_price: items[0].current_price * (1 + impact.price_change / 100),
            price_change_percentage: impact.price_change
          });
        }
      }

      // Create faction activities
      for (const reaction of evaluation.faction_reactions) {
        await base44.entities.FactionActivity.create({
          faction_name: reaction.faction_name,
          activity_type: reaction.reaction_type,
          target_type: 'player',
          target_id: playerData.id,
          target_name: playerData.username,
          ai_strategy: {
            motivation: reaction.counter_strategy,
            counter_to_player_action: `Response to ${actionType}`
          },
          status: 'planning'
        });
      }

      return { trigger, event, evaluation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerActionTriggers']);
      queryClient.invalidateQueries(['economicEvents']);
      queryClient.invalidateQueries(['factionActivities']);
      queryClient.invalidateQueries(['marketFluctuations']);
      toast.success('Player action triggered economic event!');
    }
  });

  if (!playerData) return null;

  return (
    <Card className="glass-panel border-yellow-500/20">
      <CardHeader className="border-b border-yellow-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Player-Triggered Events
          <Badge className="ml-auto bg-yellow-600">{actionTriggers.length} Total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
          <p className="text-sm text-gray-300 mb-2">
            Your major actions trigger AI-evaluated economic events with full transparency
          </p>
          <div className="space-y-2">
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600"
              onClick={() => evaluateActionMutation.mutate({
                actionType: 'large_investment',
                magnitude: 80,
                details: { amount: 100000, target: 'Test Market' }
              })}
              disabled={evaluateActionMutation.isPending}
            >
              {evaluateActionMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Evaluating...</>
              ) : (
                <>💰 Trigger Investment Event (Demo)</>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {actionTriggers.map((trigger) => (
            <div key={trigger.id} className="p-4 rounded-lg bg-slate-900/30 border border-yellow-500/10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-semibold capitalize">{trigger.action_type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400">Magnitude: {trigger.action_magnitude}/100</p>
                </div>
                <Badge className={
                  trigger.status === 'triggered' ? 'bg-orange-600' :
                  trigger.status === 'cascading' ? 'bg-red-600' : 'bg-green-600'
                }>
                  {trigger.status}
                </Badge>
              </div>

              {trigger.ai_impact_assessment && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-green-900/20 border border-green-500/20">
                    <p className="text-xs text-green-400 font-semibold">📊 Market Impact:</p>
                    <p className="text-xs text-gray-300">{trigger.ai_impact_assessment.market_impact?.toFixed(1)}% disruption</p>
                  </div>

                  {trigger.ai_impact_assessment.faction_reactions?.length > 0 && (
                    <div className="p-2 rounded bg-red-900/20 border border-red-500/20">
                      <p className="text-xs text-red-400 font-semibold mb-1">⚔️ Faction Reactions:</p>
                      {trigger.ai_impact_assessment.faction_reactions.map((reaction, idx) => (
                        <div key={idx} className="text-xs text-gray-300">
                          • {reaction.faction_name}: {reaction.reaction_type} (Intensity: {reaction.intensity})
                        </div>
                      ))}
                    </div>
                  )}

                  {trigger.ai_impact_assessment.cascading_effects?.length > 0 && (
                    <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                      <p className="text-xs text-blue-400 font-semibold mb-1">🌊 Cascading Effects:</p>
                      {trigger.ai_impact_assessment.cascading_effects.map((effect, idx) => (
                        <div key={idx} className="text-xs text-gray-300">• {effect}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {trigger.transparency_chain && (
                <details className="mt-2">
                  <summary className="text-xs text-cyan-400 cursor-pointer flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    View Transparency Chain
                  </summary>
                  <div className="mt-2 space-y-1">
                    {trigger.transparency_chain.map((step, idx) => (
                      <div key={idx} className="text-xs p-2 bg-slate-900/50 rounded">
                        <p className="text-cyan-400 font-semibold">{step.step}</p>
                        <p className="text-gray-400">{step.calculation}</p>
                        <p className="text-gray-500 italic">{step.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}