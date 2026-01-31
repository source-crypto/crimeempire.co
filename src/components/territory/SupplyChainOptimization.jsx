import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Zap, TrendingUp, Route } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplyChainOptimization({ supplyChains, enterpriseData, playerData, enterpriseNPCs }) {
  const queryClient = useQueryClient();
  const [expandedChain, setExpandedChain] = useState(null);
  const [assigningNPC, setAssigningNPC] = useState(null);

  const optimizeMutation = useMutation({
    mutationFn: async (chainId) => {
      const cost = 3000;
      if (playerData.crypto_balance < cost) throw new Error('Insufficient funds');

      await base44.entities.AdvancedSupplyChain.update(chainId, {
        efficiency: Math.min(100, 80 + Math.random() * 20),
        risk_level: Math.max(30, (Math.random() * 70))
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyChains']);
      queryClient.invalidateQueries(['player']);
      toast.success('Route optimized!');
    },
    onError: (error) => toast.error(error.message)
  });

  const assignNPCMutation = useMutation({
    mutationFn: async ({ chainId, npcId }) => {
      await base44.entities.AdvancedSupplyChain.update(chainId, {
        npc_manager_id: npcId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyChains']);
      toast.success('NPC assigned to supply chain!');
      setAssigningNPC(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const reinforceMutation = useMutation({
    mutationFn: async (chainId) => {
      const cost = 5000;
      if (playerData.crypto_balance < cost) throw new Error('Insufficient funds');

      await base44.entities.AdvancedSupplyChain.update(chainId, {
        risk_level: Math.max(0, ((await base44.entities.AdvancedSupplyChain.filter({ id: chainId }))[0]?.risk_level || 50) - 15)
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyChains']);
      queryClient.invalidateQueries(['player']);
      toast.success('Security reinforced!');
    },
    onError: (error) => toast.error(error.message)
  });

  const totalProfit = supplyChains.reduce((sum, chain) => {
    const efficiency = (chain.efficiency || 100) / 100;
    return sum + (chain.weekly_volume * chain.profit_per_unit * efficiency);
  }, 0);

  const avgRisk = Math.round(supplyChains.reduce((sum, chain) => sum + (chain.risk_level || 50), 0) / (supplyChains.length || 1));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Route className="w-5 h-5 text-purple-400" />
            Supply Chain Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Active Chains</p>
              <p className="text-lg font-bold text-cyan-400">{supplyChains.filter(c => c.is_active).length}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Weekly Profit</p>
              <p className="text-lg font-bold text-green-400">${(totalProfit / 1000).toFixed(0)}k</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Avg Risk Level</p>
              <p className={`text-lg font-bold ${avgRisk > 70 ? 'text-red-400' : 'text-yellow-400'}`}>{avgRisk}%</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Disruptions</p>
              <p className="text-lg font-bold text-red-400">{supplyChains.filter(c => c.disruption_status !== 'operational').length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chains */}
      <div className="space-y-3">
        {supplyChains.map((chain) => {
          const npcManager = chain.npc_manager_id ? enterpriseNPCs.find(n => n.id === chain.npc_manager_id) : null;
          const isExpanded = expandedChain === chain.id;

          return (
            <Card 
              key={chain.id}
              className={`glass-panel border cursor-pointer transition-all ${
                isExpanded ? 'border-cyan-500/50' : 'border-cyan-500/20'
              }`}
              onClick={() => setExpandedChain(isExpanded ? null : chain.id)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-semibold">{chain.chain_name}</h4>
                    <p className="text-xs text-gray-400">
                      {chain.source_territory} → {chain.destination_territory}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      chain.disruption_status === 'operational' ? 'bg-green-600' :
                      chain.disruption_status === 'disrupted' ? 'bg-yellow-600' : 'bg-red-600'
                    }>
                      {chain.disruption_status}
                    </Badge>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-5 gap-2 text-xs mb-3">
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Volume</p>
                    <p className="text-cyan-400 font-semibold">{chain.weekly_volume}</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Profit/U</p>
                    <p className="text-green-400 font-semibold">${chain.profit_per_unit}</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Efficiency</p>
                    <p className="text-purple-400 font-semibold">{chain.efficiency}%</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Risk</p>
                    <p className={`font-semibold ${chain.risk_level > 70 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {chain.risk_level}%
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Manager</p>
                    <p className="text-blue-400 font-semibold text-[10px]">{npcManager ? '✓' : '✗'}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Efficiency</span>
                      <span>{chain.efficiency}%</span>
                    </div>
                    <Progress value={chain.efficiency} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Risk Level</span>
                      <span>{chain.risk_level}%</span>
                    </div>
                    <Progress value={chain.risk_level} className="h-2" />
                  </div>
                </div>

                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="space-y-3 border-t border-cyan-500/20 pt-3">
                    {npcManager ? (
                      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                        <p className="text-xs text-blue-300 font-semibold mb-1">📋 Manager Assigned</p>
                        <p className="text-sm text-blue-200">{npcManager.npc_name}</p>
                        <p className="text-xs text-blue-300 mt-1">+{npcManager.production_bonus}% efficiency</p>
                      </div>
                    ) : (
                      <div>
                        {assigningNPC === chain.id ? (
                          <div className="space-y-2">
                            <p className="text-xs text-white font-semibold">Assign Manager</p>
                            <div className="grid grid-cols-2 gap-2">
                              {enterpriseNPCs.map((npc) => (
                                <Button
                                  key={npc.id}
                                  size="sm"
                                  onClick={() => assignNPCMutation.mutate({ chainId: chain.id, npcId: npc.id })}
                                  disabled={assignNPCMutation.isPending}
                                  className="text-xs h-8 bg-blue-600 hover:bg-blue-700"
                                >
                                  {npc.npc_name.split(' ')[0]}
                                </Button>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAssigningNPC(null)}
                              className="w-full h-8 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setAssigningNPC(chain.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                          >
                            Assign Manager
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Risk Warning */}
                    {chain.risk_level > 70 && (
                      <div className="p-2 bg-red-900/20 border border-red-500/30 rounded flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-300">High-risk route. Consider reinforcing security or optimizing routes.</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => optimizeMutation.mutate(chain.id)}
                        disabled={playerData.crypto_balance < 3000 || optimizeMutation.isPending}
                        className="bg-cyan-600 hover:bg-cyan-700 h-8 text-xs"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Optimize ($3k)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => reinforceMutation.mutate(chain.id)}
                        disabled={playerData.crypto_balance < 5000 || reinforceMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Reinforce ($5k)
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}