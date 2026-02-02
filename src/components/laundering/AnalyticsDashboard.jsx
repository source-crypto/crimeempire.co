import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnalyticsDashboard({ businesses }) {
  // Calculate aggregate stats
  const totalCapacity = businesses.reduce((sum, b) => sum + b.capacity_per_hour, 0);
  const avgEfficiency = businesses.length > 0 
    ? businesses.reduce((sum, b) => sum + b.efficiency, 0) / businesses.length 
    : 0;
  const totalCleaned = businesses.reduce((sum, b) => sum + b.clean_money_generated, 0);
  const avgSuspicion = businesses.length > 0
    ? businesses.reduce((sum, b) => sum + b.suspicion_level, 0) / businesses.length
    : 0;

  // Performance chart data
  const performanceData = businesses.map(b => ({
    name: b.business_name.substring(0, 15),
    efficiency: b.efficiency,
    suspicion: b.suspicion_level,
    capacity: b.capacity_per_hour / 1000
  }));

  // Revenue data (simulated trend)
  const revenueData = [
    { period: 'Week 1', revenue: totalCleaned * 0.1 },
    { period: 'Week 2', revenue: totalCleaned * 0.15 },
    { period: 'Week 3', revenue: totalCleaned * 0.25 },
    { period: 'Week 4', revenue: totalCleaned * 0.5 },
    { period: 'Current', revenue: totalCleaned }
  ];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="glass-panel border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Activity className="w-4 h-4 text-blue-400" />
                <TrendingUp className="w-3 h-3 text-green-400" />
              </div>
              <p className="text-xs text-gray-400">Total Capacity</p>
              <p className="text-xl font-bold text-blue-400">${(totalCapacity / 1000).toFixed(0)}k/hr</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-panel border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xs text-gray-400">Avg Efficiency</p>
              <p className="text-xl font-bold text-green-400">{avgEfficiency.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-panel border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <DollarSign className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-xs text-gray-400">Total Cleaned</p>
              <p className="text-xl font-bold text-yellow-400">${(totalCleaned / 1000).toFixed(0)}k</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-panel border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                {avgSuspicion > 60 && <TrendingUp className="w-3 h-3 text-red-400" />}
              </div>
              <p className="text-xs text-gray-400">Avg Suspicion</p>
              <p className={`text-xl font-bold ${avgSuspicion > 60 ? 'text-red-400' : 'text-green-400'}`}>
                {avgSuspicion.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Chart */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Business Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" />
              <Bar dataKey="suspicion" fill="#ef4444" name="Suspicion %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Trend */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="period" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Business Rankings */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...businesses]
              .sort((a, b) => b.clean_money_generated - a.clean_money_generated)
              .slice(0, 5)
              .map((business, idx) => (
                <div key={business.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge className={idx === 0 ? 'bg-yellow-600' : idx === 1 ? 'bg-gray-400' : 'bg-orange-700'}>
                      #{idx + 1}
                    </Badge>
                    <span className="text-white text-xs">{business.business_name}</span>
                  </div>
                  <span className="text-green-400 text-xs font-semibold">
                    ${(business.clean_money_generated / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}