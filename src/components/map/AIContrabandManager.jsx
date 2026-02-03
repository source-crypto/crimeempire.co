import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Package, TrendingUp, MapPin, DollarSign, Users, AlertTriangle, Shield, Route } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AIContrabandManager({ playerData, territories, contrabandCaches }) {
  const queryClient = useQueryClient();
  const [distributionPlan, setDistributionPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: playerCrew } = useQuery({
    queryKey: ['crew', playerData.crew_id],
    queryFn: () => base44.entities.Crew.filter({ id: playerData.crew_id }),
    enabled: !!playerData.crew_id,
    select: (data) => data[0]
  });

  const { data: crewTerritories = [] } = useQuery({
    queryKey: ['crewTerritories', playerCrew?.id],
    queryFn: () => base44.entities.Territory.filter({ 
      controlling_crew_id: playerCrew.id 
    }),
    enabled: !!playerCrew?.id
  });

  const { data: enterpriseMarket = [] } = useQuery({
    queryKey: ['enterpriseMarket'],
    queryFn: () => base44.entities.EnterpriseMarket.list()
  });

  const optimizeDistributionMutation = useMutation({
    mutationFn: async () => {
      const analysisPrompt = `You are an AI contraband distribution strategist managing criminal supply chains.

CREW INFORMATION:
- Crew: ${playerCrew?.name || 'Solo Operation'}
- Controlled Territories: ${crewTerritories.length}
- Crew Power: ${playerCrew?.total_power || playerData.strength_score}
- Crew Revenue: $${playerCrew?.total_revenue || 0}

CONTRABAND INVENTORY:
${contrabandCaches.map(c => `- ${c.cache_type}: ${c.quantity} units, Value: $${c.value}, Heat: ${c.heat_level}/100, Location: (${c.coordinates.lat.toFixed(4)}, ${c.coordinates.lng.toFixed(4)})`).join('\n')}

CONTROLLED TERRITORIES:
${crewTerritories.map(t => `- ${t.name} (${t.resource_type}): Control ${t.control_percentage}%, Revenue Multiplier: ${t.revenue_multiplier}x, Location: (${t.coordinates.lat.toFixed(4)}, ${t.coordinates.lng.toFixed(4)})`).join('\n')}

MARKET CONDITIONS:
${enterpriseMarket.slice(0, 5).map(m => `- ${m.item_name} (${m.listing_type}): $${m.unit_price}/unit, Demand: ${m.demand_score}/100`).join('\n')}

Create an optimal distribution and sales strategy:
1. Match contraband to best territories for sales
2. Price optimization based on market demand
3. Distribution timing to minimize heat
4. Crew assignment recommendations
5. Revenue projections

Return ONLY valid JSON:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            distribution_strategy: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  contraband_type: { type: "string" },
                  source_location: {
                    type: "object",
                    properties: {
                      lat: { type: "number" },
                      lng: { type: "number" }
                    }
                  },
                  target_territory: { type: "string" },
                  quantity_to_distribute: { type: "number" },
                  recommended_price: { type: "number" },
                  estimated_revenue: { type: "number" },
                  distribution_method: { type: "string" },
                  crew_members_needed: { type: "number" },
                  risk_assessment: { type: "number" },
                  timing_recommendation: { type: "string" },
                  market_demand_score: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            },
            total_projected_revenue: { type: "number" },
            overall_risk: { type: "number" },
            optimal_execution_order: {
              type: "array",
              items: { type: "number" }
            },
            strategic_insights: { type: "string" }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setDistributionPlan(data);
      toast.success('AI generated distribution strategy');
    },
    onError: (error) => {
      toast.error('Failed to generate strategy');
    }
  });

  const executeDistributionMutation = useMutation({
    mutationFn: async (strategy) => {
      const baseCost = 10000;
      if (playerData.crypto_balance < baseCost) {
        throw new Error('Need $10,000 to execute distribution');
      }

      // Create market listings based on AI strategy
      const listing = await base44.entities.EnterpriseMarket.create({
        enterprise_id: playerData.id,
        listing_type: 'goods_sale',
        item_name: strategy.contraband_type,
        quantity: strategy.quantity_to_distribute,
        unit_price: strategy.recommended_price,
        total_value: strategy.estimated_revenue,
        quality: 100 - strategy.risk_assessment,
        demand_score: strategy.market_demand_score,
        seller_id: playerData.id,
        seller_reputation: playerData.endgame_points || 50,
        is_active: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Update player balance
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - baseCost + (strategy.estimated_revenue * 0.3)
      });

      // Log crew activity
      if (playerCrew) {
        await base44.entities.CrewActivity.create({
          crew_id: playerCrew.id,
          activity_type: 'contraband_distribution',
          description: `AI-optimized ${strategy.contraband_type} distribution to ${strategy.target_territory}`,
          value: strategy.estimated_revenue,
          player_id: playerData.id
        });
      }

      return listing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseMarket']);
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['crewActivities']);
      toast.success('Distribution executed successfully!');
    },
    onError: (error) => toast.error(error.message)
  });

  const createDistributionOperationMutation = useMutation({
    mutationFn: async ({ operationType, targetTerritory }) => {
      const costs = {
        street_dealers: 15000,
        distribution_network: 35000,
        wholesale_operation: 60000,
        international_smuggling: 120000
      };

      const cost = costs[operationType];
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      const operation = await base44.entities.ContrabandRoute.create({
        route_type: operationType,
        status: 'active',
        start_point: { lat: 0, lng: 0 },
        end_point: targetTerritory?.coordinates || { lat: 0, lng: 0 },
        territory_id: targetTerritory?.id,
        player_id: playerData.id,
        crew_id: playerData.crew_id,
        efficiency: 100,
        risk_level: operationType === 'street_dealers' ? 30 : 
                   operationType === 'distribution_network' ? 50 :
                   operationType === 'wholesale_operation' ? 65 : 85,
        revenue_per_hour: operationType === 'street_dealers' ? 500 : 
                         operationType === 'distribution_network' ? 1500 :
                         operationType === 'wholesale_operation' ? 3500 : 8000,
        setup_cost: cost
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      return { operation, type: operationType, cost };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['contrabandRoutes']);
      queryClient.invalidateQueries(['player']);
      toast.success(`${data.type.replace(/_/g, ' ')} operation established!`);
    },
    onError: (error) => toast.error(error.message)
  });

  const { data: activeOperations = [] } = useQuery({
    queryKey: ['contrabandRoutes', playerData?.id],
    queryFn: () => base44.entities.ContrabandRoute.filter({ 
      player_id: playerData.id,
      status: 'active'
    }),
    enabled: !!playerData?.id
  });

  const distributionOperations = [
    {
      type: 'street_dealers',
      label: 'Street Dealers Network',
      description: 'Small-scale street distribution',
      cost: 15000,
      revenue: 500,
      risk: 30,
      icon: Users
    },
    {
      type: 'distribution_network',
      label: 'Distribution Network',
      description: 'Multi-territory distribution chain',
      cost: 35000,
      revenue: 1500,
      risk: 50,
      icon: MapPin
    },
    {
      type: 'wholesale_operation',
      label: 'Wholesale Operation',
      description: 'Bulk distribution to buyers',
      cost: 60000,
      revenue: 3500,
      risk: 65,
      icon: Package
    },
    {
      type: 'international_smuggling',
      label: 'International Smuggling',
      description: 'Cross-border operations',
      cost: 120000,
      revenue: 8000,
      risk: 85,
      icon: TrendingUp
    }
  ];

  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-cyan-400" />
          AI Contraband Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/50 grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="strategy">AI Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/30 border border-cyan-500/20">
                <p className="text-xs text-gray-400 mb-1">Active Operations</p>
                <p className="text-2xl font-bold text-cyan-400">{activeOperations.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/30 border border-green-500/20">
                <p className="text-xs text-gray-400 mb-1">Total Hourly Revenue</p>
                <p className="text-2xl font-bold text-green-400">
                  ${activeOperations.reduce((sum, op) => sum + (op.revenue_per_hour || 0), 0).toLocaleString()}/hr
                </p>
              </div>
            </div>

            {activeOperations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-semibold text-sm">Your Operations</h4>
                {activeOperations.map((op) => (
                  <div key={op.id} className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-white font-semibold capitalize">{op.route_type.replace(/_/g, ' ')}</h5>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">Revenue</p>
                        <p className="text-green-400 font-semibold">${op.revenue_per_hour}/hr</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Risk</p>
                        <p className={getRiskColor(op.risk_level)}>{op.risk_level}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Efficiency</p>
                        <p className="text-cyan-400 font-semibold">{op.efficiency}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-3 mt-4">
            <h4 className="text-white font-semibold mb-3">Establish Distribution Operations</h4>
            {distributionOperations.map((op) => {
              const Icon = op.icon;
              const canAfford = playerData?.crypto_balance >= op.cost;

              return (
                <div 
                  key={op.type}
                  className={`p-4 rounded-lg border transition-all ${
                    canAfford 
                      ? 'bg-slate-900/30 border-purple-500/20 hover:border-purple-500/40'
                      : 'bg-slate-900/10 border-gray-700/20 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-white font-semibold">{op.label}</h5>
                      <p className="text-xs text-gray-400 mb-2">{op.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ${op.revenue}/hr
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getRiskColor(op.risk)}`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Risk: {op.risk}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => createDistributionOperationMutation.mutate({ 
                      operationType: op.type,
                      targetTerritory: crewTerritories[0]
                    })}
                    disabled={createDistributionOperationMutation.isPending || !canAfford}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
                  >
                    Establish - ${op.cost.toLocaleString()}
                  </Button>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4 mt-4">
        {playerCrew && (
          <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">{playerCrew.name}</span>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Territories: {crewTerritories.length}</p>
              <p>Total Power: {playerCrew.total_power}</p>
            </div>
          </div>
        )}

        <Button
          onClick={() => optimizeDistributionMutation.mutate()}
          disabled={optimizeDistributionMutation.isPending}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
        >
          {optimizeDistributionMutation.isPending ? (
            <>
              <Brain className="w-4 h-4 mr-2 animate-pulse" />
              Analyzing Markets...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Generate Distribution Plan
            </>
          )}
        </Button>

        {distributionPlan && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Projected Revenue:</span>
                  <span className="text-green-400 font-bold">
                    ${distributionPlan.total_projected_revenue?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Overall Risk:</span>
                  <span className={`font-semibold ${
                    distributionPlan.overall_risk < 40 ? 'text-green-400' :
                    distributionPlan.overall_risk < 70 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {distributionPlan.overall_risk}%
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 italic p-2 bg-slate-900/50 rounded">
              {distributionPlan.strategic_insights}
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {distributionPlan.distribution_strategy?.map((strategy, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {strategy.contraband_type}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {strategy.target_territory}
                      </p>
                    </div>
                    <Badge className="bg-cyan-600">
                      #{idx + 1}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Quantity:</span>
                      <span className="text-white ml-1 font-semibold">
                        {strategy.quantity_to_distribute}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price:</span>
                      <span className="text-green-400 ml-1 font-semibold">
                        ${strategy.recommended_price}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Revenue:</span>
                      <span className="text-green-400 ml-1 font-semibold">
                        ${strategy.estimated_revenue?.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Crew:</span>
                      <span className="text-purple-400 ml-1 font-semibold">
                        {strategy.crew_members_needed}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 border-t border-cyan-500/20 pt-2">
                    <p className="text-gray-400">
                      <strong>Method:</strong> {strategy.distribution_method}
                    </p>
                    <p className="text-gray-400">
                      <strong>Timing:</strong> {strategy.timing_recommendation}
                    </p>
                    <p className="text-gray-400 italic">{strategy.reasoning}</p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => executeDistributionMutation.mutate(strategy)}
                    disabled={executeDistributionMutation.isPending}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    Execute Distribution ($10,000)
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function getRiskColor(risk) {
  if (risk < 30) return 'text-green-400';
  if (risk < 60) return 'text-yellow-400';
  return 'text-red-400';
}