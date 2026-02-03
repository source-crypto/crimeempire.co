import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, Shield, Users, Zap, Building2, Radio, 
  DollarSign, Lock, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

const upgradeTypes = {
  infrastructure: {
    icon: Building2,
    label: 'Infrastructure',
    description: 'Improve revenue generation',
    baseEffect: 'Revenue +25%',
    color: 'from-green-600 to-emerald-600',
    costMultiplier: 1.5
  },
  defense: {
    icon: Shield,
    label: 'Defense Systems',
    description: 'Harder to capture',
    baseEffect: 'Defense +30%',
    color: 'from-blue-600 to-cyan-600',
    costMultiplier: 1.8
  },
  population: {
    icon: Users,
    label: 'Population Control',
    description: 'Increase control percentage',
    baseEffect: 'Control +10%',
    color: 'from-purple-600 to-pink-600',
    costMultiplier: 1.3
  },
  surveillance: {
    icon: Radio,
    label: 'Surveillance Network',
    description: 'Early battle warnings',
    baseEffect: '+2hr prep time',
    color: 'from-yellow-600 to-orange-600',
    costMultiplier: 1.4
  },
  smuggling: {
    icon: Zap,
    label: 'Smuggling Routes',
    description: 'Faster supply transport',
    baseEffect: 'Route speed +40%',
    color: 'from-red-600 to-pink-600',
    costMultiplier: 1.6
  },
  vault: {
    icon: Lock,
    label: 'Secure Vault',
    description: 'Protect revenue from raids',
    baseEffect: 'Protection +50%',
    color: 'from-slate-600 to-gray-700',
    costMultiplier: 2.0
  }
};

export default function TerritoryUpgradeSystem({ territory, playerData, crewData }) {
  const queryClient = useQueryClient();

  const upgradeTerritoryMutation = useMutation({
    mutationFn: async (upgradeType) => {
      const config = upgradeTypes[upgradeType];
      const baseCost = 25000 * ((territory.tier || 1) + 1);
      const cost = Math.floor(baseCost * config.costMultiplier);

      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      let updateData = { tier: (territory.tier || 1) + 1 };

      switch(upgradeType) {
        case 'infrastructure':
          updateData.revenue_multiplier = (territory.revenue_multiplier || 1.0) * 1.25;
          break;
        case 'defense':
          updateData.defense_rating = (territory.defense_rating || 50) * 1.3;
          break;
        case 'population':
          updateData.control_percentage = Math.min(100, (territory.control_percentage || 50) + 10);
          break;
        case 'surveillance':
          updateData.surveillance_level = (territory.surveillance_level || 0) + 1;
          break;
        case 'smuggling':
          updateData.smuggling_efficiency = (territory.smuggling_efficiency || 100) * 1.4;
          break;
        case 'vault':
          updateData.vault_security = (territory.vault_security || 0) + 50;
          break;
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      await base44.entities.Territory.update(territory.id, updateData);

      return { upgradeType, cost };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['territories']);
      queryClient.invalidateQueries(['player']);
      toast.success(`${upgradeTypes[data.upgradeType].label} upgraded!`);
    },
    onError: (error) => toast.error(error.message)
  });

  const currentTier = territory.tier || 1;

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white flex items-center justify-between">
          <span>Territory Upgrades</span>
          <Badge className="bg-gradient-to-r from-purple-600 to-cyan-600">
            Tier {currentTier}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300 text-sm">Territory Development</span>
            <span className="text-white font-semibold">Level {currentTier}/10</span>
          </div>
          <Progress value={(currentTier / 10) * 100} className="h-2 mb-2" />
          <div className="text-xs text-gray-400 mt-2">
            Higher tiers unlock better upgrades and bonuses
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(upgradeTypes).map(([type, config]) => {
            const Icon = config.icon;
            const baseCost = 25000 * (currentTier + 1);
            const cost = Math.floor(baseCost * config.costMultiplier);
            const canAfford = playerData?.crypto_balance >= cost;

            return (
              <div 
                key={type} 
                className={`p-4 rounded-lg border transition-all ${
                  canAfford 
                    ? 'bg-slate-900/30 border-purple-500/20 hover:border-purple-500/40' 
                    : 'bg-slate-900/10 border-gray-700/20 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm mb-1">{config.label}</h4>
                    <p className="text-xs text-gray-400 mb-2">{config.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {config.baseEffect}
                    </Badge>
                  </div>
                </div>

                <Button
                  size="sm"
                  className={`w-full bg-gradient-to-r ${config.color}`}
                  onClick={() => upgradeTerritoryMutation.mutate(type)}
                  disabled={upgradeTerritoryMutation.isPending || !canAfford}
                >
                  {upgradeTerritoryMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  ${cost.toLocaleString()}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}