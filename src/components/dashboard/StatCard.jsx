import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, trend, trendValue, color = "purple" }) {
  const colorClasses = {
    purple: "from-purple-600 to-purple-800 border-purple-500/30",
    cyan: "from-cyan-600 to-cyan-800 border-cyan-500/30",
    red: "from-red-600 to-red-800 border-red-500/30",
    green: "from-green-600 to-green-800 border-green-500/30",
    orange: "from-orange-600 to-orange-800 border-orange-500/30"
  };

  return (
    <Card className="glass-panel border p-6 relative overflow-hidden group hover:scale-105 transition-transform">
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-10 group-hover:opacity-20 transition-opacity`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} neon-border`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center gap-2">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}