import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdvancedSupplyChainManager({ enterpriseData }) {
  const queryClient = useQueryClient();
  const [creatingChain, setCreatingChain] = useState(false);

  const { data: supplyChains = [] } = useQuery({
    queryKey: ['supplyChains', enterpriseData?.id],
    queryFn: () => base44.entities.AdvancedSupplyChain.filter({ enterprise_id: enterpriseData.id }),
    enabled: !!enterpriseData?.id
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const createChainMutation = useMutation({
    mutationFn: async (chainData) => {
      await base44.entities.AdvancedSupplyChain.create({
        enterprise_id: enterpriseData.id,
        chain_name: chainData.chain_name,
        source_territory: chainData.source_territory,
        destination_territory: chainData.destination_territory,
        resource_type: chainData.resource_type,
        weekly_volume: chainData.weekly_volume,
        profit_per_unit: chainData.profit_per_unit
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyChains']);
      toast.success('Supply chain established!');
      setCreatingChain(false);
    },
    onError: (error) => toast.error(error.message)
  });

  const disruptChainMutation = useMutation({
    mutationFn: async (chainId) => {
      await base44.entities.AdvancedSupplyChain.update(chainId, {
        disruption_status: 'disrupted',
        efficiency: 50
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyChains']);
      toast.warning('Supply chain disrupted!');
    }
  });

  const totalWeeklyProfit = supplyChains.reduce((sum, chain) => {
    if (chain.disruption_status !== 'blocked') {
      const efficiency = (chain.efficiency || 100) / 100;
      return sum + (chain.weekly_volume * chain.profit_per_unit * efficiency);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span>Supply Networks</span>
            <Badge className="bg-purple-600">{supplyChains.length} active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Weekly Profit</p>
              <p className="text-lg font-bold text-green-400">${totalWeeklyProfit.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Active Chains</p>
              <p className="text-lg font-bold text-cyan-400">{supplyChains.filter(c => c.is_active).length}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Disrupted</p>
              <p className="text-lg font-bold text-red-400">{supplyChains.filter(c => c.disruption_status !== 'operational').length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supply Chains */}
      {supplyChains.length > 0 && (
        <Card className="glass-panel border-cyan-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5" />
              Active Supply Chains
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplyChains.map((chain) => (
              <div key={chain.id} className="p-4 bg-slate-900/30 rounded-lg border border-cyan-500/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-semibold">{chain.chain_name}</h4>
                    <p className="text-xs text-gray-400">
                      {chain.source_territory} → {chain.destination_territory}
                    </p>
                  </div>
                  <Badge className={
                    chain.disruption_status === 'operational' ? 'bg-green-600' :
                    chain.disruption_status === 'disrupted' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }>
                    {chain.disruption_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Resource</p>
                    <p className="text-cyan-400 font-semibold">{chain.resource_type}</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Volume/Week</p>
                    <p className="text-green-400 font-semibold">{chain.weekly_volume}</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Profit/Unit</p>
                    <p className="text-purple-400 font-semibold">${chain.profit_per_unit}</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Risk</p>
                    <p className={`font-semibold ${chain.risk_level > 75 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {chain.risk_level}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Efficiency</span>
                      <span>{chain.efficiency}%</span>
                    </div>
                    <Progress value={chain.efficiency} className="h-2" />
                  </div>

                  {chain.disruption_status !== 'operational' && (
                    <div className="p-2 bg-yellow-900/20 border border-yellow-500/30 rounded flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-300">Supply chain is disrupted. Efficiency reduced.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create New Chain */}
      <Button
        onClick={() => setCreatingChain(!creatingChain)}
        className="w-full bg-cyan-600 hover:bg-cyan-700"
      >
        {creatingChain ? 'Cancel' : '+ Establish New Supply Chain'}
      </Button>

      {creatingChain && (
        <Card className="glass-panel border-cyan-500/30 p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            createChainMutation.mutate({
              chain_name: formData.get('chain_name'),
              source_territory: formData.get('source_territory'),
              destination_territory: formData.get('destination_territory'),
              resource_type: formData.get('resource_type'),
              weekly_volume: parseInt(formData.get('weekly_volume')),
              profit_per_unit: parseInt(formData.get('profit_per_unit'))
            });
          }} className="space-y-3">
            <input type="text" name="chain_name" placeholder="Chain name" required className="w-full p-2 rounded bg-slate-900 text-white text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select name="source_territory" required className="p-2 rounded bg-slate-900 text-white text-sm">
                <option>From Territory</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select name="destination_territory" required className="p-2 rounded bg-slate-900 text-white text-sm">
                <option>To Territory</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <input type="text" name="resource_type" placeholder="Resource type" required className="w-full p-2 rounded bg-slate-900 text-white text-sm" />
            <input type="number" name="weekly_volume" placeholder="Weekly volume" required className="w-full p-2 rounded bg-slate-900 text-white text-sm" />
            <input type="number" name="profit_per_unit" placeholder="Profit per unit" required className="w-full p-2 rounded bg-slate-900 text-white text-sm" />
            <Button type="submit" disabled={createChainMutation.isPending} className="w-full bg-green-600 hover:bg-green-700">
              Create Chain
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}