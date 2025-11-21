import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Shield, Route, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartRouteOptimizer({ crewId, playerData }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [routeSuggestions, setRouteSuggestions] = useState(null);
  const queryClient = useQueryClient();

  if (!crewId || !playerData) {
    return null;
  }

  const { data: territories = [] } = useQuery({
    queryKey: ['crewTerritories', crewId],
    queryFn: () => base44.entities.Territory.filter({ controlling_crew_id: crewId })
  });

  const { data: allTerritories = [] } = useQuery({
    queryKey: ['allTerritories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const { data: worldEvents = [] } = useQuery({
    queryKey: ['worldEvents'],
    queryFn: async () => {
      const events = await base44.entities.WorldEvent.filter({ status: 'active' });
      return events.slice(0, 5);
    }
  });

  const { data: factions = [] } = useQuery({
    queryKey: ['rivalFactions'],
    queryFn: async () => {
      const factions = await base44.entities.RivalFaction.filter({ is_active: true });
      return factions.slice(0, 10);
    }
  });

  const { data: existingRoutes = [] } = useQuery({
    queryKey: ['supplyRoutes', crewId],
    queryFn: () => base44.entities.SupplyRoute.filter({ crew_id: crewId })
  });

  const analyzeRoutesMutation = useMutation({
    mutationFn: async () => {
      setAnalyzing(true);

      const prompt = `Analyze and recommend optimal smuggling routes for crew territories.

Crew Territories (${territories.length}):
${territories.map(t => `- ${t.name} (${t.resource_type}, Security: ${t.defense_level || 0})`).join('\n')}

World Events:
${worldEvents.map(e => `- ${e.event_name} (${e.severity}): ${e.description.substring(0, 100)}`).join('\n') || 'None active'}

Rival Faction Presence:
${factions.map(f => `- ${f.name} (Power: ${f.power_level}, Aggression: ${f.aggression})`).join('\n')}

Existing Routes: ${existingRoutes.length}

Generate 3-5 optimal route options considering:
1. Faction territorial conflicts
2. World event impacts on specific territories
3. Security levels of controlled territories
4. Historical success rates and threat assessment

For each route:
- Start and end territories
- Risk score (0-100)
- Profit potential estimate
- Key threats and mitigation strategies
- Recommended cargo types`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_routes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  route_name: { type: "string" },
                  from_territory: { type: "string" },
                  to_territory: { type: "string" },
                  waypoints: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  risk_score: { type: "number" },
                  profit_potential: { type: "number" },
                  success_rate: { type: "number" },
                  recommendation: { type: "string" },
                  threat_analysis: {
                    type: "object",
                    properties: {
                      rival_presence: { type: "number" },
                      law_enforcement: { type: "number" },
                      world_events: { type: "number" },
                      territory_security: { type: "number" }
                    }
                  },
                  mitigation_strategies: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            market_analysis: { type: "string" }
          }
        }
      });

      setRouteSuggestions(result);
      return result;
    },
    onSuccess: () => {
      setAnalyzing(false);
      toast.success('Route analysis complete');
    },
    onError: () => {
      setAnalyzing(false);
      toast.error('Failed to analyze routes');
    }
  });

  const createRouteMutation = useMutation({
    mutationFn: async (routeData) => {
      const fromTerritory = territories.find(t => t.name === routeData.from_territory);
      const toTerritory = territories.find(t => t.name === routeData.to_territory);

      if (!fromTerritory || !toTerritory) {
        throw new Error('Invalid territories');
      }

      await base44.entities.SupplyRoute.create({
        route_name: routeData.route_name,
        from_territory_id: fromTerritory.id,
        to_territory_id: toTerritory.id,
        waypoint_territories: routeData.waypoints || [],
        crew_id: crewId,
        risk_score: routeData.risk_score,
        profit_potential: routeData.profit_potential,
        success_rate: routeData.success_rate,
        total_distance: routeData.waypoints?.length || 0,
        threat_factors: routeData.threat_analysis,
        ai_recommendation: routeData.risk_score < 30 ? 'highly_recommended' :
                          routeData.risk_score < 50 ? 'recommended' :
                          routeData.risk_score < 70 ? 'risky' : 'not_recommended',
        ai_analysis: {
          mitigation_strategies: routeData.mitigation_strategies,
          analysis_date: new Date().toISOString()
        },
        status: 'active'
      });

      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'supply_line_created',
        title: '🛣️ New Smart Route',
        description: `AI-optimized route: ${routeData.route_name}`,
        player_id: playerData.id,
        player_username: playerData.username
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyRoutes']);
      toast.success('Route created successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const getRiskColor = (risk) => {
    if (risk < 30) return 'text-green-400';
    if (risk < 50) return 'text-yellow-400';
    if (risk < 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRecommendationBadge = (risk) => {
    if (risk < 30) return <Badge className="bg-green-600">Highly Recommended</Badge>;
    if (risk < 50) return <Badge className="bg-blue-600">Recommended</Badge>;
    if (risk < 70) return <Badge className="bg-orange-600">Risky</Badge>;
    return <Badge className="bg-red-600">Not Recommended</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Route className="w-5 h-5 text-cyan-400" />
              AI Route Optimizer
            </CardTitle>
            <Button
              onClick={() => analyzeRoutesMutation.mutate()}
              disabled={analyzing || territories.length < 2}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Routes
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {territories.length < 2 ? (
            <div className="text-center py-8 text-gray-400">
              <Route className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Control at least 2 territories to use route optimization</p>
            </div>
          ) : !routeSuggestions ? (
            <div className="text-center py-8 text-gray-400">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Click "Analyze Routes" to get AI-powered suggestions</p>
              <p className="text-sm mt-2">Based on world events, faction presence, and territory security</p>
            </div>
          ) : (
            <div className="space-y-4">
              {routeSuggestions.market_analysis && (
                <div className="p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Market Analysis
                  </h4>
                  <p className="text-sm text-gray-300">{routeSuggestions.market_analysis}</p>
                </div>
              )}

              <div className="space-y-3">
                {routeSuggestions.recommended_routes?.map((route, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold mb-1">{route.route_name}</h4>
                        <p className="text-sm text-gray-400">
                          {route.from_territory} → {route.to_territory}
                        </p>
                        {route.waypoints && route.waypoints.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Via: {route.waypoints.join(' → ')}
                          </p>
                        )}
                      </div>
                      {getRecommendationBadge(route.risk_score)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-gray-400">Risk</p>
                        <p className={`font-semibold ${getRiskColor(route.risk_score)}`}>
                          {route.risk_score}/100
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Success Rate</p>
                        <p className="text-green-400 font-semibold">{route.success_rate}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Profit Potential</p>
                        <p className="text-cyan-400 font-semibold">
                          ${route.profit_potential?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Distance</p>
                        <p className="text-white font-semibold">
                          {(route.waypoints?.length || 0) + 1} stops
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 p-3 rounded bg-slate-900/30">
                      <p className="text-xs text-gray-400 uppercase mb-2">Threat Assessment</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Rival Presence:</span>
                          <span className={getRiskColor(route.threat_analysis?.rival_presence || 0)}>
                            {route.threat_analysis?.rival_presence || 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Law Enforcement:</span>
                          <span className={getRiskColor(route.threat_analysis?.law_enforcement || 0)}>
                            {route.threat_analysis?.law_enforcement || 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">World Events:</span>
                          <span className={getRiskColor(route.threat_analysis?.world_events || 0)}>
                            {route.threat_analysis?.world_events || 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Security:</span>
                          <span className="text-green-400">
                            {route.threat_analysis?.territory_security || 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {route.mitigation_strategies && route.mitigation_strategies.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 uppercase mb-1">Mitigation Strategies</p>
                        <ul className="space-y-1">
                          {route.mitigation_strategies.map((strategy, sidx) => (
                            <li key={sidx} className="text-xs text-gray-300 flex items-start gap-2">
                              <Shield className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <span>{strategy}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
                      onClick={() => createRouteMutation.mutate(route)}
                      disabled={createRouteMutation.isPending}
                    >
                      <Route className="w-4 h-4 mr-2" />
                      Establish Route
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {existingRoutes.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Route className="w-5 h-5 text-green-400" />
              Active Routes
              <Badge className="ml-auto bg-green-600">{existingRoutes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {existingRoutes.map((route) => (
                <div
                  key={route.id}
                  className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold text-sm">{route.route_name}</h4>
                    <Badge className={
                      route.ai_recommendation === 'highly_recommended' ? 'bg-green-600' :
                      route.ai_recommendation === 'recommended' ? 'bg-blue-600' :
                      route.ai_recommendation === 'risky' ? 'bg-orange-600' : 'bg-red-600'
                    }>
                      {route.ai_recommendation?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Risk: </span>
                      <span className={getRiskColor(route.risk_score)}>{route.risk_score}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Success: </span>
                      <span className="text-green-400">{route.success_rate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Runs: </span>
                      <span className="text-white">{route.historical_runs || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}