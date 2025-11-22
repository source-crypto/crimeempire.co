import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, AlertTriangle, TrendingUp, Zap, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function CascadingEventEngine({ playerData }) {
  const queryClient = useQueryClient();

  const { data: worldEvents = [] } = useQuery({
    queryKey: ['worldEvents'],
    queryFn: () => base44.entities.WorldEvent.filter({ status: 'active' }),
    refetchInterval: 15000
  });

  const { data: eventInteractions = [] } = useQuery({
    queryKey: ['eventInteractions'],
    queryFn: () => base44.entities.WorldEventInteraction.list('-created_date', 20),
    refetchInterval: 15000
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['allTerritories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const { data: factions = [] } = useQuery({
    queryKey: ['rivalFactions'],
    queryFn: () => base44.entities.RivalFaction.list()
  });

  const processCascadingEventsMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze active world events and generate cascading effects.

Active Events:
${worldEvents.map(e => `- ${e.event_name} (${e.event_type}, ${e.severity}): ${e.description}
  Affected Territories: ${e.affected_territories?.join(', ') || 'None'}
  Affected Factions: ${e.affected_factions?.join(', ') || 'None'}`).join('\n\n')}

All Territories: ${territories.map(t => t.name).join(', ')}
Rival Factions: ${factions.map(f => f.name).join(', ')}

Generate cascading effects:
1. Law crackdowns should trigger black market activity in neighboring territories
2. Gang wars should spill into nearby player-controlled areas
3. Economic events should affect supply chains
4. Faction conflicts should create opportunities/threats elsewhere
5. Each primary event should trigger 2-4 secondary events

For each cascading chain, provide:
- Primary event details
- 2-4 triggered secondary events with full details
- Affected territories and why
- Market impacts (item types, price changes, demand shifts)
- Player opportunities or threats`;

      const cascadeData = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            cascades: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  primary_event_id: { type: "string" },
                  primary_event_name: { type: "string" },
                  triggered_events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        event_name: { type: "string" },
                        event_type: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string" },
                        affected_territory: { type: "string" },
                        trigger_reason: { type: "string" }
                      }
                    }
                  },
                  cascade_effects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        affected_territory: { type: "string" },
                        effect_type: { type: "string" },
                        magnitude: { type: "number" }
                      }
                    }
                  },
                  market_impacts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item_type: { type: "string" },
                        price_change: { type: "number" },
                        demand_change: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const createdEvents = [];
      const eventBroadcasts = [];

      for (const cascade of cascadeData.cascades) {
        // Create interaction record
        const interaction = await base44.entities.WorldEventInteraction.create({
          primary_event_id: cascade.primary_event_id,
          primary_event_name: cascade.primary_event_name,
          triggered_events: cascade.triggered_events.map(e => ({
            event_id: crypto.randomUUID(),
            event_name: e.event_name,
            trigger_reason: e.trigger_reason
          })),
          cascade_effects: cascade.cascade_effects,
          market_impacts: cascade.market_impacts,
          interaction_type: 'cascade',
          ai_generated: true
        });

        // Create actual triggered world events
        for (const triggeredEvent of cascade.triggered_events) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 48);

          const newEvent = await base44.entities.WorldEvent.create({
            event_name: triggeredEvent.event_name,
            event_type: triggeredEvent.event_type,
            description: triggeredEvent.description,
            narrative: `Triggered by ${cascade.primary_event_name}: ${triggeredEvent.trigger_reason}`,
            severity: triggeredEvent.severity,
            affected_territories: [triggeredEvent.affected_territory],
            status: 'active',
            starts_at: new Date().toISOString(),
            ends_at: expiresAt.toISOString(),
            ai_generated: true
          });

          createdEvents.push(newEvent);

          // Create global broadcast for each cascading event
          const broadcast = await base44.entities.EventBroadcast.create({
            event_id: newEvent.id,
            event_name: newEvent.event_name,
            event_type: 'cascading_world_event',
            broadcast_message: `⚡ CASCADING EVENT: ${newEvent.event_name} - ${newEvent.description}`,
            is_global: true,
            participants: [],
            ai_inquiry: {
              question: `How would you respond to this cascading event? What strategic actions would you take?`,
              context: `${newEvent.event_name} has been triggered by ${cascade.primary_event_name}. This affects ${triggeredEvent.affected_territory}.`,
              assessment_criteria: [
                'Strategic thinking and planning',
                'Understanding of cascading effects',
                'Resource management approach',
                'Risk assessment ability'
              ],
              rewards: {
                crypto: 15000,
                experience: 500,
                reputation: 20
              }
            },
            player_responses: [],
            status: 'active',
            expires_at: expiresAt.toISOString()
          });

          eventBroadcasts.push(broadcast);
        }

        // Apply market impacts
        for (const impact of cascade.market_impacts) {
          const marketItems = await base44.entities.MarketFluctuation.filter({
            item_type: impact.item_type
          });

          if (marketItems.length > 0) {
            const item = marketItems[0];
            await base44.entities.MarketFluctuation.update(item.id, {
              current_price: item.current_price * (1 + impact.price_change / 100),
              price_change_percentage: (item.price_change_percentage || 0) + impact.price_change,
              demand_level: Math.max(0, Math.min(200, item.demand_level + impact.demand_change)),
              influencing_factors: [
                ...(item.influencing_factors || []),
                {
                  factor_type: 'cascading_event',
                  factor_id: interaction.id,
                  impact: impact.price_change
                }
              ],
              last_updated: new Date().toISOString()
            });
          }
        }
      }

      return { createdEvents, eventBroadcasts, cascadeData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['worldEvents']);
      queryClient.invalidateQueries(['eventInteractions']);
      queryClient.invalidateQueries(['marketFluctuations']);
      queryClient.invalidateQueries(['eventBroadcasts']);
      toast.success(`Generated ${data.createdEvents.length} cascading events`);
    },
    onError: (error) => {
      toast.error('Failed to process cascading events');
    }
  });

  if (!playerData) return null;

  return (
    <Card className="glass-panel border-orange-500/20">
      <CardHeader className="border-b border-orange-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-orange-400" />
            Cascading Event System
            <Badge className="ml-2 bg-orange-600">{eventInteractions.length} Active Chains</Badge>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => processCascadingEventsMutation.mutate()}
            disabled={processCascadingEventsMutation.isPending || worldEvents.length === 0}
            className="bg-gradient-to-r from-orange-600 to-red-600"
          >
            {processCascadingEventsMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Generate Cascades</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {eventInteractions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No cascading events yet</p>
            <p className="text-xs mt-1">Events will trigger secondary effects across the world</p>
          </div>
        ) : (
          eventInteractions.map((interaction) => (
            <div key={interaction.id} className="p-4 rounded-lg bg-slate-900/30 border border-orange-500/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-semibold text-sm">{interaction.primary_event_name}</h4>
                  <Badge className="mt-1 bg-orange-600 capitalize">
                    {interaction.interaction_type}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {interaction.triggered_events?.map((triggered, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-orange-400" />
                    <span className="text-gray-300">{triggered.event_name}</span>
                    <span className="text-gray-500 text-xs">({triggered.trigger_reason})</span>
                  </div>
                ))}
              </div>

              {interaction.cascade_effects?.length > 0 && (
                <div className="mt-3 p-2 rounded bg-red-900/20 border border-red-500/20">
                  <p className="text-xs text-red-400 font-semibold mb-1">Territory Impacts:</p>
                  {interaction.cascade_effects.slice(0, 3).map((effect, idx) => (
                    <p key={idx} className="text-xs text-gray-300">
                      • {effect.affected_territory}: {effect.effect_type} ({effect.magnitude > 0 ? '+' : ''}{effect.magnitude})
                    </p>
                  ))}
                </div>
              )}

              {interaction.market_impacts?.length > 0 && (
                <div className="mt-2 p-2 rounded bg-green-900/20 border border-green-500/20">
                  <p className="text-xs text-green-400 font-semibold mb-1">Market Shifts:</p>
                  {interaction.market_impacts.slice(0, 3).map((impact, idx) => (
                    <p key={idx} className="text-xs text-gray-300 capitalize">
                      • {impact.item_type}: {impact.price_change > 0 ? '+' : ''}{impact.price_change}% price
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}