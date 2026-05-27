import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ITEM_TYPES = ['weapons', 'drugs', 'vehicles', 'contraband', 'intelligence', 'forgery'];

const DEFAULT_MODELS = {
  weapons:      { base_price: 2000, current_price: 2350, demand_score: 72, supply_score: 45, volatility: 18, ai_prediction: { next_price: 2600, trend: 'bullish', confidence: 80 } },
  drugs:        { base_price: 500,  current_price: 680,  demand_score: 88, supply_score: 30, volatility: 30, ai_prediction: { next_price: 720,  trend: 'bullish', confidence: 85 } },
  vehicles:     { base_price: 45000,current_price: 52000,demand_score: 55, supply_score: 60, volatility: 12, ai_prediction: { next_price: 49000,trend: 'bearish', confidence: 70 } },
  contraband:   { base_price: 1500, current_price: 1800, demand_score: 65, supply_score: 50, volatility: 22, ai_prediction: { next_price: 1900, trend: 'bullish', confidence: 75 } },
  intelligence: { base_price: 3000, current_price: 3200, demand_score: 90, supply_score: 20, volatility: 10, ai_prediction: { next_price: 3500, trend: 'bullish', confidence: 92 } },
  forgery:      { base_price: 1000, current_price: 950,  demand_score: 48, supply_score: 75, volatility: 15, ai_prediction: { next_price: 880,  trend: 'bearish', confidence: 68 } },
};

export default function AIDynamicPricing({ playerData }) {
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(null);

  const { data: pricingModels = [], isLoading } = useQuery({
    queryKey: ['aiPricing'],
    queryFn: () => base44.entities.AIPricingModel.list('-updated_date', 20),
    staleTime: 30000,
  });

  // Use DB models if available, otherwise defaults
  const displayModels = pricingModels.length > 0
    ? pricingModels
    : ITEM_TYPES.map(type => ({ id: type, item_type: type, ...DEFAULT_MODELS[type] }));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const prompt = `You are an underground black market economist. Analyze these 6 illegal commodities and give updated pricing data:
- weapons (firearms, ammo, explosives)
- drugs (narcotics, stimulants, pharmaceuticals)
- vehicles (stolen cars, motorcycles, boats)
- contraband (smuggled goods, stolen electronics, luxury items)
- intelligence (hacked data, insider info, surveillance feeds)
- forgery (fake IDs, counterfeit currency, documents)

For each, consider: current law enforcement crackdowns, supply chain disruptions, gang warfare affecting supply, and seasonal demand shifts.

Return current pricing with demand/supply scores (0-100), volatility (0-50), and price predictions.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            markets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item_type: { type: 'string' },
                  base_price: { type: 'number' },
                  current_price: { type: 'number' },
                  demand_score: { type: 'number' },
                  supply_score: { type: 'number' },
                  volatility: { type: 'number' },
                  trend: { type: 'string' },
                  next_price: { type: 'number' },
                  confidence: { type: 'number' },
                  market_note: { type: 'string' },
                }
              }
            }
          }
        }
      });

      const markets = analysis.markets || [];
      for (const m of markets) {
        await base44.entities.AIPricingModel.create({
          item_type: m.item_type,
          base_price: m.base_price,
          current_price: m.current_price,
          demand_score: m.demand_score,
          supply_score: m.supply_score,
          volatility: m.volatility,
          macro_factors: { market_note: m.market_note },
          ai_prediction: {
            next_price: m.next_price,
            trend: m.trend,
            confidence: m.confidence,
          },
        });
      }
      return markets.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['aiPricing']);
      setLastUpdated(new Date());
      toast.success(`AI updated ${count} market models`);
    },
    onError: (e) => toast.error('Failed to update pricing: ' + e.message),
  });

  return (
    <Card className="glass-panel border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            AI Dynamic Pricing Engine
            {lastUpdated && (
              <span className="text-xs text-gray-500 font-normal">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
          <Button
            size="sm"
            className="bg-gradient-to-r from-cyan-600 to-blue-600"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing...</>
              : <><RefreshCw className="w-3 h-3 mr-1" />Update Prices</>
            }
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayModels.map((model) => {
              const isBullish = model.ai_prediction?.trend === 'bullish';
              const isBearish = model.ai_prediction?.trend === 'bearish';
              const priceDiff = (model.ai_prediction?.next_price || 0) - (model.current_price || 0);
              return (
                <div key={model.id || model.item_type} className="p-4 rounded-lg bg-slate-900/60 border border-cyan-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white capitalize">{model.item_type}</h4>
                    <Badge className={isBullish ? 'bg-green-700' : isBearish ? 'bg-red-700' : 'bg-gray-600'}>
                      {isBullish ? '📈' : isBearish ? '📉' : '➡️'} {model.ai_prediction?.trend || 'stable'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Current Price</span>
                      <span className="text-lg font-bold text-cyan-400">${model.current_price?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">AI Prediction</span>
                      <div className="flex items-center gap-1">
                        {priceDiff >= 0
                          ? <TrendingUp className="w-3 h-3 text-green-400" />
                          : <TrendingDown className="w-3 h-3 text-red-400" />
                        }
                        <span className={priceDiff >= 0 ? 'text-green-400' : 'text-red-400'}>
                          ${model.ai_prediction?.next_price?.toLocaleString()} ({priceDiff >= 0 ? '+' : ''}{priceDiff.toLocaleString()})
                        </span>
                      </div>
                    </div>

                    {/* Demand bar */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Demand</span><span>{model.demand_score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${model.demand_score}%` }} />
                      </div>
                    </div>

                    {/* Supply bar */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Supply</span><span>{model.supply_score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${model.supply_score}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-gray-700">
                      <span className="text-gray-500">Volatility</span>
                      <span className="text-yellow-400">{model.volatility}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Confidence</span>
                      <span className="text-green-400">{model.ai_prediction?.confidence?.toFixed(0)}%</span>
                    </div>

                    {model.macro_factors?.market_note && (
                      <p className="text-xs text-gray-400 italic border-t border-gray-700 pt-1">
                        💡 {model.macro_factors.market_note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}