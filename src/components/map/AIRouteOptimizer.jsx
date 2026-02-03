import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Route, TrendingUp, Shield, AlertTriangle, DollarSign, Package, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';

export default function AIRouteOptimizer({ 
  playerData, 
  territories, 
  lawEnforcement, 
  contrabandCaches,
  allPlayers 
}) {
  const queryClient = useQueryClient();
  const [optimizedRoutes, setOptimizedRoutes] = useState([]);

  const optimizeRoutesMutation = useMutation({
    mutationFn: async () => {
      const analysisPrompt = `You are an AI criminal logistics expert analyzing smuggling routes.

CURRENT INTELLIGENCE:
- Territories Count: ${territories.length}
- Law Enforcement Units: ${lawEnforcement.length}
- Contraband Caches: ${contrabandCaches.length}
- Active Players: ${allPlayers.length}
- Player Crew: ${playerData.crew_id || 'Solo'}

LAW ENFORCEMENT POSITIONS:
${lawEnforcement.map(le => `- ${le.unit_type} at (${le.coordinates.lat.toFixed(4)}, ${le.coordinates.lng.toFixed(4)}) - Threat: ${le.threat_level}/100, Radius: ${le.patrol_radius}km`).join('\n')}

CONTRABAND LOCATIONS:
${contrabandCaches.map(c => `- ${c.cache_type} at (${c.coordinates.lat.toFixed(4)}, ${c.coordinates.lng.toFixed(4)}) - Value: $${c.value}, Heat: ${c.heat_level}/100`).join('\n')}

TERRITORIES:
${territories.slice(0, 10).map(t => `- ${t.name} (${t.resource_type}) at (${t.coordinates.lat.toFixed(4)}, ${t.coordinates.lng.toFixed(4)}) - Control: ${t.control_percentage}%`).join('\n')}

Analyze and suggest 5 optimal smuggling routes considering:
1. Avoiding high-threat law enforcement zones
2. Connecting high-value contraband to profitable territories
3. Minimizing exposure time
4. Maximizing profit potential
5. Accounting for player traffic

Return ONLY valid JSON:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            routes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  route_name: { type: "string" },
                  start_point: { 
                    type: "object",
                    properties: {
                      lat: { type: "number" },
                      lng: { type: "number" }
                    }
                  },
                  end_point: {
                    type: "object",
                    properties: {
                      lat: { type: "number" },
                      lng: { type: "number" }
                    }
                  },
                  cargo_type: { type: "string" },
                  estimated_profit: { type: "number" },
                  risk_level: { type: "number" },
                  safety_score: { type: "number" },
                  travel_time_hours: { type: "number" },
                  law_enforcement_encounters: { type: "number" },
                  recommended_crew_size: { type: "number" },
                  ai_confidence: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            },
            overall_analysis: { type: "string" }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setOptimizedRoutes(data.routes || []);
      toast.success(`AI analyzed ${data.routes?.length || 0} optimal routes`);
    },
    onError: (error) => {
      toast.error('Failed to optimize routes');
    }
  });

  const { data: establishedRoutes = [] } = useQuery({
    queryKey: ['supplyRoutes', playerData?.id],
    queryFn: () => base44.entities.SupplyRoute.filter({ 
      player_id: playerData.id,
      is_active: true
    }),
    enabled: !!playerData?.id
  });

  const createRouteMutation = useMutation({
    mutationFn: async (route) => {
      const cost = 5000;
      if (playerData.crypto_balance < cost) {
        throw new Error('Need $5,000 to establish route');
      }

      const newRoute = await base44.entities.SupplyRoute.create({
        route_type: 'smuggling',
        start_coordinates: route.start_point,
        end_coordinates: route.end_point,
        cargo_type: route.cargo_type,
        risk_level: route.risk_level,
        efficiency: route.safety_score,
        crew_id: playerData.crew_id,
        player_id: playerData.id,
        is_active: true,
        revenue_per_trip: route.estimated_profit,
        ai_optimized: true
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      return newRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyRoutes']);
      queryClient.invalidateQueries(['player']);
      toast.success('Smuggling route established!');
    },
    onError: (error) => toast.error(error.message)
  });

  const getRiskColor = (risk) => {
    if (risk < 30) return 'text-green-400';
    if (risk < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="glass-panel border-purple-500/30">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-purple-400" />
          AI Route Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <Tabs defaultValue="suggest">
          <TabsList className="bg-slate-900/50 grid grid-cols-2 w-full">
            <TabsTrigger value="suggest">AI Suggestions</TabsTrigger>
            <TabsTrigger value="active">Active Routes</TabsTrigger>
          </TabsList>

          <TabsContent value="suggest" className="space-y-4 mt-4">
            <Button
              onClick={() => optimizeRoutesMutation.mutate()}
              disabled={optimizeRoutesMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {optimizeRoutesMutation.isPending ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing Intelligence...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Optimize Smuggling Routes
                </>
              )}
            </Button>

            {optimizedRoutes.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
            {optimizedRoutes.map((route, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/30 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Route className="w-4 h-4" />
                      {route.route_name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">{route.cargo_type}</p>
                  </div>
                  <Badge className="bg-purple-600">
                    AI: {route.ai_confidence}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-green-400" />
                    <span className="text-gray-400">Profit:</span>
                    <span className="text-green-400 font-semibold">
                      ${route.estimated_profit?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className={`w-3 h-3 ${getRiskColor(route.risk_level)}`} />
                    <span className="text-gray-400">Risk:</span>
                    <span className={`font-semibold ${getRiskColor(route.risk_level)}`}>
                      {route.risk_level}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-gray-400">Safety:</span>
                    <span className="text-blue-400 font-semibold">
                      {route.safety_score}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    <span className="text-gray-400">Time:</span>
                    <span className="text-purple-400 font-semibold">
                      {route.travel_time_hours}h
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 italic border-t border-purple-500/20 pt-2">
                  {route.reasoning}
                </p>

                <Button
                  size="sm"
                  onClick={() => createRouteMutation.mutate(route)}
                  disabled={createRouteMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Establish Route ($5,000)
                </Button>
              </div>
            ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-3 mt-4">
            {establishedRoutes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Route className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No established routes yet</p>
                <p className="text-xs mt-1">Use AI suggestions to create optimal routes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {establishedRoutes.map((route) => (
                  <div key={route.id} className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/20">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="text-white font-semibold capitalize flex items-center gap-2">
                          <Route className="w-4 h-4" />
                          {route.cargo_type || route.route_type}
                        </h5>
                        {route.ai_optimized && (
                          <Badge className="bg-purple-600 mt-1">AI Optimized</Badge>
                        )}
                      </div>
                      <Badge className={route.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                        {route.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                      <div className="p-2 rounded bg-slate-900/50">
                        <p className="text-xs text-gray-400">Revenue/Trip</p>
                        <p className="text-green-400 font-semibold text-sm">
                          ${route.revenue_per_trip?.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/50">
                        <p className="text-xs text-gray-400">Risk</p>
                        <p className={`font-semibold text-sm ${getRiskColor(route.risk_level)}`}>
                          {route.risk_level}%
                        </p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/50">
                        <p className="text-xs text-gray-400">Efficiency</p>
                        <p className="text-cyan-400 font-semibold text-sm">{route.efficiency}%</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/50">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-white font-semibold text-sm capitalize">
                          {route.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}