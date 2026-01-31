import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Settings, Zap, Sliders } from 'lucide-react';
import { toast } from 'sonner';

export default function BusinessManagementUI({ enterprise, playerData }) {
  const queryClient = useQueryClient();
  const [expandedSection, setExpandedSection] = useState(null);
  const [priceMultiplier, setPriceMultiplier] = useState(enterprise.price_multiplier || 1);
  const [targetProduction, setTargetProduction] = useState(enterprise.production_rate);

  const upgradeMutation = useMutation({
    mutationFn: async (upgradeType) => {
      const costs = {
        production: 5000,
        efficiency: 4000,
        automation: 8000,
        quality: 3000,
        capacity: 6000
      };

      if (playerData.crypto_balance < costs[upgradeType]) {
        throw new Error('Insufficient funds');
      }

      const updates = {
        production: { production_rate: (enterprise.production_rate || 0) + 50 },
        efficiency: { efficiency: Math.min(100, (enterprise.efficiency || 70) + 10) },
        automation: { automation_level: Math.min(100, (enterprise.automation_level || 0) + 15) },
        quality: { quality_rating: Math.min(100, (enterprise.quality_rating || 70) + 5) },
        capacity: { storage_capacity: (enterprise.storage_capacity || 1000) * 1.2 }
      };

      await base44.entities.CriminalEnterprise.update(enterprise.id, updates[upgradeType]);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - costs[upgradeType]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterprises']);
      queryClient.invalidateQueries(['player']);
      toast.success('Upgrade complete!');
    },
    onError: (error) => toast.error(error.message)
  });

  const priceAdjustMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CriminalEnterprise.update(enterprise.id, {
        price_multiplier: priceMultiplier
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterprises']);
      toast.success('Price adjusted!');
    }
  });

  const productionAdjustMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CriminalEnterprise.update(enterprise.id, {
        target_production: targetProduction
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterprises']);
      toast.success('Production target set!');
    }
  });

  const stats = [
    { label: 'Production Rate', value: `${enterprise.production_rate || 0}/hr`, color: 'cyan' },
    { label: 'Efficiency', value: `${enterprise.efficiency || 70}%`, color: 'green' },
    { label: 'Quality', value: `${enterprise.quality_rating || 70}/100`, color: 'purple' },
    { label: 'Automation', value: `${enterprise.automation_level || 0}%`, color: 'blue' }
  ];

  const upgrades = [
    { id: 'production', name: 'Boost Production', desc: 'Increase output by 50/hr', cost: 5000 },
    { id: 'efficiency', name: 'Improve Efficiency', desc: '+10% efficiency', cost: 4000 },
    { id: 'automation', name: 'Automate Operations', desc: '+15% automation', cost: 8000 },
    { id: 'quality', name: 'Quality Control', desc: '+5 quality', cost: 3000 },
    { id: 'capacity', name: 'Expand Storage', desc: '+20% capacity', cost: 6000 }
  ];

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`p-3 bg-slate-900/50 rounded-lg border border-${stat.color}-500/20`}>
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-lg font-bold text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Production Management */}
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader 
          onClick={() => setExpandedSection(expandedSection === 'production' ? null : 'production')}
          className="cursor-pointer border-b border-cyan-500/20"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-cyan-400" />
              Production Management
            </CardTitle>
            <Badge className="bg-cyan-600">{enterprise.production_rate || 0}/hr</Badge>
          </div>
        </CardHeader>
        
        {expandedSection === 'production' && (
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Current Target: {targetProduction}/hr</label>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={targetProduction}
                onChange={(e) => setTargetProduction(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => productionAdjustMutation.mutate()}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  disabled={productionAdjustMutation.isPending}
                >
                  Set Target
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-400">Production Capacity</p>
              <Progress value={(enterprise.production_rate / 500) * 100} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Price Management */}
      <Card className="glass-panel border-green-500/30">
        <CardHeader 
          onClick={() => setExpandedSection(expandedSection === 'price' ? null : 'price')}
          className="cursor-pointer border-b border-green-500/20"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Price Management
            </CardTitle>
            <Badge className="bg-green-600">{priceMultiplier.toFixed(2)}x</Badge>
          </div>
        </CardHeader>

        {expandedSection === 'price' && (
          <CardContent className="space-y-4 pt-4">
            <div className="bg-slate-900/30 p-3 rounded-lg border border-green-500/20">
              <p className="text-xs text-gray-400 mb-2">Adjust Price Multiplier</p>
              <p className="text-sm text-white mb-3">Current: <span className="text-green-400 font-bold">{priceMultiplier.toFixed(2)}x</span></p>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={priceMultiplier}
                onChange={(e) => setPriceMultiplier(parseFloat(e.target.value))}
                className="w-full mb-3"
              />
              <p className="text-xs text-gray-500 mb-3">
                {priceMultiplier < 1 ? '📉 Lower prices = Higher demand' : 
                 priceMultiplier > 1.5 ? '⚠️ High prices = Lower demand' : 
                 '✓ Balanced pricing'}
              </p>
              <Button
                size="sm"
                onClick={() => priceAdjustMutation.mutate()}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={priceAdjustMutation.isPending}
              >
                Apply Price
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Upgrades */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="w-5 h-5 text-purple-400" />
            Available Upgrades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upgrades.map((upgrade) => {
              const canAfford = playerData.crypto_balance >= upgrade.cost;
              return (
                <div key={upgrade.id} className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{upgrade.name}</h4>
                      <p className="text-xs text-gray-400">{upgrade.desc}</p>
                    </div>
                    <Badge className="text-xs">${upgrade.cost.toLocaleString()}</Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => upgradeMutation.mutate(upgrade.id)}
                    disabled={!canAfford || upgradeMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700 h-8 text-xs"
                  >
                    {canAfford ? 'Upgrade' : 'Insufficient Funds'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Operations Info */}
      <Card className="glass-panel border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white text-sm">Operations Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Heat Level:</span>
            <span className={enterprise.heat_level > 50 ? 'text-red-400' : 'text-yellow-400'}>
              {enterprise.heat_level || 0}%
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Storage Used:</span>
            <span className="text-cyan-400">{((enterprise.current_stock || 0) / (enterprise.storage_capacity || 1000) * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Hourly Revenue:</span>
            <span className="text-green-400">${((enterprise.production_rate || 0) * (enterprise.price_multiplier || 1) * 10).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}