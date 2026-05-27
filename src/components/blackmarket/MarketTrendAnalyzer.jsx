import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, AlertTriangle, Users, RefreshCw, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const STATIC_TRENDS = [
  { id: 't1', item_type: 'weapons',     current_price: 2350, price_trend: 'rising',  demand_level: 78, supply_level: 40, police_heat: 55, trend_summary: 'Gang warfare in Northside driving weapon demand up 22%', market_event: 'Rival crew bust seized 40% of existing supply' },
  { id: 't2', item_type: 'drugs',       current_price: 680,  price_trend: 'rising',  demand_level: 90, supply_level: 30, police_heat: 72, trend_summary: 'New synthetic formula creating record demand, police crackdown ongoing', market_event: 'DEA Operation "Clean Sweep" disrupted 3 labs' },
  { id: 't3', item_type: 'stolen_goods',current_price: 1200, price_trend: 'stable',  demand_level: 60, supply_level: 65, police_heat: 35, trend_summary: 'Jewelry market saturated, electronics remain strong', market_event: null },
  { id: 't4', item_type: 'forgery',     current_price: 950,  price_trend: 'falling', demand_level: 45, supply_level: 80, police_heat: 40, trend_summary: 'Oversupply of fake docs, biometric ID checks reducing effectiveness', market_event: 'Immigration crackdown reduced demand 15%' },
  { id: 't5', item_type: 'intelligence',current_price: 3400, price_trend: 'rising',  demand_level: 92, supply_level: 18, police_heat: 30, trend_summary: 'Corporate espionage boom — hacked databases fetching record prices', market_event: 'Three major data breaches this month' },
];

const STATIC_COMPETITORS = [
  { id: 'c1', competitor_name: 'The Yakuza Syndicate', activity_type: 'price_war', description: 'Undercutting weapons prices by 15% to capture market share in downtown.', target_market: 'weapons', impact_level: 70, player_threat_level: 65, status: 'active' },
  { id: 'c2', competitor_name: 'East Coast Cartel',    activity_type: 'supply_monopoly', description: 'Cornering the drug supply chain — may force prices up 30%.', target_market: 'drugs', impact_level: 85, player_threat_level: 75, status: 'active' },
  { id: 'c3', competitor_name: 'Ghost Network',        activity_type: 'market_expansion', description: 'Moving into intelligence trading, undercutting with bulk discounts.', target_market: 'intelligence', impact_level: 50, player_threat_level: 40, status: 'active' },
];

