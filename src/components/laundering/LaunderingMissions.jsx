import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Clock, DollarSign, Trophy, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function LaunderingMissions({ playerData, businesses }) {
  const queryClient = useQueryClient();

  const { data: missions = [] } = useQuery({
    queryKey: ['launderingMissions'],
    queryFn: () => base44.entities.LaunderingMission.filter({ is_available: true })
  });

  const initMissionsMutation = useMutation({
    mutationFn: async () => {
      const defaultMissions = [
        {
          mission_name: 'High Roller Weekend',
          business_type_required: 'casino',
          difficulty: 'easy',
          dirty_money_amount: 100000,
          time_limit_hours: 48,
          reward_cash: 30000,
          reward_reputation: 10,
          risk_level: 30,
          description: 'Launder money through weekend high-stakes poker games'
        },
        {
          mission_name: 'Crypto Whale Transaction',
          business_type_required: 'crypto_exchange',
          difficulty: 'hard',
          dirty_money_amount: 500000,
          time_limit_hours: 24,
          reward_cash: 125000,
          reward_reputation: 30,
          risk_level: 70,
          description: 'Move large crypto volumes without triggering alerts',
          special_requirements: ['Efficiency > 80%', 'Suspicion < 50%']
        },
        {
          mission_name: 'Art Auction Cleanup',
          business_type_required: 'art_gallery',
          difficulty: 'medium',
          dirty_money_amount: 250000,
          time_limit_hours: 72,
          reward_cash: 75000,
          reward_reputation: 20,
          risk_level: 45,
          description: 'Clean money through fake art sales'
        },
        {
          mission_name: 'Real Estate Flip',
          business_type_required: 'real_estate',
          difficulty: 'medium',
          dirty_money_amount: 750000,
          time_limit_hours: 96,
          reward_cash: 200000,
          reward_reputation: 25,
          risk_level: 50,
          description: 'Launder through rapid property transactions'
        },
        {
          mission_name: 'VIP Club Night',
          business_type_required: 'nightclub',
          difficulty: 'easy',
          dirty_money_amount: 150000,
          time_limit_hours: 36,
          reward_cash: 45000,
          reward_reputation: 15,
          risk_level: 35,
          description: 'Clean cash through exclusive VIP events'
        }
      ];

      for (const mission of defaultMissions) {
        await base44.entities.LaunderingMission.create(mission);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingMissions']);
      toast.success('Missions loaded!');
    }
  });

  const executeMissionMutation = useMutation({
    mutationFn: async ({ mission, business }) => {
      if (mission.business_type_required !== 'any' && 
          business.business_type !== mission.business_type_required) {
        throw new Error('Wrong business type for this mission');
      }

      if (business.capacity_per_hour < mission.dirty_money_amount / mission.time_limit_hours) {
        throw new Error('Business capacity too low');
      }

      // Check special requirements
      if (mission.special_requirements?.includes('Efficiency > 80%') && business.efficiency < 80) {
        throw new Error('Efficiency too low');
      }
      if (mission.special_requirements?.includes('Suspicion < 50%') && business.suspicion_level >= 50) {
        throw new Error('Suspicion too high');
      }

      const successRoll = Math.random() * 100;
      const baseSuccessRate = 100 - mission.risk_level + (business.efficiency - 70);
      const success = successRoll < baseSuccessRate;

      if (success) {
        await base44.entities.Player.update(playerData.id, {
          balance: playerData.balance + mission.reward_cash,
          reputation: (playerData.reputation || 0) + mission.reward_reputation
        });

        await base44.entities.MoneyLaunderingBusiness.update(business.id, {
          clean_money_generated: business.clean_money_generated + mission.dirty_money_amount,
          suspicion_level: Math.min(100, business.suspicion_level + mission.risk_level / 10)
        });

        toast.success(`Mission success! +$${mission.reward_cash.toLocaleString()}`);
      } else {
        await base44.entities.MoneyLaunderingBusiness.update(business.id, {
          suspicion_level: Math.min(100, business.suspicion_level + mission.risk_level / 5)
        });

        await base44.entities.Player.update(playerData.id, {
          heat: Math.min(100, (playerData.heat || 0) + 10)
        });

        toast.error('Mission failed! Heat increased!');
      }

      await base44.entities.LaunderingMission.update(mission.id, {
        is_available: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingMissions']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white text-sm">
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              Specialized Operations
            </span>
            {missions.length === 0 && (
              <Button
                size="sm"
                onClick={() => initMissionsMutation.mutate()}
                disabled={initMissionsMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Load Missions
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          Execute high-stakes laundering operations for enhanced rewards
        </CardContent>
      </Card>

      {/* Missions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {missions.map(mission => {
          const compatibleBusinesses = businesses.filter(b => 
            mission.business_type_required === 'any' || b.business_type === mission.business_type_required
          );

          const difficultyColors = {
            easy: 'bg-green-600',
            medium: 'bg-yellow-600',
            hard: 'bg-orange-600',
            extreme: 'bg-red-600'
          };

          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="glass-panel border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white text-sm">
                    <span>{mission.mission_name}</span>
                    <Badge className={difficultyColors[mission.difficulty]}>
                      {mission.difficulty}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-xs text-gray-300">{mission.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-900/50 rounded">
                      <p className="text-gray-400">Amount</p>
                      <p className="text-yellow-400 font-semibold">${(mission.dirty_money_amount / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="p-2 bg-slate-900/50 rounded">
                      <p className="text-gray-400">Time Limit</p>
                      <p className="text-blue-400 font-semibold">{mission.time_limit_hours}h</p>
                    </div>
                    <div className="p-2 bg-slate-900/50 rounded">
                      <p className="text-gray-400">Reward</p>
                      <p className="text-green-400 font-semibold">${(mission.reward_cash / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="p-2 bg-slate-900/50 rounded">
                      <p className="text-gray-400">Risk</p>
                      <p className="text-red-400 font-semibold">{mission.risk_level}%</p>
                    </div>
                  </div>

                  {/* Requirements */}
                  {mission.special_requirements?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-gray-400 text-[10px]">Requirements:</p>
                      {mission.special_requirements.map((req, idx) => (
                        <Badge key={idx} className="bg-slate-700 text-[10px] mr-1">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Business Type */}
                  <div className="p-2 bg-blue-900/20 rounded border border-blue-500/30">
                    <p className="text-blue-400 text-[10px] uppercase font-semibold">
                      Requires: {mission.business_type_required.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {/* Execute */}
                  {compatibleBusinesses.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        className="w-full px-2 py-1.5 bg-slate-800 text-white rounded text-xs"
                        onChange={(e) => {
                          const business = compatibleBusinesses.find(b => b.id === e.target.value);
                          if (business) {
                            executeMissionMutation.mutate({ mission, business });
                          }
                        }}
                      >
                        <option value="">Select Business to Execute</option>
                        {compatibleBusinesses.map(b => (
                          <option key={b.id} value={b.id}>{b.business_name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-red-400 text-xs">No compatible businesses</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}