import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Package, TrendingUp, MapPin, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AIContrabandManager({ playerData, territories, contrabandCaches }) {
  const queryClient = useQueryClient();
  const [distributionPlan, setDistributionPlan] = useState(null);

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

  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-cyan-400" />
          AI Contraband Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
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
      </CardContent>
    </Card>
  );
}