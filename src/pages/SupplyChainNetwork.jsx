import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplyChainNetwork() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: supplyChains = [] } = useQuery({
    queryKey: ['advancedSupplyChain', playerData?.id],
    queryFn: () => base44.entities.AdvancedSupplyChain.filter({ enterprise_id: playerData.id }),
    enabled: !!playerData
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const totalRevenue = supplyChains.reduce((sum, chain) => 
    sum + (chain.profit_per_unit * chain.weekly_volume), 0
  );

  const avgEfficiency = supplyChains.length > 0 
    ? supplyChains.reduce((sum, chain) => sum + chain.efficiency, 0) / supplyChains.length 
    : 0;

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Truck className="w-6 h-6 text-cyan-400" />
            Supply Chain Network
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Manage your distribution routes and logistics
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Active Routes</p>
            <p className="text-2xl font-bold text-cyan-400">{supplyChains.length}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Weekly Revenue</p>
            <p className="text-2xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Avg Efficiency</p>
            <p className="text-2xl font-bold text-purple-400">{avgEfficiency.toFixed(0)}%</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-yellow-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Territories</p>
            <p className="text-2xl font-bold text-yellow-400">{territories.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-cyan-500/20">
        <CardHeader className="border-b border-cyan-500/20">
          <CardTitle className="text-white">Your Supply Chains</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {supplyChains.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No supply chains established</p>
              <p className="text-sm text-gray-500 mt-2">Create enterprises to start building supply chains</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplyChains.map((chain) => (
                <div
                  key={chain.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-cyan-500/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{chain.chain_name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{chain.resource_type}</p>
                    </div>
                    <Badge className={
                      chain.disruption_status === 'operational' ? 'bg-green-600' :
                      chain.disruption_status === 'disrupted' ? 'bg-yellow-600' : 'bg-red-600'
                    }>
                      {chain.disruption_status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2 rounded bg-slate-900/50">
                      <p className="text-xs text-gray-400">Source</p>
                      <p className="text-sm text-cyan-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {chain.source_territory}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-slate-900/50">
                      <p className="text-xs text-gray-400">Destination</p>
                      <p className="text-sm text-cyan-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {chain.destination_territory}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Volume</p>
                      <p className="text-white font-semibold">{chain.weekly_volume}/wk</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Profit</p>
                      <p className="text-green-400 font-semibold">${chain.profit_per_unit}/unit</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Risk</p>
                      <p className={
                        chain.risk_level > 70 ? 'text-red-400' :
                        chain.risk_level > 40 ? 'text-yellow-400' : 'text-green-400'
                      }>
                        {chain.risk_level}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Efficiency</p>
                      <p className="text-purple-400 font-semibold">{chain.efficiency}%</p>
                    </div>
                  </div>

                  {chain.intermediate_points?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-cyan-500/20">
                      <p className="text-xs text-gray-400 mb-2">Route Waypoints:</p>
                      <div className="flex flex-wrap gap-1">
                        {chain.intermediate_points.map((point, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {point.location}
                          </Badge>
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
    </div>
  );
}