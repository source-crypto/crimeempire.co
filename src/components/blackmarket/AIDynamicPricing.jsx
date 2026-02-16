import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Zap, RefreshCw, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function AIDynamicPricing({ playerData }) {
  const [updating, setUpdating] = useState(false);
  const queryClient = useQueryClient();

  const { data: pricingModels = [] } = useQuery({
    queryKey: ['aiPricing'],
    queryFn: () => base44.entities.AIPricingModel.list('-updated_date', 20),
    staleTime: 30000
  });

  const { data: macroData = [] } = useQuery({
    queryKey: ['macroData'],
    queryFn: () => base44.entities.MacroEconomicData.list('-updated_date', 5),
    staleTime: 60000
  });

  const updatePricingMutation = useMutation({
    mutationFn: async () => {
      const items = ['weapons', 'drugs', 'vehicles', 'contraband', 'intelligence'];
      
      for (const itemType of items) {
        const prompt = `
Analyze current black market pricing for ${itemType} considering:
- Current macro environment (interest rates, inflation)
- Law enforcement activity
- Market supply/demand dynamics
- Seasonal factors

Provide dynamic pricing with demand/supply scores and volatility.
        `;

        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              base_price: { type: "number" },
              current_price: { type: "number" },
              demand_score: { type: "number" },
              supply_score: { type: "number" },
              volatility: { type: "number" },
              predicted_price: { type: "number" },
              trend: { type: "string" }
            }
          }
        });

        await base44.entities.AIPricingModel.create({
          item_type: itemType,
          base_price: analysis.base_price,
          current_price: analysis.current_price,
          demand_score: analysis.demand_score,
          supply_score: analysis.supply_score,
          volatility: analysis.volatility,
          macro_factors: {
            interest_rate_impact: macroData[0]?.current_value || 0,
            law_enforcement_heat: Math.random() * 50
          },
          ai_prediction: {
            next_price: analysis.predicted_price,
            trend: analysis.trend,
            confidence: 75 + Math.random() * 20
          }
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiPricing']);
      toast.success('AI pricing models updated');
    }
  });

  const handleUpdate = () => {
    setUpdating(true);
    updatePricingMutation.mutate();
    setTimeout(() => setUpdating(false), 3000);
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader className="border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              AI Dynamic Pricing Engine
            </CardTitle>
            <Button
              onClick={handleUpdate}
              disabled={updating}
              size="sm"
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              Update
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricingModels.map((model) => (
              <Card key={model.id} className="bg-slate-900/50 border-cyan-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white capitalize">{model.item_type}</h4>
                    <Badge className={
                      model.ai_prediction?.trend === 'bullish' ? 'bg-green-600' :
                      model.ai_prediction?.trend === 'bearish' ? 'bg-red-600' :
                      'bg-gray-600'
                    }>
                      {model.ai_prediction?.trend || 'neutral'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Current Price</span>
                      <span className="text-lg font-bold text-cyan-400">
                        ${model.current_price?.toFixed(0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Predicted</span>
                      <div className="flex items-center gap-1">
                        {model.ai_prediction?.next_price > model.current_price ? (
                          <TrendingUp className="w-3 h-3 text-green-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                        <span className="text-white">
                          ${model.ai_prediction?.next_price?.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Demand</span>
                        <span className="text-white">{model.demand_score}%</span>
                      </div>
                      <Progress value={model.demand_score} className="h-1" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Supply</span>
                        <span className="text-white">{model.supply_score}%</span>
                      </div>
                      <Progress value={model.supply_score} className="h-1" />
                    </div>

                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Volatility</span>
                        <span className="text-yellow-400">{model.volatility}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-500">Confidence</span>
                        <span className="text-green-400">
                          {model.ai_prediction?.confidence?.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}