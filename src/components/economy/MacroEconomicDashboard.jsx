import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw, 
  DollarSign, Activity, Globe, Shield 
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AIEventGenerator from './AIEventGenerator';

export default function MacroEconomicDashboard({ playerData }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: macroData = [] } = useQuery({
    queryKey: ['macroData'],
    queryFn: () => base44.entities.MacroEconomicData.list('-updated_date', 20),
    staleTime: 300000 // 5 minutes
  });

  const { data: activeEvents = [] } = useQuery({
    queryKey: ['economicEvents'],
    queryFn: () => base44.entities.EconomicEvent.filter({ is_active: true }),
    staleTime: 60000
  });

  const fetchMacroDataMutation = useMutation({
    mutationFn: async () => {
      const prompt = `
Get the current macro economic data for:
1. ECB Deposit Facility Rate
2. Federal Reserve Funds Rate
3. Eurozone HICP Core Inflation (YoY)
4. US Core PCE Inflation (YoY)
5. ECB Total Assets trend
6. Federal Reserve Total Assets trend

Format the response with current values and recent trends.
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            ecb_deposit_rate: { type: "number" },
            fed_funds_rate: { type: "number" },
            eurozone_core_inflation: { type: "number" },
            us_core_inflation: { type: "number" },
            ecb_assets_trend: { type: "string" },
            fed_assets_trend: { type: "string" },
            policy_spread: { type: "number" },
            analysis: { type: "string" }
          }
        }
      });

      return response;
    },
    onSuccess: async (data) => {
      // Store fetched data
      await base44.entities.MacroEconomicData.create({
        data_type: "ecb_rates",
        region: "eurozone",
        indicator_name: "ECB Deposit Rate",
        current_value: data.ecb_deposit_rate,
        game_impact: {
          credit_cost_modifier: data.ecb_deposit_rate > 4 ? 25 : 0,
          market_volatility: Math.abs(data.policy_spread) > 2 ? 40 : 20,
          growth_modifier: data.ecb_deposit_rate - data.eurozone_core_inflation,
          risk_level: data.ecb_deposit_rate > 5 ? "high" : "medium"
        },
        data_snapshot: data
      });

      // Check for events
      if (Math.abs(data.policy_spread) > 2) {
        await base44.entities.EconomicEvent.create({
          event_type: "policy_divergence",
          severity: "major",
          title: "Central Bank Policy Divergence",
          description: `Fed-ECB policy spread at ${data.policy_spread.toFixed(2)}%. Market volatility increased.`,
          game_effects: {
            credit_cost_change: 15,
            market_crash_probability: 25,
            crypto_volatility: 40
          },
          duration_hours: 48,
          is_active: true,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        });
      }

      queryClient.invalidateQueries(['macroData']);
      queryClient.invalidateQueries(['economicEvents']);
      toast.success('Macro data updated successfully');
    },
    onError: () => {
      toast.error('Failed to fetch macro data');
    }
  });

  const handleRefresh = () => {
    setLoading(true);
    fetchMacroDataMutation.mutate();
    setTimeout(() => setLoading(false), 2000);
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <AIEventGenerator playerData={playerData} />
      {/* Header */}
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Global Macro Economic Command
              </h2>
              <p className="text-gray-400 mt-1">Real-time economic data affecting your empire</p>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Update Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Economic Events */}
      {activeEvents.length > 0 && (
        <Card className="glass-panel border-red-500/30">
          <CardHeader className="border-b border-red-500/20">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Active Economic Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {activeEvents.map(event => (
                <div key={event.id} className="p-4 bg-red-900/20 rounded-lg border border-red-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white">{event.title}</h4>
                      <Badge className={
                        event.severity === 'critical' ? 'bg-red-600' :
                        event.severity === 'major' ? 'bg-orange-600' :
                        'bg-yellow-600'
                      }>
                        {event.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{event.description}</p>
                  {event.game_effects && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {event.game_effects.credit_cost_change && (
                        <div className="text-gray-400">
                          Credit Cost: <span className="text-red-400">+{event.game_effects.credit_cost_change}%</span>
                        </div>
                      )}
                      {event.game_effects.crypto_volatility && (
                        <div className="text-gray-400">
                          Crypto Volatility: <span className="text-yellow-400">{event.game_effects.crypto_volatility}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Macro Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {macroData.slice(0, 8).map(indicator => (
          <Card key={indicator.id} className="glass-panel border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <p className="text-xs text-gray-400">{indicator.indicator_name}</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {indicator.current_value?.toFixed(2)}%
              </p>
              {indicator.change_percent && (
                <div className="flex items-center gap-1 mt-1">
                  {indicator.change_percent > 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs ${indicator.change_percent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {indicator.change_percent > 0 ? '+' : ''}{indicator.change_percent?.toFixed(2)}%
                  </span>
                </div>
              )}
              {indicator.game_impact?.risk_level && (
                <Badge className={`mt-2 ${getRiskColor(indicator.game_impact.risk_level)}`}>
                  {indicator.game_impact.risk_level}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Game Impact Panel */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            Impact on Your Empire
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Credit Cost Modifier</span>
                <span className="text-sm font-semibold text-white">+15%</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Market Volatility</span>
                <span className="text-sm font-semibold text-yellow-400">High</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Enterprise Profitability</span>
                <span className="text-sm font-semibold text-red-400">-8%</span>
              </div>
              <Progress value={42} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-400" />
            How Macro Economics Affect Your Game
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3 text-sm text-gray-300">
            <div className="p-3 bg-purple-900/20 rounded-lg">
              <h4 className="font-semibold text-white mb-1">Interest Rates</h4>
              <p className="text-xs text-gray-400">
                Higher rates = more expensive loans for enterprises, slower growth
              </p>
            </div>
            <div className="p-3 bg-cyan-900/20 rounded-lg">
              <h4 className="font-semibold text-white mb-1">Policy Divergence</h4>
              <p className="text-xs text-gray-400">
                Large Fed-ECB spread = currency volatility, affects crypto prices
              </p>
            </div>
            <div className="p-3 bg-red-900/20 rounded-lg">
              <h4 className="font-semibold text-white mb-1">Liquidity Crisis</h4>
              <p className="text-xs text-gray-400">
                Both central banks contracting = market crash risk increases
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}