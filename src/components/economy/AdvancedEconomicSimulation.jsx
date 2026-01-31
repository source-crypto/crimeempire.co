import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, DollarSign, Activity, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdvancedEconomicSimulation({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedInvestment, setSelectedInvestment] = useState(null);

  const { data: investments = [] } = useQuery({
    queryKey: ['investments', playerData?.id],
    queryFn: () => base44.entities.Investment.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id,
    refetchInterval: 60000
  });

  const { data: marketData = [] } = useQuery({
    queryKey: ['marketData'],
    queryFn: () => base44.entities.MarketData.list('-analysis_timestamp', 10),
    refetchInterval: 30000
  });

  const { data: enterpriseMarkets = [] } = useQuery({
    queryKey: ['enterpriseMarkets'],
    queryFn: () => base44.entities.EnterpriseMarket.filter({ is_active: true }),
    refetchInterval: 30000
  });

  const simulateMarketMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze global economic state and simulate market dynamics.

Current Market Items: ${marketData.map(m => m.item_name).join(', ')}
Player Investments: ${investments.length}
Active Enterprise Listings: ${enterpriseMarkets.length}

Simulate:
1. Supply/demand shifts based on player activity
2. Price fluctuations with realistic volatility
3. Investment performance predictions
4. Strategic trading opportunities
5. Risk assessments

For each market item, provide:
- New price (realistic fluctuation)
- Supply/demand levels (0-200)
- Trend prediction
- AI recommendation (strong_buy/buy/hold/sell/strong_sell)
- Volatility score (0-1)
- Analysis reasoning`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            market_updates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  new_price: { type: "number" },
                  supply: { type: "number" },
                  demand: { type: "number" },
                  trend: { type: "string" },
                  recommendation: { type: "string" },
                  volatility: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            },
            economic_forecast: {
              type: "object",
              properties: {
                market_sentiment: { type: "string" },
                growth_sectors: { type: "array", items: { type: "string" } },
                risk_factors: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      for (const update of analysis.market_updates) {
        const existing = marketData.find(m => m.item_name === update.item_name);
        
        if (existing) {
          const priceHistory = existing.price_history || [];
          priceHistory.push({
            timestamp: new Date().toISOString(),
            price: update.new_price
          });

          await base44.entities.MarketData.update(existing.id, {
            current_price: update.new_price,
            supply: update.supply,
            demand: update.demand,
            trend: update.trend,
            ai_recommendation: update.recommendation,
            volatility: update.volatility,
            price_history: priceHistory.slice(-50),
            analysis_timestamp: new Date().toISOString()
          });
        }
      }

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketData']);
      toast.success('Market simulation updated');
    }
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async ({ type, asset, amount, risk }) => {
      if (playerData.crypto_balance < amount) {
        throw new Error('Insufficient funds');
      }

      const maturityDate = new Date();
      maturityDate.setDate(maturityDate.getDate() + 30);

      const riskMultipliers = { low: 0.05, medium: 0.15, high: 0.30, extreme: 0.60 };
      const dailyReturn = (amount * riskMultipliers[risk]) / 30;

      await base44.entities.Investment.create({
        player_id: playerData.id,
        investment_type: type,
        asset_name: asset,
        amount_invested: amount,
        current_value: amount,
        risk_level: risk,
        status: 'active',
        maturity_date: maturityDate.toISOString(),
        daily_return: dailyReturn,
        total_earned: 0
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investments']);
      queryClient.invalidateQueries(['player']);
      toast.success('Investment created');
    },
    onError: (error) => toast.error(error.message)
  });

  const liquidateInvestmentMutation = useMutation({
    mutationFn: async (investmentId) => {
      const investment = investments.find(i => i.id === investmentId);
      if (!investment) return;

      await base44.entities.Investment.update(investmentId, {
        status: 'liquidated'
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + investment.current_value,
        total_earnings: (playerData.total_earnings || 0) + investment.total_earned
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investments']);
      queryClient.invalidateQueries(['player']);
      toast.success('Investment liquidated');
    }
  });

  if (!playerData) return null;

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount_invested || 0), 0);
  const totalValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
  const totalROI = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Advanced Economic Simulation
            </CardTitle>
            <Button
              size="sm"
              onClick={() => simulateMarketMutation.mutate()}
              disabled={simulateMarketMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {simulateMarketMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulating...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Run Simulation</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <p className="text-xs text-gray-400 mb-1">Total Invested</p>
              <p className="text-xl font-bold text-blue-400">${totalInvested.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30">
              <p className="text-xs text-gray-400 mb-1">Current Value</p>
              <p className="text-xl font-bold text-green-400">${totalValue.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <p className="text-xs text-gray-400 mb-1">Total ROI</p>
              <p className={`text-xl font-bold ${totalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalROI.toFixed(2)}%
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Market Intelligence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {marketData.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-900/50 border border-green-500/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white">{item.item_name}</div>
                    <Badge className={
                      item.ai_recommendation === 'strong_buy' || item.ai_recommendation === 'buy'
                        ? 'bg-green-600'
                        : item.ai_recommendation === 'sell' || item.ai_recommendation === 'strong_sell'
                        ? 'bg-red-600'
                        : 'bg-gray-600'
                    }>
                      {item.ai_recommendation?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Price: </span>
                      <span className="text-white">${item.current_price?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Trend: </span>
                      <span className="text-cyan-400 capitalize">{item.trend}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Supply: </span>
                      <span className="text-white">{item.supply}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Demand: </span>
                      <span className="text-white">{item.demand}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <AlertTriangle className="w-3 h-3" />
                      Volatility: {((item.volatility || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Active Investments</h3>
            {investments.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No active investments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {investments.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white capitalize">
                        {inv.asset_name} ({inv.investment_type?.replace('_', ' ')})
                      </div>
                      <div className="text-xs text-gray-400">
                        Invested: ${inv.amount_invested?.toLocaleString()} • 
                        Current: ${inv.current_value?.toLocaleString()} • 
                        ROI: {inv.roi_percentage?.toFixed(2)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        inv.risk_level === 'low' ? 'bg-green-600' :
                        inv.risk_level === 'medium' ? 'bg-yellow-600' :
                        inv.risk_level === 'high' ? 'bg-orange-600' : 'bg-red-600'
                      }>
                        {inv.risk_level}
                      </Badge>
                      {inv.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => liquidateInvestmentMutation.mutate(inv.id)}
                        >
                          Liquidate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}