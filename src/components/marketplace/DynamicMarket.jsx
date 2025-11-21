import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const itemCategories = ['weapon', 'equipment', 'material', 'contraband', 'vehicle_part'];

export default function DynamicMarket({ playerData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: marketData = [] } = useQuery({
    queryKey: ['marketFluctuations'],
    queryFn: () => base44.entities.MarketFluctuation.list('-last_updated', 20),
    refetchInterval: 30000
  });

  const { data: worldEvents = [] } = useQuery({
    queryKey: ['activeWorldEvents'],
    queryFn: () => base44.entities.WorldEvent.filter({ status: 'active' })
  });

  const updateMarketMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze current market conditions and predict price movements.

Active World Events:
${worldEvents.map(e => `- ${e.event_name} (${e.severity}): ${e.description}`).join('\n')}

Current Market Items: ${itemCategories.join(', ')}

Generate market fluctuations considering:
1. Supply/demand dynamics
2. World event impacts
3. Seasonal trends
4. Player actions

For each category, provide:
- Current price vs base price
- Demand/supply levels (0-200)
- Trend (rising/falling/stable/volatile)
- 24h prediction with confidence
- Reasoning`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            fluctuations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_type: { type: "string" },
                  item_name: { type: "string" },
                  current_price: { type: "number" },
                  price_change: { type: "number" },
                  demand: { type: "number" },
                  supply: { type: "number" },
                  trend: { type: "string" },
                  prediction: { type: "string" },
                  confidence: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      for (const item of analysis.fluctuations) {
        const existing = marketData.find(m => m.item_type === item.item_type);
        
        if (existing) {
          await base44.entities.MarketFluctuation.update(existing.id, {
            current_price: item.current_price,
            price_change_percentage: item.price_change,
            demand_level: item.demand,
            supply_level: item.supply,
            trend: item.trend,
            ai_prediction: {
              next_24h_trend: item.prediction,
              confidence: item.confidence,
              reasoning: item.reasoning
            },
            last_updated: new Date().toISOString()
          });
        } else {
          await base44.entities.MarketFluctuation.create({
            item_type: item.item_type,
            item_name: item.item_name,
            base_price: item.current_price / (1 + item.price_change / 100),
            current_price: item.current_price,
            price_change_percentage: item.price_change,
            demand_level: item.demand,
            supply_level: item.supply,
            trend: item.trend,
            ai_prediction: {
              next_24h_trend: item.prediction,
              confidence: item.confidence,
              reasoning: item.reasoning
            },
            last_updated: new Date().toISOString()
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketFluctuations']);
      toast.success('Market updated');
    }
  });

  const buyItemMutation = useMutation({
    mutationFn: async (item) => {
      if (playerData.crypto_balance < item.current_price) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - item.current_price
      });

      await base44.entities.TransactionLog.create({
        transaction_type: 'purchase',
        player_id: playerData.id,
        player_username: playerData.username,
        amount: item.current_price,
        description: `Market Purchase: ${item.item_name}`,
        status: 'completed'
      });

      await base44.entities.MarketFluctuation.update(item.id, {
        demand_level: Math.min(200, item.demand_level + 5),
        supply_level: Math.max(0, item.supply_level - 5)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketFluctuations']);
      queryClient.invalidateQueries(['player']);
      toast.success('Purchase successful');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (!playerData) return null;

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-green-500/20">
        <CardHeader className="border-b border-green-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              AI-Driven Market
              <Badge className="ml-2 bg-green-600">{marketData.length} Items</Badge>
            </CardTitle>
            <Button
              size="sm"
              onClick={() => updateMarketMutation.mutate()}
              disabled={updateMarketMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {updateMarketMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Update Market</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {marketData.map((item) => {
              const TrendIcon = item.price_change_percentage > 0 ? TrendingUp : TrendingDown;
              const trendColor = item.price_change_percentage > 0 ? 'text-green-400' : 'text-red-400';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-green-500/10 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold capitalize">{item.item_name}</h4>
                      <p className="text-xs text-gray-400 capitalize">{item.item_type}</p>
                    </div>
                    <Badge className={item.trend === 'rising' ? 'bg-green-600' : item.trend === 'falling' ? 'bg-red-600' : 'bg-gray-600'}>
                      {item.trend}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Price:</span>
                      <span className="text-white font-semibold">${item.current_price?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Change:</span>
                      <span className={`flex items-center gap-1 ${trendColor}`}>
                        <TrendIcon className="w-3 h-3" />
                        {item.price_change_percentage?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Demand/Supply:</span>
                      <span className="text-cyan-400">{item.demand_level}/{item.supply_level}</span>
                    </div>
                  </div>

                  {item.ai_prediction && (
                    <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20 mb-3">
                      <p className="text-xs text-blue-400 font-semibold">24h Forecast:</p>
                      <p className="text-xs text-gray-300">{item.ai_prediction.next_24h_trend}</p>
                      <p className="text-xs text-gray-500 mt-1">Confidence: {item.ai_prediction.confidence}%</p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => buyItemMutation.mutate(item)}
                    disabled={buyItemMutation.isPending || playerData.crypto_balance < item.current_price}
                  >
                    Buy - ${item.current_price?.toLocaleString()}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}