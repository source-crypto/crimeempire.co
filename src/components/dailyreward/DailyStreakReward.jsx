import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { sounds } from '@/utils/sounds';

const STREAK_REWARDS = [
  { day: 1, reward: 5000, type: 'cash', icon: '💵' },
  { day: 2, reward: 8000, type: 'cash', icon: '💵' },
  { day: 3, reward: 2000, type: 'crypto', icon: '💎' },
  { day: 4, reward: 15000, type: 'cash', icon: '💵' },
  { day: 5, reward: 5000, type: 'crypto', icon: '💎' },
  { day: 6, reward: 25000, type: 'cash', icon: '💰' },
  { day: 7, reward: 10000, type: 'crypto', icon: '🏆', special: true },
];

export default function DailyStreakReward({ playerData, onClose }) {
  const queryClient = useQueryClient();

  const { data: streakData } = useQuery({
    queryKey: ['streak', playerData?.id],
    queryFn: async () => {
      const res = await base44.entities.DailyStreak.filter({ player_id: playerData.id });
      return res[0] || null;
    },
    enabled: !!playerData?.id
  });

  const today = new Date().toDateString();
  const alreadyClaimed = streakData?.last_claimed_date === today;
  const currentStreak = streakData?.current_streak || 0;
  const dayIndex = Math.min((currentStreak % 7), 6);

  const claimReward = useMutation({
    mutationFn: async () => {
      if (alreadyClaimed) throw new Error('Already claimed today');
      const reward = STREAK_REWARDS[dayIndex];
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const lastClaimed = streakData?.last_claimed_date;
      const isConsecutive = lastClaimed === yesterday;
      const newStreak = isConsecutive ? currentStreak + 1 : 1;

      const update = {
        crypto_balance: reward.type === 'crypto'
          ? (playerData.crypto_balance || 0) + reward.reward
          : (playerData.crypto_balance || 0),
        buy_power: reward.type === 'cash'
          ? (playerData.buy_power || 0) + reward.reward
          : (playerData.buy_power || 0),
      };
      await base44.entities.Player.update(playerData.id, update);

      if (streakData) {
        await base44.entities.DailyStreak.update(streakData.id, {
          current_streak: newStreak,
          longest_streak: Math.max(streakData.longest_streak || 0, newStreak),
          last_claimed_date: today,
          total_claims: (streakData.total_claims || 0) + 1,
          claimed_today: true
        });
      } else {
        await base44.entities.DailyStreak.create({
          player_id: playerData.id,
          current_streak: 1,
          longest_streak: 1,
          last_claimed_date: today,
          total_claims: 1,
          claimed_today: true
        });
      }
      return reward;
    },
    onSuccess: (reward) => {
      sounds.levelUp();
      toast.success(`🎁 Day ${dayIndex + 1} reward claimed! +${reward.reward.toLocaleString()} ${reward.type}`);
      queryClient.invalidateQueries();
      setTimeout(onClose, 1500);
    },
    onError: (e) => toast.error(e.message)
  });

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel border border-orange-500/40 rounded-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">Daily Streak</h2>
          <p className="text-orange-400 font-semibold">🔥 {currentStreak} day streak</p>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-6">
          {STREAK_REWARDS.map((r, i) => {
            const claimed = i < dayIndex || (i === dayIndex && alreadyClaimed);
            const isToday = i === dayIndex && !alreadyClaimed;
            return (
              <div key={i} className={`rounded-lg p-2 text-center border ${
                claimed ? 'border-green-500/40 bg-green-900/20' :
                isToday ? 'border-orange-500 bg-orange-900/20 ring-1 ring-orange-500' :
                r.special ? 'border-yellow-500/40 bg-yellow-900/10' :
                'border-gray-700 opacity-60'
              }`}>
                <p className="text-lg">{r.icon}</p>
                <p className="text-[10px] text-gray-400">Day {r.day}</p>
                <p className="text-[10px] text-white font-bold">${(r.reward / 1000).toFixed(0)}k</p>
                {claimed && <p className="text-[10px] text-green-400">✓</p>}
              </div>
            );
          })}
        </div>

        {alreadyClaimed ? (
          <div className="text-center">
            <p className="text-green-400 font-semibold mb-3">✅ Claimed today! Come back tomorrow.</p>
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">Close</Button>
          </div>
        ) : (
          <Button className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg"
            onClick={() => claimReward.mutate()} disabled={claimReward.isPending}>
            <Gift className="w-5 h-5 mr-2" />
            {claimReward.isPending ? 'Claiming...' : `Claim Day ${dayIndex + 1} Reward`}
          </Button>
        )}
      </motion.div>
    </div>
  );
}