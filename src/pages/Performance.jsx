import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Zap, Activity } from 'lucide-react';
import QuantumPerformanceMonitor from '../components/performance/QuantumPerformanceMonitor';

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Quantum Performance Analytics
            </h1>
            <p className="text-gray-400 mt-1">Real-time application speed monitoring</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center animate-pulse">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <QuantumPerformanceMonitor />

      {/* Performance Tips */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Optimization Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3 text-sm text-gray-300">
            <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <h4 className="font-semibold text-white mb-1">Caching Strategy</h4>
              <p className="text-xs text-gray-400">
                Data is cached for 30-60 seconds to reduce API calls while maintaining freshness
              </p>
            </div>
            <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
              <h4 className="font-semibold text-white mb-1">Lazy Loading</h4>
              <p className="text-xs text-gray-400">
                Components load on-demand, reducing initial bundle size and improving load time
              </p>
            </div>
            <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/20">
              <h4 className="font-semibold text-white mb-1">Query Limits</h4>
              <p className="text-xs text-gray-400">
                Database queries limited to 50-100 records for faster response times
              </p>
            </div>
            <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
              <h4 className="font-semibold text-white mb-1">Smart Refetching</h4>
              <p className="text-xs text-gray-400">
                Background updates every 15-30 seconds instead of aggressive 5-second polling
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}