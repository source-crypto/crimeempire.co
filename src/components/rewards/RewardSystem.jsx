import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Coins, TrendingUp, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function RewardSystem({ playerData }) {
  const [claiming, setClaiming] = useState(false);
  const queryClient = useQueryClient();

  const claimDailyRewardMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already claimed today
      const existing = await base44.entities.DailyReward.filter({
        player_email: playerData.created_by,
        reward_date: today
      });

      if (existing.length > 0) {
        throw new Error("Daily reward already claimed!");
      }

      // Get streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayReward = await base44.entities.DailyReward.filter({
        player_email: playerData.created_by,
        reward_date: yesterdayStr
      });

      const streakDays = yesterdayReward.length > 0 ? (yesterdayReward[0].streak_days + 1) : 1;
      const bonusMultiplier = Math.min(1 + (streakDays * 0.1), 2.0);
      
      const cryptoAmount = Math.floor(500 * bonusMultiplier);
      const buyPowerAmount = Math.floor(250 * bonusMultiplier);
      const xpAmount = Math.floor(100 * bonusMultiplier);

      // Create daily reward record
      await base44.entities.DailyReward.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        reward_date: today,
        crypto_amount: cryptoAmount,
        buy_power_amount: buyPowerAmount,
        experience_points: xpAmount,
        streak_days: streakDays,
        bonus_applied: bonusMultiplier > 1,
        claimed: true
      });

      // Create transaction record
      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: "daily_reward",
        amount: cryptoAmount,
        currency_type: "crypto",
        description: `Daily Reward - Day ${streakDays} Streak`,
        bonus_multiplier: bonusMultiplier
      });

      // Update player balances
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + cryptoAmount,
        buy_power: playerData.buy_power + buyPowerAmount,
        experience: (playerData.experience || 0) + xpAmount
      });

      return { cryptoAmount, buyPowerAmount, xpAmount, streakDays };
    },
    onSuccess: (data) => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      queryClient.invalidateQueries(['player']);
      setClaiming(false);
    },
    onError: (error) => {
      alert(error.message);
      setClaiming(false);
    }
  });

  const processReward = async (type, amount, description, sourceId = null) => {
    try {
      // Create transaction
      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: type,
        amount: amount,
        currency_type: "crypto",
        description: description,
        source_id: sourceId,
        source_type: type
      });

      // Update player balance
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + amount,
        total_earnings: (playerData.total_earnings || 0) + amount
      });

      queryClient.invalidateQueries(['player']);
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      return true;
    } catch (error) {
      console.error("Reward processing error:", error);
      return false;
    }
  };

  const handleClaimDaily = () => {
    setClaiming(true);
    claimDailyRewardMutation.mutate();
  };

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Gift className="w-5 h-5 text-purple-400" />
          Daily Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          className="p-6 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
        >
          <div className="text-center space-y-2">
            <Gift className="w-12 h-12 mx-auto" />
            <h3 className="text-2xl font-bold">Daily Login Reward</h3>
            <p className="text-sm opacity-90">Claim your daily bonus!</p>
            <div className="flex justify-center gap-4 mt-4">
              <div className="text-center">
                <Coins className="w-6 h-6 mx-auto mb-1" />
                <p className="text-lg font-bold">+500</p>
                <p className="text-xs opacity-75">Crypto</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-1" />
                <p className="text-lg font-bold">+250</p>
                <p className="text-xs opacity-75">Buy Power</p>
              </div>
              <div className="text-center">
                <Star className="w-6 h-6 mx-auto mb-1" />
                <p className="text-lg font-bold">+100</p>
                <p className="text-xs opacity-75">XP</p>
              </div>
            </div>
            <Button
              onClick={handleClaimDaily}
              disabled={claiming || claimDailyRewardMutation.isPending}
              className="mt-4 bg-white text-purple-600 hover:bg-purple-50 font-bold"
            >
              <Zap className="w-4 h-4 mr-2" />
              {claiming || claimDailyRewardMutation.isPending ? "Claiming..." : "Claim Reward"}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20">
            <p className="text-sm text-gray-400">Total Earned</p>
            <p className="text-2xl font-bold text-white">
              ${(playerData?.total_earnings || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20">
            <p className="text-sm text-gray-400">Current Balance</p>
            <p className="text-2xl font-bold text-purple-400">
              ${(playerData?.crypto_balance || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}