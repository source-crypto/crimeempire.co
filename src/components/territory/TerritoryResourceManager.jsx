import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Package, TrendingUp, Truck, Factory, Coins, 
  ArrowRightLeft, Loader2, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

export default function TerritoryResourceManager({ territory, playerData }) {
  const queryClient = useQueryClient();
  const [harvestAmount, setHarvestAmount] = useState(100);

  const { data: deposits = [] } = useQuery({
    queryKey: ['materialDeposits', territory.id],
    queryFn: () => base44.entities.MaterialDeposit.filter({ territory_id: territory.id }),
    enabled: !!territory?.id
  });

  const { data: contrabandCaches = [] } = useQuery({
    queryKey: ['contrabandCaches', territory.id],
    queryFn: () => base44.entities.ContrabandCache.filter({ territory_id: territory.id }),
    enabled: !!territory?.id
  });

  const harvestResourceMutation = useMutation({
    mutationFn: async ({ depositId, amount }) => {
      const deposit = deposits.find(d => d.id === depositId);
      if (!deposit) throw new Error('Deposit not found');
      if (deposit.quantity < amount) throw new Error('Insufficient resources');

      const harvestValue = amount * (deposit.value_per_unit || 10);

      await base44.entities.MaterialDeposit.update(depositId, {
        quantity: deposit.quantity - amount,
        extraction_count: (deposit.extraction_count || 0) + 1
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + harvestValue
      });

      return { amount, value: harvestValue, type: deposit.resource_type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['materialDeposits']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Harvested ${data.amount} ${data.type} for $${data.value.toLocaleString()}`);
    },
    onError: (error) => toast.error(error.message)
  });

  const collectContrabandMutation = useMutation({
    mutationFn: async (cacheId) => {
      const cache = contrabandCaches.find(c => c.id === cacheId);
      if (!cache) throw new Error('Cache not found');

      const value = cache.estimated_value || 5000;

      await base44.entities.ContrabandCache.update(cacheId, {
        status: 'collected',
        collected_by: playerData.id
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + value
      });

      return { value, type: cache.contraband_type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['contrabandCaches']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Collected ${data.type} for $${data.value.toLocaleString()}`);
    },
    onError: (error) => toast.error(error.message)
  });

  const totalResourceValue = deposits.reduce((sum, d) => 
    sum + (d.quantity * (d.value_per_unit || 10)), 0
  );

  const activeContrabandValue = contrabandCaches
    .filter(c => c.status === 'hidden' || c.status === 'active')
    .reduce((sum, c) => sum + (c.estimated_value || 0), 0);

  return (
    <div className="space-y-4">
      {/* Resource Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Resource Value</p>
                <p className="text-xl font-bold text-white">${totalResourceValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Material Deposits</p>
                <p className="text-xl font-bold text-white">{deposits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-600 to-orange-600">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Contraband Value</p>
                <p className="text-xl font-bold text-white">${activeContrabandValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Material Deposits */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Factory className="w-5 h-5 text-green-400" />
            Material Deposits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {deposits.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No material deposits found</p>
          ) : (
            <div className="space-y-3">
              {deposits.map((deposit) => (
                <div key={deposit.id} className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold capitalize">{deposit.resource_type}</h4>
                      <p className="text-sm text-gray-400">
                        {deposit.quantity} units • ${deposit.value_per_unit}/unit
                      </p>
                    </div>
                    <Badge className={`${
                      deposit.quality === 'high' ? 'bg-green-600' :
                      deposit.quality === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {deposit.quality} quality
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Remaining</span>
                      <span>{deposit.quantity} / {deposit.max_quantity}</span>
                    </div>
                    <Progress 
                      value={(deposit.quantity / deposit.max_quantity) * 100} 
                      className="h-1.5" 
                    />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={deposit.quantity}
                      value={harvestAmount}
                      onChange={(e) => setHarvestAmount(parseInt(e.target.value) || 0)}
                      className="bg-slate-900/50 border-purple-500/20 text-white"
                      placeholder="Amount"
                    />
                    <Button
                      onClick={() => harvestResourceMutation.mutate({ 
                        depositId: deposit.id, 
                        amount: Math.min(harvestAmount, deposit.quantity) 
                      })}
                      disabled={harvestResourceMutation.isPending || deposit.quantity === 0}
                      className="bg-gradient-to-r from-green-600 to-emerald-600"
                    >
                      {harvestResourceMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Harvest'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contraband Caches */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-yellow-400" />
            Contraband Caches
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {contrabandCaches.filter(c => c.status !== 'collected').length === 0 ? (
            <p className="text-gray-400 text-center py-8">No active contraband caches</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contrabandCaches
                .filter(c => c.status !== 'collected')
                .map((cache) => (
                  <div key={cache.id} className="p-4 rounded-lg bg-slate-900/30 border border-yellow-500/20">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-semibold capitalize">{cache.contraband_type}</h4>
                        <p className="text-sm text-gray-400">{cache.quantity} units</p>
                      </div>
                      <Badge className={`${
                        cache.risk_level > 70 ? 'bg-red-600' :
                        cache.risk_level > 40 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}>
                        Risk: {cache.risk_level}
                      </Badge>
                    </div>

                    <div className="mb-3 p-2 rounded bg-slate-900/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Estimated Value</span>
                        <span className="text-green-400 font-semibold">
                          ${cache.estimated_value?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => collectContrabandMutation.mutate(cache.id)}
                      disabled={collectContrabandMutation.isPending}
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600"
                    >
                      {collectContrabandMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        'Collect'
                      )}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Trend Chart */}
      {revenueHistory.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Territory Revenue Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                <p className="text-xs text-gray-400 mb-1">Peak Daily Revenue</p>
                <p className="text-xl font-bold text-green-400">
                  ${Math.max(...revenueHistory.map(d => d.revenue)).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                <p className="text-xs text-gray-400 mb-1">Average Daily</p>
                <p className="text-xl font-bold text-cyan-400">
                  ${Math.floor(revenueHistory.reduce((sum, d) => sum + d.revenue, 0) / revenueHistory.length).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                <p className="text-xs text-gray-400 mb-1">7-Day Total</p>
                <p className="text-xl font-bold text-purple-400">
                  ${revenueHistory.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}