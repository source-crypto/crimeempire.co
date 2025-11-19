import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const trendIcons = {
  rising: TrendingUp,
  falling: TrendingDown,
  stable: Minus,
  volatile: BarChart3
};

const trendColors = {
  rising: 'text-green-400',
  falling: 'text-red-400',
  stable: 'text-gray-400',
  volatile: 'text-orange-400'
};

const recommendationColors = {
  strong_buy: 'bg-green-600',
  buy: 'bg-green-500',
  hold: 'bg-gray-600',
  sell: 'bg-red-500',
  strong_sell: 'bg-red-600'
};

export default function DynamicMarket({ playerData }) {
  const queryClient = useQueryClient();

  const { data: marketData = [] } = useQuery({
    queryKey: ['marketData'],
    queryFn: () => base44.entities.MarketData.list('-analysis_timestamp', 50),
    refetchInterval: 60000
  });

  const analyzeMarketMutation = useMutation({
    mutationFn: async (item) => {
      const prompt = `Analyze this market item and provide trading recommendations:

Item: ${item.item_name} (${item.item_type})
Current Price: $${item.current_price}
Base Price: $${item.base_price}
Supply: ${item.supply}
Demand: ${item.demand}
Recent Trend: ${item.trend}

Analyze:
1. Price trend prediction (rising/falling/stable/volatile)
2. Trading recommendation (strong_buy/buy/hold/sell/strong_sell)
3. Reason for recommendation
4. Predicted price movement percentage
5. Risk level (low/medium/high)
6. Best action (buy_now/wait/sell_now)

Return JSON.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            trend_prediction: { type: 'string' },
            recommendation: { type: 'string' },
            reason: { type: 'string' },
            predicted_movement: { type: 'number' },
            risk_level: { type: 'string' },
            best_action: { type: 'string' }
          }
        }
      });

      await base44.entities.MarketData.update(item.id, {
        trend: analysis.trend_prediction,
        ai_recommendation: analysis.recommendation,
        analysis_timestamp: new Date().toISOString()
      });

      return { ...item, ...analysis };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketData']);
      toast.success('Market analysis complete!');
    }
  });

  const updateMarketMutation = useMutation({
    mutationFn: async () => {
      for (const item of marketData) {
        const supplyFactor = item.supply / 100;
        const demandFactor = item.demand / 100;
        const priceChange = (demandFactor - supplyFactor) * item.base_price * item.volatility;
        const newPrice = Math.max(item.base_price * 0.5, item.current_price + priceChange);

        const newHistory = [
          ...(item.price_history || []),
          { timestamp: new Date().toISOString(), price: newPrice }
        ].slice(-20);

        await base44.entities.MarketData.update(item.id, {
          current_price: Math.round(newPrice),
          price_history: newHistory,
          supply: Math.max(0, item.supply + (Math.random() * 20 - 10)),
          demand: Math.max(0, item.demand + (Math.random() * 20 - 10))
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketData']);
      toast.success('Market prices updated!');
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Dynamic Marketplace
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateMarketMutation.mutate()}
              disabled={updateMarketMutation.isPending}
            >
              {updateMarketMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Update Prices'
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketData.map((item) => {
          const TrendIcon = trendIcons[item.trend];
          const priceChange = ((item.current_price - item.base_price) / item.base_price) * 100;

          return (
            <Card key={item.id} className="glass-panel border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">{item.item_name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{item.item_type}</p>
                  </div>
                  <TrendIcon className={`w-5 h-5 ${trendColors[item.trend]}`} />
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Current Price</span>
                    <span className="text-lg font-bold text-white">
                      ${item.current_price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Change</span>
                    <span className={priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Supply/Demand</span>
                    <span className="text-white">
                      {item.supply.toFixed(0)} / {item.demand.toFixed(0)}
                    </span>
                  </div>
                </div>

                {item.ai_recommendation && (
                  <Badge className={`w-full justify-center mb-3 ${recommendationColors[item.ai_recommendation]}`}>
                    {item.ai_recommendation.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-cyan-500/30"
                  onClick={() => analyzeMarketMutation.mutate(item)}
                  disabled={analyzeMarketMutation.isPending}
                >
                  {analyzeMarketMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Analysis
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}