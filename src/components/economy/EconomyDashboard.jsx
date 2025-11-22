import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertTriangle, TrendingUp, Zap, Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function EconomyDashboard({ playerData }) {
  const queryClient = useQueryClient();

  const { data: economicEvents = [] } = useQuery({
    queryKey: ['economicEvents'],
    queryFn: () => base44.entities.EconomicEvent.filter({ status: 'active' }, '-created_date', 10),
    refetchInterval: 15000
  });

  const { data: factionEconomies = [] } = useQuery({
    queryKey: ['factionEconomies'],
    queryFn: () => base44.entities.FactionEconomy.list(),
    refetchInterval: 20000
  });

  const { data: marketFluctuations = [] } = useQuery({
    queryKey: ['marketFluctuations'],
    queryFn: () => base44.entities.MarketFluctuation.list('-last_updated', 20),
    refetchInterval: 15000
  });

  const triggerCrisisMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a Four-Minute Economic Crisis event.

Current Market State:
${marketFluctuations.map(m => `- ${m.item_name}: $${m.current_price} (${m.trend})`).join('\n')}

Active Factions: ${factionEconomies.length}

Create:
1. Crisis name and type
2. Affected items and factions
3. Dramatic price impacts (2-5x volatility)
4. AI analysis with opportunities
5. Transparency chain showing calculations
6. Duration: exactly 4 minutes`;

      const crisis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            event_name: { type: "string" },
            event_type: { type: "string" },
            severity: { type: "string" },
            affected_items: {
              type: "array",
              items: { type: "string" }
            },
            price_impacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_type: { type: "string" },
                  price_change_percentage: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            root_cause: { type: "string" },
            player_opportunities: {
              type: "array",
              items: { type: "string" }
            },
            recommended_actions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 4);

      const event = await base44.entities.EconomicEvent.create({
        event_name: crisis.event_name,
        event_type: 'four_minute_crisis',
        severity: 'critical',
        affected_items: crisis.affected_items,
        price_impacts: crisis.price_impacts,
        ai_analysis: {
          root_cause: crisis.root_cause,
          predicted_duration: 4,
          player_opportunities: crisis.player_opportunities,
          recommended_actions: crisis.recommended_actions
        },
        escalation_phase: 'four_minute',
        status: 'active',
        expires_at: expiresAt.toISOString()
      });

      // Apply price impacts
      for (const impact of crisis.price_impacts) {
        const items = await base44.entities.MarketFluctuation.filter({
          item_type: impact.item_type
        });

        if (items[0]) {
          await base44.entities.MarketFluctuation.update(items[0].id, {
            current_price: items[0].current_price * (1 + impact.price_change_percentage / 100),
            price_change_percentage: impact.price_change_percentage,
            volatility_index: 3,
            trend: impact.price_change_percentage > 0 ? 'volatile' : 'falling'
          });
        }
      }

      // Broadcast
      await base44.entities.EventBroadcast.create({
        event_id: event.id,
        event_name: crisis.event_name,
        event_type: 'four_minute_crisis',
        broadcast_message: `🚨 FOUR-MINUTE CRISIS: ${crisis.event_name} - ${crisis.root_cause}`,
        is_global: true,
        participants: [],
        status: 'active',
        expires_at: expiresAt.toISOString()
      });

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['economicEvents']);
      queryClient.invalidateQueries(['marketFluctuations']);
      queryClient.invalidateQueries(['eventBroadcasts']);
      toast.success('🚨 FOUR-MINUTE CRISIS INITIATED!');
    }
  });

  if (!playerData) return null;

  const globalVolatility = marketFluctuations.reduce((sum, m) => 
    sum + (m.volatility_index || 1), 0) / marketFluctuations.length;

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-orange-500/20">
        <CardHeader className="border-b border-orange-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              Economy Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={
                globalVolatility > 2 ? 'bg-red-600' :
                globalVolatility > 1.5 ? 'bg-yellow-600' : 'bg-green-600'
              }>
                Volatility: {globalVolatility.toFixed(1)}x
              </Badge>
              <Button
                size="sm"
                onClick={() => triggerCrisisMutation.mutate()}
                disabled={triggerCrisisMutation.isPending}
                className="bg-gradient-to-r from-red-600 to-orange-600"
              >
                {triggerCrisisMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                  <>⚡ Trigger Crisis</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="events">
            <TabsList className="bg-slate-900/50">
              <TabsTrigger value="events">Economic Events</TabsTrigger>
              <TabsTrigger value="factions">Faction Economies</TabsTrigger>
              <TabsTrigger value="markets">Live Markets</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-3 mt-3">
              {economicEvents.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No active economic events</p>
              ) : (
                economicEvents.map((event) => (
                  <div key={event.id} className={`p-4 rounded-lg border ${
                    event.escalation_phase === 'four_minute' ? 'bg-red-900/20 border-red-500/30' :
                    'bg-slate-900/30 border-orange-500/10'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-semibold">{event.event_name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{event.event_type.replace('_', ' ')}</p>
                      </div>
                      <Badge className={
                        event.severity === 'critical' ? 'bg-red-600' :
                        event.severity === 'major' ? 'bg-orange-600' : 'bg-yellow-600'
                      }>
                        {event.severity}
                      </Badge>
                    </div>

                    {event.ai_analysis && (
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                          <p className="text-xs text-blue-400 font-semibold">Root Cause:</p>
                          <p className="text-xs text-gray-300">{event.ai_analysis.root_cause}</p>
                        </div>

                        {event.ai_analysis.player_opportunities?.length > 0 && (
                          <div className="p-2 rounded bg-green-900/20 border border-green-500/20">
                            <p className="text-xs text-green-400 font-semibold mb-1">💰 Opportunities:</p>
                            {event.ai_analysis.player_opportunities.map((opp, idx) => (
                              <p key={idx} className="text-xs text-gray-300">• {opp}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {event.price_impacts?.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-orange-400 cursor-pointer">Price Impacts</summary>
                        <div className="mt-2 space-y-1">
                          {event.price_impacts.map((impact, idx) => (
                            <div key={idx} className="text-xs p-2 bg-slate-900/50 rounded">
                              <span className="text-orange-400">{impact.item_type}:</span> {impact.price_change_percentage > 0 ? '+' : ''}{impact.price_change_percentage}% - {impact.reason}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="factions" className="mt-3">
              {factionEconomies.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No faction data</p>
              ) : (
                <div className="space-y-2">
                  {factionEconomies.map((faction) => (
                    <div key={faction.id} className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                      <h4 className="text-white font-semibold text-sm mb-1">{faction.faction_name}</h4>
                      <p className="text-xs text-gray-400 mb-2">{faction.economic_theme}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">Supply Vol:</span>
                          <span className="text-white ml-1">{faction.current_economic_metrics?.supply_volume || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Demand:</span>
                          <span className="text-white ml-1">{faction.current_economic_metrics?.demand_pressure || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="markets" className="mt-3">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {marketFluctuations.map((market) => (
                  <div key={market.id} className="p-3 rounded-lg bg-slate-900/30 border border-green-500/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold text-sm">{market.item_name}</p>
                        <p className="text-xs text-gray-400">${market.current_price?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          market.trend === 'rising' ? 'bg-green-600' :
                          market.trend === 'falling' ? 'bg-red-600' :
                          market.trend === 'volatile' ? 'bg-orange-600' : 'bg-gray-600'
                        }>
                          {market.trend}
                        </Badge>
                        {market.volatility_index > 1 && (
                          <p className="text-xs text-orange-400 mt-1">×{market.volatility_index} volatility</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}