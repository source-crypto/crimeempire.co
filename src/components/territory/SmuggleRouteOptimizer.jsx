import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Route, TrendingUp, AlertTriangle, DollarSign, 
  Shield, Zap, CheckCircle, Loader2, Target 
} from 'lucide-react';
import { toast } from 'sonner';

const riskColors = {
  low: 'text-green-400 bg-green-900/20 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20',
  high: 'text-red-400 bg-red-900/20 border-red-500/20',
  extreme: 'text-red-600 bg-red-900/30 border-red-500/30'
};

export default function SmuggleRouteOptimizer({ crewId, playerData }) {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const queryClient = useQueryClient();

  if (!crewId || !playerData) {
    return null;
  }

  const { data: territories = [] } = useQuery({
    queryKey: ['crewTerritories', crewId],
    queryFn: () => base44.entities.Territory.filter({ controlling_crew_id: crewId })
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['smuggleRoutes', crewId],
    queryFn: () => base44.entities.SmuggleRoute.filter({ crew_id: crewId }, '-created_date')
  });

  const generateRoutesMutation = useMutation({
    mutationFn: async ({ fromTerritoryId, toTerritoryId }) => {
      const fromTerritory = territories.find(t => t.id === fromTerritoryId);
      const toTerritory = territories.find(t => t.id === toTerritoryId);

      if (!fromTerritory || !toTerritory) {
        throw new Error('Invalid territories selected');
      }

      const worldEvents = await base44.entities.WorldEvent.filter({ status: 'active' }, '-created_date', 10);
      const factions = await base44.entities.RivalFaction.filter({ is_active: true });
      const allTerritories = await base44.entities.Territory.list();
      
      const prompt = `You are an AI route optimizer for a criminal smuggling operation.

FROM: ${fromTerritory.name} (Security: ${fromTerritory.control_percentage}%, Type: ${fromTerritory.resource_type})
TO: ${toTerritory.name} (Security: ${toTerritory.control_percentage}%, Type: ${toTerritory.resource_type})

Active World Events:
${worldEvents.map(e => `- ${e.event_name} (${e.severity}): ${e.description}`).join('\n')}

Rival Faction Presence:
${factions.map(f => `- ${f.name} (${f.faction_type}): Aggression ${f.aggression}/100, Controls ${f.controlled_territories?.length || 0} territories`).join('\n')}

All Available Territories: ${allTerritories.length} districts

Generate 3 DIFFERENT smuggling routes from ${fromTerritory.name} to ${toTerritory.name}:
1. LOW RISK: Safest route, lower profit, avoids hot zones
2. BALANCED: Medium risk/reward, strategic waypoints
3. HIGH RISK: Dangerous but highly profitable, shortest path through contested areas

For each route:
- List 2-4 waypoint territories (use real district names if available, or generate plausible ones)
- Calculate total risk score (0-100) based on:
  * World events (law crackdowns = higher risk)
  * Faction presence in waypoint territories
  * Territory security levels
  * Historical data
- Determine profit multiplier (1.2x to 3.0x based on risk)
- Provide AI analysis: specific risk factors, opportunities, recommendations, optimal timing

Make routes strategically interesting and varied!`;

      const routeData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            routes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  route_name: { type: 'string' },
                  waypoints: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        territory_name: { type: 'string' },
                        risk_level: { type: 'number' }
                      }
                    }
                  },
                  total_risk_score: { type: 'number' },
                  potential_profit_multiplier: { type: 'number' },
                  distance: { type: 'number' },
                  ai_analysis: {
                    type: 'object',
                    properties: {
                      risk_factors: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      opportunities: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      recommendation: { type: 'string' },
                      optimal_timing: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const createdRoutes = [];
      for (const route of routeData.routes) {
        const newRoute = await base44.entities.SmuggleRoute.create({
          route_name: route.route_name,
          from_territory_id: fromTerritoryId,
          to_territory_id: toTerritoryId,
          from_territory_name: fromTerritory.name,
          to_territory_name: toTerritory.name,
          waypoints: route.waypoints,
          total_risk_score: route.total_risk_score,
          potential_profit_multiplier: route.potential_profit_multiplier,
          distance: route.distance,
          ai_analysis: route.ai_analysis,
          success_rate: Math.max(20, 100 - route.total_risk_score),
          crew_id: crewId,
          status: 'suggested'
        });
        createdRoutes.push(newRoute);
      }

      return createdRoutes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['smuggleRoutes']);
      toast.success('AI route analysis complete!');
    },
    onError: () => {
      toast.error('Failed to generate routes');
    }
  });

  const executeRouteMutation = useMutation({
    mutationFn: async (routeId) => {
      const route = routes.find(r => r.id === routeId);
      const baseCargo = 10000;
      const profit = baseCargo * route.potential_profit_multiplier;

      const successRoll = Math.random() * 100;
      const success = successRoll < route.success_rate;

      if (success) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance + profit
        });

        await base44.entities.SmuggleRoute.update(routeId, {
          times_used: route.times_used + 1,
          last_used: new Date().toISOString(),
          success_rate: Math.min(95, route.success_rate + 2),
          status: 'safe'
        });

        await base44.entities.CrewActivity.create({
          crew_id: crewId,
          activity_type: 'major_payout',
          title: '✓ Smuggling Run Success',
          description: `${route.route_name}: +$${profit.toLocaleString()}`,
          player_id: playerData.id,
          player_username: playerData.username,
          value: profit
        });

        return { success: true, profit };
      } else {
        const loss = baseCargo * 0.3;
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: Math.max(0, playerData.crypto_balance - loss)
        });

        await base44.entities.SmuggleRoute.update(routeId, {
          times_used: route.times_used + 1,
          last_used: new Date().toISOString(),
          success_rate: Math.max(10, route.success_rate - 10),
          status: 'compromised'
        });

        await base44.entities.CrewActivity.create({
          crew_id: crewId,
          activity_type: 'territory_lost',
          title: '✗ Smuggling Run Failed',
          description: `${route.route_name}: Cargo intercepted, -$${loss.toLocaleString()}`,
          player_id: playerData.id,
          player_username: playerData.username
        });

        return { success: false, loss };
      }
    },
    onSuccess: ({ success, profit, loss }) => {
      queryClient.invalidateQueries(['smuggleRoutes']);
      queryClient.invalidateQueries(['player']);
      if (success) {
        toast.success(`Smuggling success! +$${profit.toLocaleString()}`);
      } else {
        toast.error(`Cargo intercepted! -$${loss.toLocaleString()}`);
      }
    }
  });

  const getRiskLevel = (score) => {
    if (score < 30) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'extreme';
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Route className="w-5 h-5 text-purple-400" />
              AI Route Optimizer
              <Badge className="ml-2 bg-purple-600">{routes.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {territories.length < 2 ? (
            <div className="text-center py-8 text-gray-400">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Control at least 2 territories to generate smuggling routes</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 rounded-lg bg-slate-900/50 border border-purple-500/10">
                <p className="text-sm text-gray-400 mb-2">Generate AI-optimized smuggling routes between your territories</p>
                <div className="flex gap-2">
                  {territories.slice(0, 2).map((terr, idx) => (
                    <Button
                      key={terr.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (territories.length >= 2) {
                          generateRoutesMutation.mutate({
                            fromTerritoryId: territories[0].id,
                            toTerritoryId: territories[territories.length > 1 ? 1 : 0].id
                          });
                        }
                      }}
                      disabled={generateRoutesMutation.isPending}
                      className="flex-1"
                    >
                      {generateRoutesMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Generate Routes
                    </Button>
                  ))}
                </div>
              </div>

              {routes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Route className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No routes generated yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route) => {
                    const riskLevel = getRiskLevel(route.total_risk_score);
                    const isExpanded = selectedRoute === route.id;

                    return (
                      <div
                        key={route.id}
                        className={`p-4 rounded-lg border ${riskColors[riskLevel]}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-white mb-1">{route.route_name}</h4>
                            <p className="text-sm text-gray-400">
                              {route.from_territory_name} → {route.to_territory_name}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={riskLevel === 'low' ? 'bg-green-600' : 
                                             riskLevel === 'medium' ? 'bg-yellow-600' : 
                                             riskLevel === 'high' ? 'bg-red-600' : 'bg-red-800'}>
                              {riskLevel.toUpperCase()} RISK
                            </Badge>
                            <Badge variant="outline" className="text-cyan-400">
                              {route.potential_profit_multiplier.toFixed(1)}x Profit
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div className="text-gray-400">
                            Success Rate: <span className="text-white">{route.success_rate}%</span>
                          </div>
                          <div className="text-gray-400">
                            Times Used: <span className="text-white">{route.times_used}</span>
                          </div>
                          <div className="text-gray-400">
                            Risk Score: <span className="text-red-400">{route.total_risk_score}/100</span>
                          </div>
                          <div className="text-gray-400">
                            Status: <span className={route.status === 'safe' ? 'text-green-400' : 
                                                     route.status === 'compromised' ? 'text-red-400' : 
                                                     'text-yellow-400'}>
                              {route.status}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mb-2"
                          onClick={() => setSelectedRoute(isExpanded ? null : route.id)}
                        >
                          {isExpanded ? 'Hide Details' : 'Show AI Analysis'}
                        </Button>

                        {isExpanded && route.ai_analysis && (
                          <div className="mt-3 p-3 rounded-lg bg-slate-950/50 space-y-2">
                            <div>
                              <p className="text-xs font-semibold text-purple-400 mb-1">Waypoints:</p>
                              <div className="flex flex-wrap gap-1">
                                {route.waypoints?.map((wp, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {wp.territory_name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-red-400 mb-1">Risk Factors:</p>
                              {route.ai_analysis.risk_factors?.map((risk, idx) => (
                                <p key={idx} className="text-xs text-gray-400">• {risk}</p>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-green-400 mb-1">Opportunities:</p>
                              {route.ai_analysis.opportunities?.map((opp, idx) => (
                                <p key={idx} className="text-xs text-gray-400">• {opp}</p>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-cyan-400 mb-1">AI Recommendation:</p>
                              <p className="text-xs text-gray-300">{route.ai_analysis.recommendation}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-yellow-400 mb-1">Optimal Timing:</p>
                              <p className="text-xs text-gray-300">{route.ai_analysis.optimal_timing}</p>
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full mt-3 bg-gradient-to-r from-purple-600 to-cyan-600"
                          onClick={() => executeRouteMutation.mutate(route.id)}
                          disabled={executeRouteMutation.isPending}
                        >
                          {executeRouteMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Executing...
                            </>
                          ) : (
                            <>
                              <Route className="w-4 h-4 mr-2" />
                              Execute Smuggling Run
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}