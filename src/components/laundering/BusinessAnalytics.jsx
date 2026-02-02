import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react';

export default function BusinessAnalytics({ businesses }) {
  // Revenue by business type
  const revenueData = businesses.reduce((acc, b) => {
    const type = b.business_type;
    const existing = acc.find(item => item.type === type);
    if (existing) {
      existing.revenue += b.clean_money_generated || 0;
    } else {
      acc.push({ type: type.replace(/_/g, ' '), revenue: b.clean_money_generated || 0 });
    }
    return acc;
  }, []);

  // Efficiency distribution
  const efficiencyData = businesses.map(b => ({
    name: b.business_name.substring(0, 15),
    efficiency: b.efficiency,
    suspicion: b.suspicion_level
  }));

  // Risk levels
  const riskDistribution = [
    { name: 'Low Risk', value: businesses.filter(b => b.suspicion_level < 30).length, color: '#10b981' },
    { name: 'Medium Risk', value: businesses.filter(b => b.suspicion_level >= 30 && b.suspicion_level < 70).length, color: '#f59e0b' },
    { name: 'High Risk', value: businesses.filter(b => b.suspicion_level >= 70).length, color: '#ef4444' }
  ];

  // Total stats
  const totalCapacity = businesses.reduce((sum, b) => sum + b.capacity_per_hour, 0);
  const totalCleaned = businesses.reduce((sum, b) => sum + (b.clean_money_generated || 0), 0);
  const avgEfficiency = businesses.length > 0 
    ? businesses.reduce((sum, b) => sum + b.efficiency, 0) / businesses.length 
    : 0;
  const avgSuspicion = businesses.length > 0
    ? businesses.reduce((sum, b) => sum + b.suspicion_level, 0) / businesses.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-panel border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <p className="text-gray-400 text-xs">Total Capacity/hr</p>
            </div>
            <p className="text-2xl font-bold text-blue-400">${(totalCapacity / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <p className="text-gray-400 text-xs">Total Cleaned</p>
            </div>
            <p className="text-2xl font-bold text-green-400">${(totalCleaned / 1000000).toFixed(2)}M</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <p className="text-gray-400 text-xs">Avg Efficiency</p>
            </div>
            <p className="text-2xl font-bold text-purple-400">{avgEfficiency.toFixed(0)}%</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-gray-400 text-xs">Avg Suspicion</p>
            </div>
            <p className="text-2xl font-bold text-red-400">{avgSuspicion.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue by Type */}
        <Card className="glass-panel border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Revenue by Business Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData}>
                <XAxis dataKey="type" stroke="#9ca3af" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981' }} />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card className="glass-panel border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ef4444' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Efficiency vs Suspicion */}
        <Card className="glass-panel border-purple-500/20 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white text-sm">Business Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={efficiencyData}>
                <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #9333ea' }} />
                <Line type="monotone" dataKey="efficiency" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
                <Line type="monotone" dataKey="suspicion" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-gray-400">Efficiency</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-400">Suspicion</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Performance Table */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Business Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-gray-400 p-2">Business</th>
                  <th className="text-left text-gray-400 p-2">Type</th>
                  <th className="text-right text-gray-400 p-2">Capacity</th>
                  <th className="text-right text-gray-400 p-2">Efficiency</th>
                  <th className="text-right text-gray-400 p-2">Suspicion</th>
                  <th className="text-right text-gray-400 p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(business => (
                  <tr key={business.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-2 text-white">{business.business_name}</td>
                    <td className="p-2 text-gray-400 capitalize">{business.business_type.replace(/_/g, ' ')}</td>
                    <td className="p-2 text-right text-blue-400">${(business.capacity_per_hour / 1000).toFixed(0)}k/h</td>
                    <td className="p-2 text-right text-green-400">{business.efficiency}%</td>
                    <td className="p-2 text-right">
                      <span className={business.suspicion_level > 70 ? 'text-red-400' : business.suspicion_level > 40 ? 'text-orange-400' : 'text-green-400'}>
                        {Math.round(business.suspicion_level)}%
                      </span>
                    </td>
                    <td className="p-2 text-right text-green-400">${((business.clean_money_generated || 0) / 1000).toFixed(0)}k</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}