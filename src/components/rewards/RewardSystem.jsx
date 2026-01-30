import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coins, TrendingUp, Gift, Star, Zap, DollarSign, 
  CheckCircle, Clock, Trophy, Sparkles 
} from "lucide-react";

export default function RewardSystem({ playerData }) {
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: pendingRewards = [] } = useQuery({
    queryKey: ['pendingRewards', playerData?.id],
    queryFn: () => base44.entities.Reward.filter({
      player_id: playerData.id,
      status: 'pending'
    }),
    enabled: !!playerData?.id,
    refetchInterval: 5000
  });

  const { data: passiveIncomes = [] } = useQuery({
    queryKey: ['passiveIncome', playerData?.id],
    queryFn: () => base44.entities.PassiveIncome.filter({
      player_id: playerData.id,
      is_active: true
    }),
    enabled: !!playerData?.id,
    refetchInterval: 10000
  });

  const { data: dailyReward } = useQuery({
    queryKey: ['dailyReward', playerData?.id],
    queryFn: async () => {
      const rewards = await base44.entities.DailyReward.filter({
        player_id: playerData.id
      });
      return rewards[0];
    },
    enabled: !!playerData?.id
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (reward) => {
      const cryptoAmount = reward.crypto_amount || 0;
      const cashAmount = reward.cash_amount || 0;
      const expAmount = reward.experience_points || 0;

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + cryptoAmount,
        buy_power: (playerData.buy_power || 0) + cashAmount,
        experience: (playerData.experience || 0) + expAmount,
        total_earnings: (playerData.total_earnings || 0) + cryptoAmount + cashAmount
      });

      await base44.entities.Reward.update(reward.id, {
        status: 'claimed',
        claimed_at: new Date().toISOString()
      });

      return { cryptoAmount, cashAmount, expAmount };
    },
    onSuccess: () => {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      queryClient.invalidateQueries(['pendingRewards']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const claimDailyRewardMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastClaim = dailyReward?.last_claim_date;
      
      let newStreak = 1;
      let multiplier = 1;
      
      if (lastClaim) {
        const lastDate = new Date(lastClaim);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak = (dailyReward.day_streak || 0) + 1;
          multiplier = Math.min(1 + (newStreak * 0.1), 3);
        }
      }

      const baseAmount = 1000;
      const rewardAmount = Math.floor(baseAmount * multiplier);

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + rewardAmount,
        total_earnings: (playerData.total_earnings || 0) + rewardAmount
      });

      if (dailyReward) {
        await base44.entities.DailyReward.update(dailyReward.id, {
          day_streak: newStreak,
          last_claim_date: today,
          total_claimed: (dailyReward.total_claimed || 0) + rewardAmount,
          bonus_multiplier: multiplier
        });
      } else {
        await base44.entities.DailyReward.create({
          player_id: playerData.id,
          day_streak: 1,
          last_claim_date: today,
          total_claimed: rewardAmount,
          bonus_multiplier: 1
        });
      }

      return { rewardAmount, newStreak };
    },
    onSuccess: () => {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      queryClient.invalidateQueries(['dailyReward']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const collectPassiveIncomeMutation = useMutation({
    mutationFn: async () => {
      let totalCollected = 0;

      for (const income of passiveIncomes) {
        const lastCollection = new Date(income.last_collection || income.created_date);
        const now = new Date();
        const hoursElapsed = (now - lastCollection) / (1000 * 60 * 60);
        const accumulated = Math.floor(hoursElapsed * income.income_rate);

        if (accumulated > 0) {
          totalCollected += accumulated;
          await base44.entities.PassiveIncome.update(income.id, {
            last_collection: now.toISOString(),
            accumulated_amount: 0
          });
        }
      }

      if (totalCollected > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: (playerData.crypto_balance || 0) + totalCollected,
          total_earnings: (playerData.total_earnings || 0) + totalCollected
        });
      }

      return totalCollected;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['passiveIncome']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const totalPendingCrypto = pendingRewards.reduce((sum, r) => sum + (r.crypto_amount || 0), 0);
  const totalPendingCash = pendingRewards.reduce((sum, r) => sum + (r.cash_amount || 0), 0);

  const canClaimDaily = () => {
    if (!dailyReward) return true;
    const today = new Date().toISOString().split('T')[0];
    return dailyReward.last_claim_date !== today;
  };

  const totalPassiveIncome = passiveIncomes.reduce((sum, inc) => {
    const lastCollection = new Date(inc.last_collection || inc.created_date);
    const now = new Date();
    const hoursElapsed = (now - lastCollection) / (1000 * 60 * 60);
    return sum + Math.floor(hoursElapsed * inc.income_rate);
  }, 0);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-8 rounded-2xl shadow-2xl text-center">
              <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white">Reward Claimed!</h2>
              <p className="text-white/90 mt-2">Keep up the great work!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Reward */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gift className="w-5 h-5 text-amber-400" />
              Daily Reward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Streak</span>
                  <span className="font-bold text-amber-400">
                    {dailyReward?.day_streak || 0} days
                  </span>
                </div>
                <Progress 
                  value={((dailyReward?.day_streak || 0) % 7) * (100/7)} 
                  className="h-2"
                />
              </div>
              <Button
                onClick={() => claimDailyRewardMutation.mutate()}
                disabled={!canClaimDaily() || claimDailyRewardMutation.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                {canClaimDaily() ? (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Claim ${dailyReward?.next_reward_amount || 1000}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Claimed Today
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Rewards */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Trophy className="w-5 h-5 text-purple-400" />
              Pending Rewards
              {pendingRewards.length > 0 && (
                <Badge className="ml-auto bg-purple-600">{pendingRewards.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Total Crypto</span>
                <span className="font-bold text-purple-400">${totalPendingCrypto.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Total Cash</span>
                <span className="font-bold text-green-400">${totalPendingCash.toLocaleString()}</span>
              </div>
              {pendingRewards.length > 0 && (
                <Button
                  onClick={() => {
                    pendingRewards.forEach(reward => claimRewardMutation.mutate(reward));
                  }}
                  disabled={claimRewardMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Claim All ({pendingRewards.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Passive Income */}
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Passive Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Sources Active</span>
                <span className="font-bold text-green-400">{passiveIncomes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Accumulated</span>
                <span className="font-bold text-green-400">${totalPassiveIncome.toLocaleString()}</span>
              </div>
              {totalPassiveIncome > 0 && (
                <Button
                  onClick={() => collectPassiveIncomeMutation.mutate()}
                  disabled={collectPassiveIncomeMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Collect ${totalPassiveIncome.toLocaleString()}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Rewards */}
      {pendingRewards.length > 0 && (
        <Card className="glass-panel border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Available Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pendingRewards.map((reward) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-semibold text-white capitalize">
                      {reward.reward_type.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-sm text-slate-400">{reward.source_name || 'Reward'}</p>
                    <div className="flex gap-3 mt-2">
                      {reward.crypto_amount > 0 && (
                        <span className="text-sm text-purple-400">
                          <Coins className="w-3 h-3 inline mr-1" />
                          ${reward.crypto_amount.toLocaleString()}
                        </span>
                      )}
                      {reward.experience_points > 0 && (
                        <span className="text-sm text-blue-400">
                          <Zap className="w-3 h-3 inline mr-1" />
                          {reward.experience_points} XP
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => claimRewardMutation.mutate(reward)}
                    disabled={claimRewardMutation.isPending}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Claim
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}