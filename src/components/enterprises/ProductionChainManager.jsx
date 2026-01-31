import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, TrendingUp, Zap, Settings, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductionChainManager({ enterprise, playerData }) {
  const queryClient = useQueryClient();
  const [newChain, setNewChain] = useState(null);

  const { data: chains = [] } = useQuery({
    queryKey: ['productionChains', enterprise.id],
    queryFn: () => base44.entities.ProductionChain.filter({ enterprise_id: enterprise.id }),
    enabled: !!enterprise?.id
  });

  const createChainMutation = useMutation({
    mutationFn: async (chainData) => {
      return base44.entities.ProductionChain.create({
        enterprise_id: enterprise.id,
        ...chainData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionChains']);
      setNewChain(null);
      toast.success('Production chain created');
    }
  });

  const toggleChainMutation = useMutation({
    mutationFn: async ({ chainId, isActive }) => {
      return base44.entities.ProductionChain.update(chainId, { is_active: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionChains']);
      toast.success('Chain status updated');
    }
  });

  const toggleAIMutation = useMutation({
    mutationFn: async ({ chainId, aiManaged }) => {
      return base44.entities.ProductionChain.update(chainId, { ai_managed: !aiManaged });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionChains']);
      toast.success('AI management updated');
    }
  });

  const predefinedChains = {
    marijuana_farm: {
      chain_name: 'Seed to Product',
      chain_type: 'multi_stage',
      input_resources: [
        { resource_type: 'seeds', quantity_required: 100 },
        { resource_type: 'water', quantity_required: 200 }
      ],
      output_products: [
        { product_name: 'Premium Cannabis', quantity_produced: 50, value_per_unit: 500 }
      ],
      production_stages: [
        { stage_number: 1, stage_name: 'Germination', duration_hours: 2, automation_level: 80 },
        { stage_number: 2, stage_name: 'Growing', duration_hours: 8, automation_level: 90 },
        { stage_number: 3, stage_name: 'Harvesting', duration_hours: 1, automation_level: 60 },
        { stage_number: 4, stage_name: 'Processing', duration_hours: 3, automation_level: 70 }
      ]
    },
    chop_shop: {
      chain_name: 'Vehicle Disassembly',
      chain_type: 'conversion',
      input_resources: [
        { resource_type: 'stolen_vehicles', quantity_required: 1 }
      ],
      output_products: [
        { product_name: 'Auto Parts', quantity_produced: 100, value_per_unit: 200 },
        { product_name: 'Scrap Metal', quantity_produced: 50, value_per_unit: 50 }
      ],
      production_stages: [
        { stage_number: 1, stage_name: 'Stripping', duration_hours: 2, automation_level: 40 },
        { stage_number: 2, stage_name: 'Processing', duration_hours: 1, automation_level: 60 }
      ]
    }
  };

  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Production Chains
          </span>
          {!newChain && predefinedChains[enterprise.type] && (
            <Button
              size="sm"
              onClick={() => setNewChain(true)}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Create Chain
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {newChain && (
          <div className="p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
            <h4 className="text-white font-semibold mb-3">Setup Production Chain</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Chain Template</label>
                <p className="text-white font-semibold">{predefinedChains[enterprise.type].chain_name}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createChainMutation.mutate(predefinedChains[enterprise.type])}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  disabled={createChainMutation.isPending}
                >
                  Create Chain
                </Button>
                <Button variant="outline" onClick={() => setNewChain(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {chains.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No production chains configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chains.map((chain) => (
              <div
                key={chain.id}
                className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-semibold">{chain.chain_name}</h4>
                      <Badge className={chain.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                        {chain.is_active ? 'Active' : 'Paused'}
                      </Badge>
                      {chain.ai_managed && (
                        <Badge className="bg-purple-600">
                          <Zap className="w-3 h-3 mr-1" />
                          AI Managed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 capitalize">{chain.chain_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleChainMutation.mutate({ chainId: chain.id, isActive: chain.is_active })}
                    >
                      {chain.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAIMutation.mutate({ chainId: chain.id, aiManaged: chain.ai_managed })}
                      className={chain.ai_managed ? 'border-purple-500 text-purple-400' : ''}
                    >
                      <Zap className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Efficiency</p>
                    <Progress value={chain.efficiency_rating} className="h-2" />
                    <p className="text-xs text-cyan-400 mt-1">{chain.efficiency_rating}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Automation</p>
                    <Progress value={chain.automation_level} className="h-2" />
                    <p className="text-xs text-purple-400 mt-1">{chain.automation_level}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Cycles Completed</p>
                    <p className="text-white font-semibold">{chain.cycles_completed || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Value</p>
                    <p className="text-green-400 font-semibold">
                      ${(chain.total_output_value || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {chain.production_stages?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/20">
                    <p className="text-xs text-gray-400 mb-2">Production Stages</p>
                    <div className="space-y-1">
                      {chain.production_stages.map((stage, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-400">{stage.stage_name}</span>
                          <span className="text-cyan-400">{stage.duration_hours}h • {stage.automation_level}% auto</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}