import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, TrendingUp, Package, AlertTriangle } from 'lucide-react';

export default function ProductionManagement() {
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

  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }),
    enabled: !!playerData
  });

  const { data: productionChains = [] } = useQuery({
    queryKey: ['productionChains', playerData?.id],
    queryFn: () => base44.entities.ProductionChain.filter({ owner_id: playerData.id }),
    enabled: !!playerData
  });

  const totalProduction = enterprises.reduce((sum, ent) => sum + (ent.production_rate || 0), 0);
  const totalStock = enterprises.reduce((sum, ent) => sum + (ent.current_stock || 0), 0);
  const avgEfficiency = productionChains.length > 0
    ? productionChains.reduce((sum, chain) => sum + (chain.efficiency || 100), 0) / productionChains.length
    : 100;

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Factory className="w-6 h-6 text-orange-400" />
            Production Management
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Oversee your criminal production operations
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Active Enterprises</p>
            <p className="text-2xl font-bold text-orange-400">{enterprises.length}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Production Rate</p>
            <p className="text-2xl font-bold text-cyan-400">{totalProduction}/hr</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Total Stock</p>
            <p className="text-2xl font-bold text-green-400">{totalStock}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Efficiency</p>
            <p className="text-2xl font-bold text-purple-400">{avgEfficiency.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-orange-500/20">
        <CardHeader className="border-b border-orange-500/20">
          <CardTitle className="text-white">Production Facilities</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {enterprises.length === 0 ? (
            <div className="text-center py-8">
              <Factory className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No production facilities</p>
              <p className="text-sm text-gray-500 mt-2">Create enterprises to start production</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enterprises.map((enterprise) => (
                <div
                  key={enterprise.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-orange-500/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{enterprise.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{enterprise.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge className={enterprise.is_active ? 'bg-green-600' : 'bg-red-600'}>
                      {enterprise.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-gray-400">Production</p>
                      <p className="text-cyan-400 font-semibold">{enterprise.production_rate}/hr</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Stock</p>
                      <p className="text-green-400 font-semibold">
                        {enterprise.current_stock}/{enterprise.storage_capacity}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Heat</p>
                      <p className={
                        enterprise.heat_level > 70 ? 'text-red-400' :
                        enterprise.heat_level > 40 ? 'text-yellow-400' : 'text-green-400'
                      }>
                        {enterprise.heat_level}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Level {enterprise.level}</span>
                    <span className="text-green-400 font-semibold">
                      Revenue: ${enterprise.total_revenue?.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {productionChains.length > 0 && (
        <Card className="glass-panel border-cyan-500/20">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="text-white">Production Chains</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {productionChains.map((chain) => (
                <div
                  key={chain.id}
                  className="p-3 rounded-lg bg-slate-900/30 border border-cyan-500/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">{chain.chain_name}</h4>
                      <p className="text-xs text-gray-400">
                        {chain.input_resource} → {chain.output_resource}
                      </p>
                    </div>
                    <Badge className="bg-purple-600">
                      Efficiency: {chain.efficiency}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}