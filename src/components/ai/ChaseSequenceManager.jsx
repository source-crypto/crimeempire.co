import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, MapPin, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';

const chaseTypes = {
  pursuit: { icon: '🚓', label: 'Police Pursuit' },
  ambush: { icon: '⚔️', label: 'Ambush' },
  surveillance_breach: { icon: '📡', label: 'Surveillance Breach' },
  heist_gone_wrong: { icon: '💣', label: 'Heist Gone Wrong' },
  contract_execution: { icon: '🎯', label: 'Contract Execution' }
};

export default function ChaseSequenceManager({ playerData, leResponse }) {
  const queryClient = useQueryClient();
  const [expandedChase, setExpandedChase] = useState(null);
  const [timer, setTimer] = useState(0);

  const { data: activeChases = [] } = useQuery({
    queryKey: ['chaseScenarios', playerData?.id],
    queryFn: () => base44.entities.ChaseScenario.filter({ 
      player_id: playerData.id,
      status: 'active'
    }),
    enabled: !!playerData?.id,
    refetchInterval: 5000
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerChaseMutation = useMutation({
    mutationFn: async (trigger) => {
      const unitCount = Math.floor(leResponse?.surveillance_units || 1) + Math.floor(Math.random() * 4);
      const unitTypes = [];
      if (unitCount > 2) unitTypes.push('patrol');
      if (unitCount > 4) unitTypes.push('swat');
      if (unitCount > 6) unitTypes.push('helicopter');

      const escapeRoutes = [
        { route_name: 'Back alleys', risk_level: 40, success_probability: 65 },
        { route_name: 'Highway', risk_level: 60, success_probability: 50 },
        { route_name: 'Underground parking', risk_level: 30, success_probability: 80 },
        { route_name: 'Crowd district', risk_level: 35, success_probability: 75 }
      ];

      await base44.entities.ChaseScenario.create({
        player_id: playerData.id,
        trigger_event: trigger,
        trigger_heat_level: leResponse?.investigation_tier || 0,
        chase_type: ['pursuit', 'ambush', 'heist_gone_wrong'][Math.floor(Math.random() * 3)],
        law_enforcement_units: unitCount,
        unit_types: unitTypes,
        difficulty: unitCount > 8 ? 'extreme' : unitCount > 5 ? 'hard' : unitCount > 2 ? 'medium' : 'easy',
        escape_routes: escapeRoutes,
        time_remaining: 300 + (unitCount * 20)
      });

      toast.info(`Chase triggered: ${trigger}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chaseScenarios']);
    }
  });

  const escapeMutation = useMutation({
    mutationFn: async (chase, route) => {
      const success = Math.random() * 100 < route.success_probability;

      await base44.entities.ChaseScenario.update(chase.id, {
        status: success ? 'escaped' : 'captured'
      });

      if (success) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance + 5000
        });
        toast.success('Escape successful! +$5000');
      } else {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: Math.max(0, playerData.crypto_balance - 10000)
        });
        toast.error('Captured! -$10000');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chaseScenarios']);
      queryClient.invalidateQueries(['player']);
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="space-y-4">
      {/* Active Chases */}
      {activeChases.length === 0 ? (
        <Card className="glass-panel border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <MapPin className="w-4 h-4 text-blue-400" />
              Active Chases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">No active pursuits.</p>
            <button
              onClick={() => triggerChaseMutation.mutate('Test High-Profile Action')}
              className="mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            >
              Simulate Chase (Test)
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-panel border-red-500/40 bg-red-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              🚨 ACTIVE PURSUIT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeChases.map((chase) => {
                const timeLeft = Math.max(0, chase.time_remaining - timer);
                const isExpanded = expandedChase === chase.id;

                return (
                  <div
                    key={chase.id}
                    className="p-4 rounded-lg border border-red-500/50 bg-slate-900/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-bold text-lg">
                          {chaseTypes[chase.chase_type]?.icon} {chaseTypes[chase.chase_type]?.label}
                        </h4>
                        <p className="text-xs text-gray-400">{chase.trigger_event}</p>
                      </div>
                      <Badge className={
                        chase.difficulty === 'easy' ? 'bg-yellow-600' :
                        chase.difficulty === 'medium' ? 'bg-orange-600' :
                        chase.difficulty === 'hard' ? 'bg-red-600' : 'bg-red-700'
                      }>
                        {chase.difficulty}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Units</p>
                        <p className="text-red-400 font-bold">{chase.law_enforcement_units}</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Time</p>
                        <p className="text-yellow-400 font-bold">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Types</p>
                        <p className="text-cyan-400 font-bold">{chase.unit_types.join(', ') || 'Patrol'}</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Escape</p>
                        <p className="text-green-400 font-bold">{chase.escape_routes.length}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Time Until Capture</span>
                        <span className={timeLeft < 60 ? 'text-red-400 font-bold' : 'text-gray-300'}>
                          {Math.round((timeLeft / chase.time_remaining) * 100)}%
                        </span>
                      </div>
                      <Progress value={(timeLeft / chase.time_remaining) * 100} className="h-3" />
                    </div>

                    {!isExpanded ? (
                      <button
                        onClick={() => setExpandedChase(chase.id)}
                        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold"
                      >
                        Choose Escape Route
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-300 font-semibold">Escape Routes:</p>
                        {chase.escape_routes.map((route, idx) => (
                          <div key={idx} className="p-2 bg-slate-800/50 rounded border border-yellow-500/30">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-semibold text-sm">{route.route_name}</span>
                              <span className={`text-xs font-bold ${route.success_probability > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {route.success_probability}% success
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-3 h-3 text-red-400" />
                              <span className="text-xs text-gray-400">Risk: {route.risk_level}%</span>
                            </div>
                            <button
                              onClick={() => escapeMutation.mutate(chase, route)}
                              disabled={escapeMutation.isPending}
                              className="w-full px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-semibold"
                            >
                              <Zap className="w-3 h-3 inline mr-1" />
                              Escape via {route.route_name}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">🎮 Chase Mechanics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-gray-400">
          <p>• High-profile mission failures trigger chase sequences</p>
          <p>• LE units scale with investigation tier</p>
          <p>• Each escape route has different risk/reward</p>
          <p>• Time limit decreases as units increase</p>
          <p>• Capture results in asset seizure</p>
        </CardContent>
      </Card>
    </div>
  );
}