export default function MarketTrendAnalyzer() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('trends');

  const { data: dbTrends = [] } = useQuery({
    queryKey: ['marketTrendData'],
    queryFn: () => base44.entities.MarketTrendData.list(),
    refetchInterval: 60000,
  });

  const { data: dbCompetitors = [] } = useQuery({
    queryKey: ['competitorActivities'],
    queryFn: () => base44.entities.CompetitorActivity.filter({ status: 'active' }),
    refetchInterval: 60000,
  });

  const trends = dbTrends.length > 0 ? dbTrends : STATIC_TRENDS;
  const competitors = dbCompetitors.length > 0 ? dbCompetitors : STATIC_COMPETITORS;

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const prompt = `You are a black market analyst. Generate fresh market intelligence for 5 illegal commodity categories: weapons, drugs, stolen_goods, forgery, intelligence.

For each provide: current market price, trend (rising/falling/stable), demand_level (0-100), supply_level (0-100), police_heat (0-100), a 1-sentence trend_summary, and optional market_event (news headline).

Also generate 3 competitor activities from rival criminal organizations showing their market moves.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            trends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item_type: { type: 'string' },
                  current_price: { type: 'number' },
                  price_trend: { type: 'string' },
                  demand_level: { type: 'number' },
                  supply_level: { type: 'number' },
                  police_heat: { type: 'number' },
                  trend_summary: { type: 'string' },
                  market_event: { type: 'string' },
                }
              }
            },
            competitors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  competitor_name: { type: 'string' },
                  activity_type: { type: 'string' },
                  description: { type: 'string' },
                  target_market: { type: 'string' },
                  impact_level: { type: 'number' },
                  player_threat_level: { type: 'number' },
                }
              }
            }
          }
        }
      });

      // Save to DB
      await Promise.all([
        ...(result.trends || []).map(t => base44.entities.MarketTrendData.create({ ...t, status: 'active' })),
        ...(result.competitors || []).map(c => base44.entities.CompetitorActivity.create({ ...c, status: 'active' })),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketTrendData']);
      queryClient.invalidateQueries(['competitorActivities']);
      toast.success('📊 Market intelligence refreshed');
    },
    onError: (e) => toast.error('Refresh failed: ' + e.message),
  });

  const getTrendIcon = (trend) => {
    if (trend === 'rising') return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (trend === 'falling') return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <BarChart3 className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[['trends', '📈 Market Trends'], ['competitors', '🕵️ Competitors'], ['tips', '💡 Intel Tips']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${tab === id ? 'border-purple-500/60 bg-purple-900/30 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="border-gray-600 text-gray-400 text-xs"
          onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
          {refreshMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span className="ml-1">Refresh Intel</span>
        </Button>
      </div>

      {tab === 'trends' && (
        <div className="space-y-3">
          {trends.map((trend) => (
            <Card key={trend.id} className="glass-panel border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(trend.price_trend)}
                    <div>
                      <h4 className="text-white font-semibold capitalize">{trend.item_type?.replace(/_/g, ' ')}</h4>
                      <p className="text-xs text-gray-400">Current Price: <span className="text-cyan-400 font-bold">${trend.current_price?.toLocaleString()}</span></p>
                    </div>
                  </div>
                  <Badge className={trend.price_trend === 'rising' ? 'bg-red-700' : trend.price_trend === 'falling' ? 'bg-green-700' : 'bg-yellow-700'}>
                    {trend.price_trend}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="p-2 rounded bg-slate-800/60">
                    <p className="text-gray-400 mb-1">Demand</p>
                    <div className="h-1.5 rounded-full bg-gray-700 mb-1">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${trend.demand_level}%` }} />
                    </div>
                    <p className="text-green-400 font-bold">{trend.demand_level}%</p>
                  </div>
                  <div className="p-2 rounded bg-slate-800/60">
                    <p className="text-gray-400 mb-1">Supply</p>
                    <div className="h-1.5 rounded-full bg-gray-700 mb-1">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${trend.supply_level}%` }} />
                    </div>
                    <p className="text-blue-400 font-bold">{trend.supply_level}%</p>
                  </div>
                  <div className="p-2 rounded bg-slate-800/60">
                    <p className="text-gray-400 mb-1">Police Heat</p>
                    <div className="h-1.5 rounded-full bg-gray-700 mb-1">
                      <div className={`h-full rounded-full ${trend.police_heat > 60 ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${trend.police_heat}%` }} />
                    </div>
                    <p className={`font-bold ${trend.police_heat > 60 ? 'text-red-400' : 'text-yellow-400'}`}>{trend.police_heat}%</p>
                  </div>
                </div>

                {trend.market_event && (
                  <div className="bg-slate-800/40 rounded-lg p-2 mb-2">
                    <p className="text-xs text-gray-300">📰 <span className="font-semibold">Event:</span> {trend.market_event}</p>
                  </div>
                )}
                {trend.trend_summary && (
                  <p className="text-xs text-gray-400 italic">{trend.trend_summary}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'competitors' && (
        <div className="space-y-3">
          {competitors.map((activity) => (
            <Card key={activity.id} className="glass-panel border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-bold">{activity.competitor_name}</h4>
                    <p className="text-xs text-gray-400 capitalize">{activity.activity_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <AlertTriangle className={`w-5 h-5 ${activity.player_threat_level > 60 ? 'text-red-400' : 'text-yellow-400'}`} />
                </div>
                <p className="text-sm text-gray-300 mb-3">{activity.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-1.5 rounded bg-slate-800/60">
                    <p className="text-gray-400">Market</p>
                    <p className="text-cyan-400 font-semibold capitalize">{activity.target_market}</p>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/60">
                    <p className="text-gray-400">Market Impact</p>
                    <p className={`font-semibold ${activity.impact_level > 70 ? 'text-red-400' : 'text-yellow-400'}`}>{activity.impact_level}%</p>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/60">
                    <p className="text-gray-400">Threat Level</p>
                    <p className={`font-semibold ${activity.player_threat_level > 60 ? 'text-red-400' : 'text-green-400'}`}>{activity.player_threat_level}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'tips' && (
        <Card className="glass-panel border-blue-500/20">
          <CardHeader className="border-b border-blue-500/20">
            <CardTitle className="text-white text-sm">💡 Market Intelligence Guide</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-sm text-gray-300">
            {[
              { icon: '📈', tip: 'High demand + low supply = buy now and sell later for max profit' },
              { icon: '🔥', tip: 'Rising police heat reduces supply and increases prices — exploit it' },
              { icon: '🌊', tip: 'Falling prices indicate oversupply — avoid buying until market corrects' },
              { icon: '⚔️', tip: 'Competitor price wars are opportunities — wait for their stockout' },
              { icon: '🕵️', tip: 'Intelligence category has highest profit margin — focus allocation there' },
              { icon: '⚠️', tip: 'Never trade hot items (heat >70%) with a wanted level above 3 stars' },
              { icon: '💰', tip: 'Buy contraband during low police heat cycles, sell during crackdowns' },
              { icon: '🤝', tip: 'Full alliances share market data — join one to get real-time competitor intel' },
            ].map(({ icon, tip }, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0">{icon}</span>
                <p>{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}