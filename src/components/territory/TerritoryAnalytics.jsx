import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  Shield, AlertTriangle, Target, BarChart3 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TerritoryAnalytics({ territories = [], crewData, playerData }) {
  const { data: revenueHistory = [] } = useQuery({
    queryKey: ['territoryRevenue', crewData?.id, playerData?.id],
    queryFn: async () => {
      if (!playerData?.id) return [];
      
      const logs = await base44.entities.TransactionLog.filter({
        player_id: playerData.id,
        transaction_type: 'territory_income'
      });
      
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split('T')[0];
        
        const dayRevenue = logs
          .filter(log => log.created_date?.startsWith(dayStr))
          .reduce((sum, log) => sum + (log.amount || 0), 0);
        
        last7Days.push({
          day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue
        });
      }
      
      return last7Days;
    },
    enabled: !!crewData?.id && !!playerData?.id
  });

  const totalRevenue = (territories || []).reduce((sum, t) => sum + (t.revenue_multiplier || 1) * 1000, 0);
  const avgControl = (territories || []).reduce((sum, t) => sum + (t.control_percentage || 0), 0) / (territories.length || 1);
  const contestedCount = (territories || []).filter(t => t.is_contested).length;
  const avgDefense = (territories || []).reduce((sum, t) => sum + (t.defense_rating || 50), 0) / (territories.length || 1);

  const stats = [
    {
      label: 'Estimated Hourly Revenue',
      value: `$${totalRevenue.toLocaleString()}/hr`,
      icon: DollarSign,
      color: 'text-green-400',
      trend: '+15%'
    },
    {
      label: 'Average Control',
      value: `${Math.floor(avgControl)}%`,
      icon: Target,
      color: 'text-purple-400',
      progress: avgControl
    },
    {
      label: 'Defense Rating',
      value: Math.floor(avgDefense),
      icon: Shield,
      color: 'text-blue-400',
      progress: avgDefense
    },
    {
      label: 'Active Threats',
      value: contestedCount,
      icon: AlertTriangle,
      color: contestedCount > 0 ? 'text-red-400' : 'text-gray-400',
      alert: contestedCount > 0
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Territory Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${
                    stat.alert 
                      ? 'bg-red-900/20 border-red-500/30' 
                      : 'bg-slate-900/30 border-purple-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-gray-400">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  {stat.trend && (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <TrendingUp className="w-3 h-3" />
                      {stat.trend}
                    </div>
                  )}
                  {stat.progress !== undefined && (
                    <Progress value={stat.progress} className="h-1 mt-2" />
                  )}
                </div>
              );
            })}
          </div>

          {revenueHistory.length > 0 && (
            <div className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10">
              <h4 className="text-white font-semibold mb-4">7-Day Revenue Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueHistory}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #9333ea',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#a855f7" 
                    fillOpacity={1} 
                    fill="url(#revenueGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}