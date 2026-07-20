import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Crown, Wallet, TrendingUp, Building2, Map, Shield, Users, Activity, Star, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { computeEmpireMetrics, currentLeadershipTitle, nextLeadershipTitle } from '@/lib/empireMetrics';

const COLORS = ['#9333EA', '#06B6D4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

export default function EmpireCommand() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: player } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0] || null; },
    enabled: !!user?.email,
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['empireProperties', player?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: player.id }, '-acquired_at', 100),
    enabled: !!player?.id,
  });
  const { data: territories = [] } = useQuery({ queryKey: ['empireTerritories'], queryFn: () => base44.entities.Territory.list() });
  const { data: employments = [] } = useQuery({
    queryKey: ['empireEmployment', player?.id],
    queryFn: () => base44.entities.Employment.filter({ player_id: player.id }),
    enabled: !!player?.id,
  });

  const myTerritories = useMemo(() => territories.filter((t) => t.controlling_crew_id === player?.crew_id), [territories, player]);
  const metrics = useMemo(() => computeEmpireMetrics({ player, properties, territories, employments, myTerritories }), [player, properties, territories, employments, myTerritories]);

  const cashFlowData = useMemo(() => {
    const labels = ['Income', 'Upkeep', 'Payroll', 'Net'];
    const income = properties.reduce((s, p) => s + (p.income_per_hour || 0), 0) * 24 * 30;
    const upkeep = properties.reduce((s, p) => s + (p.upkeep_per_hour || 0), 0) * 24 * 30;
    const payroll = metrics.payrollCycle;
    return [
      { name: 'Income', value: Math.round(income) },
      { name: 'Upkeep', value: Math.round(upkeep) },
      { name: 'Payroll', value: payroll },
      { name: 'Net', value: Math.round(income - upkeep - payroll) },
    ];
  }, [properties, metrics]);

  const assetDist = useMemo(() => {
    const m = {};
    properties.forEach((p) => { m[p.property_type] = (m[p.property_type] || 0) + (p.market_value || p.purchase_price || 0); });
    return Object.entries(m).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [properties]);

  if (!player) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  const nextTitle = nextLeadershipTitle(player.level || 1);
  const stats = [
    { label: 'Net Worth', value: `$${metrics.netWorth.toLocaleString()}`, icon: Wallet, color: 'text-green-400' },
    { label: 'Monthly Profit', value: `$${metrics.monthlyProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-cyan-400' },
    { label: 'Weekly Revenue', value: `$${metrics.weeklyRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Asset Value', value: `$${metrics.assetValue.toLocaleString()}`, icon: Building2, color: 'text-purple-400' },
    { label: 'Territory Value', value: `$${metrics.territoryValue.toLocaleString()}`, icon: Map, color: 'text-blue-400' },
    { label: 'Influence Rating', value: `${metrics.influenceRating}/100`, icon: Star, color: 'text-amber-400' },
    { label: 'Population Support', value: `${metrics.populationSupport}%`, icon: Users, color: 'text-green-400' },
    { label: 'Stability Index', value: `${metrics.stabilityIndex}/100`, icon: Shield, color: 'text-cyan-400' },
    { label: 'Risk Level', value: `${metrics.riskLevel}/100`, icon: Activity, color: metrics.riskLevel > 50 ? 'text-red-400' : 'text-yellow-400' },
    { label: 'Reputation', value: metrics.reputation.toLocaleString(), icon: Crown, color: 'text-purple-400' },
    { label: 'Global Rank', value: `#${metrics.globalRank}`, icon: TrendingUp, color: 'text-amber-400' },
    { label: 'Leadership Title', value: metrics.title.title, icon: Crown, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Empire Command Center</h1>
          <p className="text-sm text-gray-400">Executive intelligence dashboard · {player.username || 'Operative'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="glass-panel border-purple-500/20">
              <CardContent className="p-3 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className={`text-base font-bold ${s.color} truncate`}>{s.value}</p>
                <p className="text-xs text-gray-400 truncate">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide">Monthly Cash Flow</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashFlowData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,51,234,0.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(147,51,234,0.4)', borderRadius: 8, color: '#e2e8f0' }} />
                <Bar dataKey="value" fill="#9333EA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide">Asset Distribution</h3>
            {assetDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={assetDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={{ fill: '#cbd5e1', fontSize: 10 }}>
                    {assetDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(147,51,234,0.4)', borderRadius: 8, color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm py-10 text-center">No assets to distribute.</p>}
          </CardContent>
        </Card>
      </div>

      {nextTitle && (
        <Card className="glass-panel border-amber-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-1 uppercase tracking-wide">Next Leadership Rank</h3>
            <p className="text-white">{metrics.title.title} <span className="text-gray-500">→</span> <span className="text-amber-300 font-bold">{nextTitle.title}</span></p>
            <p className="text-xs text-gray-400 mt-1">Unlocks at level {nextTitle.minLevel} · you are level {player.level || 1}</p>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-amber-500 to-purple-500 rounded-full" style={{ width: `${Math.min(100, ((player.level || 1) / nextTitle.minLevel) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}