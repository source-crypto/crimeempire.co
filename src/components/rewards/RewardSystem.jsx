import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, TrendingUp, Calendar, Star, Zap } from 'lucide-react';

export default function RewardSystem({ playerData }) {
  const queryClient = useQueryClient();

  const { data: dailyReward } = useQuery({
    queryKey: ['dailyReward', playerData?.id],
    queryFn: async () => {
      const rewards = await base44.entities.DailyReward.filter({ player_id: playerData.id });
      return rewards[0];
    },
    enabled: !!playerData?.id
  });

  const claimDailyReward = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastClaim = dailyReward?.claimed_at ? new Date(dailyReward.claimed_at).toISOString().split('T')[0] : null;
      
      let newStreak = 1;
      let dayNumber = 1;
      
      if (lastClaim) {
        const daysSince = Math.floor((new Date(today) - new Date(lastClaim)) / (1000 * 60 * 60 * 24));
        if (daysSince === 1) {
          newStreak = (dailyReward.streak_days || 0) + 1;
          dayNumber = (dailyReward.day_number % 7) + 1;
        } else if (daysSince > 1) {
          newStreak = 1;
          dayNumber = 1;
        }
      }

      const baseReward = 5000 * dayNumber;
      const bonusMultiplier = 1 + (newStreak * 0.1);
      const totalReward = Math.floor(baseReward * bonusMultiplier);

      if (dailyReward) {
        await base44.entities.DailyReward.update(dailyReward.id, {
          day_number: dayNumber,
          crypto_reward: totalReward,
          experience_reward: 100 * dayNumber,
          bonus_multiplier: bonusMultiplier,
          claimed_at: new Date().toISOString(),
          streak_days: newStreak,
          is_claimed_today: true
        });
      } else {
        await base44.entities.DailyReward.create({
          player_id: playerData.id,
          day_number: 1,
          crypto_reward: 5000,
          experience_reward: 100,
          bonus_multiplier: 1,
          claimed_at: new Date().toISOString(),
          streak_days: 1,
          is_claimed_today: true
        });
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + totalReward,
        experience: (playerData.experience || 0) + (100 * dayNumber)
      });

      return { reward: totalReward, streak: newStreak };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyReward']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const canClaim = () => {
    if (!dailyReward) return true;
    const today = new Date().toISOString().split('T')[0];
    const lastClaim = dailyReward.claimed_at ? new Date(dailyReward.claimed_at).toISOString().split('T')[0] : null;
    return today !== lastClaim;
  };

  return (
    <Card className="glass-panel border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Gift className="w-5 h-5 text-purple-400" />
          Daily Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isClaimed = dailyReward && dailyReward.day_number >= day && dailyReward.is_claimed_today;
            const isCurrent = dailyReward?.day_number === day;
            
            return (
              <div
                key={day}
                className={`p-3 rounded-lg text-center ${
                  isClaimed
                    ? 'bg-green-600/30 border-green-500/50'
                    : isCurrent
                    ? 'bg-purple-600/30 border-purple-500/50 ring-2 ring-purple-500'
                    : 'bg-slate-800/50 border-slate-700/50'
                } border-2`}
              >
                <div className="text-xs text-gray-400">Day {day}</div>
                <div className="text-sm font-bold text-white">${(5000 * day).toLocaleString()}</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-semibold">Current Streak</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {dailyReward?.streak_days || 0} days
            </div>
          </div>
          <Button
            onClick={() => claimDailyReward.mutate()}
            disabled={!canClaim() || claimDailyReward.isPending}
            className="bg-gradient-to-r from-purple-600 to-cyan-600"
          >
            <Zap className="w-4 h-4 mr-2" />
            {canClaim() ? 'Claim Reward' : 'Claimed Today'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}