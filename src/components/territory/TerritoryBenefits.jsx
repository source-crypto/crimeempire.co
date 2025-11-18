import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, Shield, Users, DollarSign, Eye, Home, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const benefitIcons = {
  production_boost: TrendingUp,
  wanted_reduction: Shield,
  recruitment_bonus: Users,
  income_multiplier: DollarSign,
  intel_network: Eye,
  safe_house: Home
};

const benefitDescriptions = {
  production_boost: 'Increases production rates for all enterprises in this territory',
  wanted_reduction: 'Reduces wanted level gain from criminal activities',
  recruitment_bonus: 'Makes it easier to recruit new crew members',
  income_multiplier: 'Boosts all income generated from this territory',
  intel_network: 'Provides early warning of rival crew activities',
  safe_house: 'Reduces risk of getting caught during operations'
};

export default function TerritoryBenefits({ territoryId, canManage }) {
  const queryClient = useQueryClient();

  const { data: benefits = [] } = useQuery({
    queryKey: ['territoryBenefits', territoryId],
    queryFn: () => base44.entities.TerritoryBenefit.filter({ territory_id: territoryId }),
    enabled: !!territoryId
  });

  const { data: currentPlayer } = useQuery({
    queryKey: ['currentPlayer'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    }
  });

  const upgradeBenefitMutation = useMutation({
    mutationFn: async (benefit) => {
      const upgradeCost = benefit.upgrade_cost || Math.floor(benefit.level * 10000 * 1.5);
      
      if (currentPlayer.crypto_balance < upgradeCost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(currentPlayer.id, {
        crypto_balance: currentPlayer.crypto_balance - upgradeCost
      });

      await base44.entities.TerritoryBenefit.update(benefit.id, {
        level: benefit.level + 1,
        multiplier: benefit.multiplier + 0.1,
        upgrade_cost: Math.floor((benefit.level + 1) * 10000 * 1.5)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryBenefits', territoryId]);
      queryClient.invalidateQueries(['currentPlayer']);
      toast.success('Benefit upgraded successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upgrade benefit');
    }
  });

  const activateBenefitMutation = useMutation({
    mutationFn: async (benefitType) => {
      const activationCost = 25000;
      
      if (currentPlayer.crypto_balance < activationCost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(currentPlayer.id, {
        crypto_balance: currentPlayer.crypto_balance - activationCost
      });

      await base44.entities.TerritoryBenefit.create({
        territory_id: territoryId,
        benefit_type: benefitType,
        benefit_name: benefitType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: benefitDescriptions[benefitType],
        level: 1,
        multiplier: 1.1,
        upgrade_cost: 15000,
        maintenance_cost: 1000
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryBenefits', territoryId]);
      queryClient.invalidateQueries(['currentPlayer']);
      toast.success('Benefit activated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to activate benefit');
    }
  });

  const availableBenefitTypes = Object.keys(benefitDescriptions).filter(
    type => !benefits.some(b => b.benefit_type === type)
  );

  return (
    <div className="space-y-4">
      {/* Active Benefits */}
      {benefits.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white text-lg">Active Benefits</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {benefits.map((benefit) => {
              const Icon = benefitIcons[benefit.benefit_type] || TrendingUp;
              const levelProgress = (benefit.level / 5) * 100;
              const canUpgrade = benefit.level < 5;

              return (
                <div
                  key={benefit.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-900/30">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{benefit.benefit_name}</h4>
                        <p className="text-sm text-gray-400 mt-1">{benefit.description}</p>
                      </div>
                    </div>
                    <Badge className={benefit.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                      Level {benefit.level}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Multiplier: {benefit.multiplier.toFixed(1)}x</span>
                      <span>Maintenance: ${benefit.maintenance_cost}/day</span>
                    </div>
                    
                    <Progress value={levelProgress} className="h-2" />

                    {canManage && canUpgrade && (
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 mt-2"
                        onClick={() => upgradeBenefitMutation.mutate(benefit)}
                        disabled={upgradeBenefitMutation.isPending}
                      >
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Upgrade - ${(benefit.upgrade_cost || 15000).toLocaleString()}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Benefits */}
      {canManage && availableBenefitTypes.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white text-lg">Activate New Benefits</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableBenefitTypes.map((type) => {
                const Icon = benefitIcons[type];
                return (
                  <div
                    key={type}
                    className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-purple-900/30">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <h4 className="font-semibold text-white capitalize">
                        {type.replace(/_/g, ' ')}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      {benefitDescriptions[type]}
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => activateBenefitMutation.mutate(type)}
                      disabled={activateBenefitMutation.isPending}
                    >
                      Activate - $25,000
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}