import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Eye, AlertCircle, Zap, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function TransparentInvestmentSystem({ playerData }) {
  const [amount, setAmount] = useState(10000);
  const [investmentType, setInvestmentType] = useState('market_speculation');
  const [selectedTarget, setSelectedTarget] = useState('');
  const queryClient = useQueryClient();

  const { data: investments = [] } = useQuery({
    queryKey: ['playerInvestments', playerData?.id],
    queryFn: () => base44.entities.PlayerInvestment.filter({ 
      player_id: playerData.id 
    }, '-created_date', 20),
    enabled: !!playerData,
    refetchInterval: 10000
  });

  const { data: supplyLines = [] } = useQuery({
    queryKey: ['supplyLines', playerData?.crew_id],
    queryFn: () => base44.entities.SupplyLine.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id && investmentType === 'supply_line'
  });

  const { data: marketData = [] } = useQuery({
    queryKey: ['marketFluctuations'],
    queryFn: () => base44.entities.MarketFluctuation.list('-last_updated', 10)
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async () => {
      if (amount > playerData.crypto_balance) {
        throw new Error('Insufficient funds');
      }

      const prompt = `Analyze investment opportunity with full transparency.

Investment: ${amount} in ${investmentType}
Target: ${selectedTarget || 'Market'}

Current Market Data:
${marketData.map(m => `- ${m.item_name}: $${m.current_price} (${m.trend})`).join('\n')}

Calculate:
1. Base Market Price (BMP)
2. Player Impact Modifier (PIPM)
3. Faction Influence (ADIM)
4. Expected ROI with reasoning
5. All modifiers with exact calculations
6. Success/risk factors
7. Outcome prediction with confidence

Provide complete transparency chain showing every calculation step.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            base_market_price: { type: "number" },
            demand_pressure: { type: "number" },
            supply_volume: { type: "number" },
            route_stability: { type: "number" },
            faction_influence: { type: "number" },
            player_impact: { type: "number" },
            expected_return: { type: "number" },
            roi_percentage: { type: "number" },
            modifiers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  modifier_name: { type: "string" },
                  value: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            prediction: { type: "string" },
            success_factors: {
              type: "array",
              items: { type: "string" }
            },
            risk_factors: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - amount
      });

      const maturityDate = new Date();
      maturityDate.setHours(maturityDate.getHours() + 24);

      const investment = await base44.entities.PlayerInvestment.create({
        player_id: playerData.id,
        player_username: playerData.username,
        investment_type: investmentType,
        target_name: selectedTarget || 'Market',
        amount_invested: amount,
        expected_return: analysis.expected_return,
        transparency_data: {
          base_market_price: analysis.base_market_price,
          demand_pressure: analysis.demand_pressure,
          supply_volume: analysis.supply_volume,
          route_stability: analysis.route_stability,
          faction_influence: analysis.faction_influence,
          player_impact_coefficient: analysis.player_impact,
          modifiers_applied: analysis.modifiers
        },
        ai_reasoning: {
          prediction: analysis.prediction,
          success_factors: analysis.success_factors,
          risk_factors: analysis.risk_factors
        },
        status: 'active',
        roi_percentage: analysis.roi_percentage,
        maturity_date: maturityDate.toISOString()
      });

      await base44.entities.TransactionLog.create({
        transaction_type: 'purchase',
        player_id: playerData.id,
        player_username: playerData.username,
        amount: amount,
        description: `Investment: ${investmentType}`,
        status: 'completed'
      });

      return investment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerInvestments']);
      queryClient.invalidateQueries(['player']);
      toast.success('Investment created with full transparency');
      setAmount(10000);
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
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Transparent Investment System
            <Badge className="ml-auto bg-green-600">{investments.length} Active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <h4 className="text-white font-semibold mb-3 text-sm">Create Investment</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="bg-slate-900/50 border-green-500/20 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Investment Type</label>
                <Select value={investmentType} onValueChange={setInvestmentType}>
                  <SelectTrigger className="bg-slate-900/50 border-green-500/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market_speculation">Market Speculation</SelectItem>
                    <SelectItem value="supply_line">Supply Line</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="faction_trade">Faction Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={() => createInvestmentMutation.mutate()}
                disabled={createInvestmentMutation.isPending || amount <= 0}
              >
                {createInvestmentMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Invest ${amount.toLocaleString()}</>
                )}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Active Investments (Full Transparency)
            </h4>
            {investments.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">No investments</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {investments.map((inv) => (
                  <div key={inv.id} className="p-4 rounded-lg bg-slate-900/30 border border-green-500/10">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold capitalize">{inv.investment_type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-400">{inv.target_name}</p>
                      </div>
                      <Badge className={
                        inv.status === 'matured' ? 'bg-green-600' :
                        inv.status === 'failed' ? 'bg-red-600' : 'bg-yellow-600'
                      }>
                        {inv.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div>
                        <span className="text-gray-400">Invested:</span>
                        <span className="text-white ml-1">${inv.amount_invested?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Expected ROI:</span>
                        <span className="text-green-400 ml-1">{inv.roi_percentage?.toFixed(1)}%</span>
                      </div>
                    </div>

                    {inv.transparency_data && (
                      <div className="p-3 rounded bg-cyan-900/20 border border-cyan-500/20 mb-2">
                        <p className="text-xs text-cyan-400 font-semibold mb-2">📊 Raw Data (Transparent)</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
                          <div>BMP: {inv.transparency_data.base_market_price?.toFixed(2)}</div>
                          <div>Demand: {inv.transparency_data.demand_pressure?.toFixed(2)}</div>
                          <div>Supply: {inv.transparency_data.supply_volume?.toFixed(2)}</div>
                          <div>Stability: {inv.transparency_data.route_stability?.toFixed(2)}</div>
                        </div>
                      </div>
                    )}

                    {inv.ai_reasoning && (
                      <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                        <p className="text-xs text-blue-400 font-semibold mb-1">🤖 AI Analysis:</p>
                        <p className="text-xs text-gray-300">{inv.ai_reasoning.prediction}</p>
                      </div>
                    )}

                    {inv.transparency_data?.modifiers_applied && (
                      <details className="mt-2">
                        <summary className="text-xs text-cyan-400 cursor-pointer">View All Modifiers</summary>
                        <div className="mt-2 space-y-1">
                          {inv.transparency_data.modifiers_applied.map((mod, idx) => (
                            <div key={idx} className="text-xs text-gray-300 p-2 bg-slate-900/50 rounded">
                              <span className="text-cyan-400">{mod.modifier_name}:</span> {mod.value} - {mod.reason}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
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