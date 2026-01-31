import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react';

export default function MarketTrendAnalyzer() {
  const { data: allTrends = [] } = useQuery({
    queryKey: ['marketTrendData'],
    queryFn: () => base44.entities.MarketTrendData.list(),
    refetchInterval: 30000
  });

  const { data: competitorActivities = [] } = useQuery({
    queryKey: ['competitorActivities'],
    queryFn: () => base44.entities.CompetitorActivity.filter({ status: 'active' }),
    refetchInterval: 30000
  });

  const getTrendIcon = (trend) => {
    if (trend === 'rising') return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (trend === 'falling') return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <TrendingDown className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Market Trends */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allTrends.map((trend) => (
              <div key={trend.id} className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(trend.price_trend)}
                    <div>
                      <h4 className="text-white font-semibold capitalize">{trend.item_type.replace(/_/g, ' ')}</h4>
                      <p className="text-xs text-gray-400">Price: ${trend.current_price?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                  <Badge className={
                    trend.price_trend === 'rising' ? 'bg-red-600' :
                    trend.price_trend === 'falling' ? 'bg-green-600' : 'bg-yellow-600'
                  }>
                    {trend.price_trend}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div className="p-1.5 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Demand</p>
                    <p className="text-green-400 font-semibold">{trend.demand_level}%</p>
                  </div>
                  <div className="p-1.5 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Supply</p>
                    <p className="text-blue-400 font-semibold">{trend.supply_level}%</p>
                  </div>
                  <div className="p-1.5 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Heat</p>
                    <p className={`font-semibold ${trend.police_heat > 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {trend.police_heat}%
                    </p>
                  </div>
                </div>

                {trend.market_event && (
                  <p className="text-xs text-gray-300 bg-slate-800/30 p-1.5 rounded">
                    📰 {trend.market_event}
                  </p>
                )}
                
                {trend.trend_summary && (
                  <p className="text-xs text-gray-400 mt-2 italic">{trend.trend_summary}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitor Activity */}
      {competitorActivities.length > 0 && (
        <Card className="glass-panel border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-red-400" />
              Competitor Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {competitorActivities.map((activity) => (
                <div key={activity.id} className="p-3 bg-slate-900/50 rounded-lg border border-red-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold">{activity.competitor_name}</h4>
                      <p className="text-xs text-gray-400">{activity.activity_type.replace(/_/g, ' ')}</p>
                    </div>
                    <AlertTriangle className={`w-4 h-4 ${activity.player_threat_level > 50 ? 'text-red-400' : 'text-yellow-400'}`} />
                  </div>

                  <p className="text-xs text-gray-300 mb-2">{activity.description}</p>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Market</p>
                      <p className="text-cyan-400 font-semibold">{activity.target_market}</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Impact</p>
                      <p className={`font-semibold ${activity.impact_level > 70 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {activity.impact_level}%
                      </p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Threat</p>
                      <p className={`font-semibold ${activity.player_threat_level > 50 ? 'text-red-400' : 'text-green-400'}`}>
                        {activity.player_threat_level}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Tips */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">💡 Market Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-gray-400">
          <p>• High demand + low supply = Price spike opportunity</p>
          <p>• Rising prices indicate market heat - competitors active</p>
          <p>• Falling prices mean supply excess - bulk buy discounts</p>
          <p>• Competitor price wars can undercut your listings</p>
          <p>• Police heat drives prices up due to scarcity</p>
        </CardContent>
      </Card>
    </div>
  );
}