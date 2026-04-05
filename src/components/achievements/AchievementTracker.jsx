import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { sounds } from '@/utils/sounds';

export const ACHIEVEMENT_DEFS = [
  { key: 'first_blood', title: 'First Blood', desc: 'Complete your first raid', icon: '🩸', xp: 200, cash: 5000, rarity: 'common', check: (p) => (p.stats?.heists_completed || 0) + (p.stats?.contracts_completed || 0) > 0 },
  { key: 'kingpin', title: 'Kingpin', desc: 'Accumulate $1,000,000 total', icon: '👑', xp: 1000, cash: 50000, rarity: 'legendary', check: (p) => (p.total_earnings || 0) >= 1000000 },
  { key: 'untouchable', title: 'Untouchable', desc: 'Stay at Heat Level 0', icon: '🕊️', xp: 500, cash: 10000, rarity: 'rare', check: (p) => (p.wanted_level || 0) === 0 && (p.level || 1) >= 5 },
  { key: 'crew_boss', title: 'Crew Boss', desc: 'Lead a crew', icon: '🎖️', xp: 300, cash: 15000, rarity: 'rare', check: (p) => p.crew_role === 'boss' },
  { key: 'empire_builder', title: 'Empire Builder', desc: 'Own 3+ enterprises', icon: '🏭', xp: 400, cash: 20000, rarity: 'epic', check: (p, extra) => (extra?.enterpriseCount || 0) >= 3 },
  { key: 'territory_lord', title: 'Territory Lord', desc: 'Control 3+ city sectors', icon: '🗺️', xp: 500, cash: 25000, rarity: 'epic', check: (p) => (p.territory_count || 0) >= 3 },
  { key: 'market_shark', title: 'Market Shark', desc: 'Complete 20 trades', icon: '📈', xp: 300, cash: 10000, rarity: 'rare', check: (p) => (p.stats?.items_traded || 0) >= 20 },
  { key: 'ghost', title: 'Ghost', desc: 'Complete 5 stealth operations', icon: '👻', xp: 400, cash: 15000, rarity: 'epic', check: (p) => (p.skills?.stealth || 0) >= 5 },
];

const RARITY_COLORS = { common: 'bg-gray-600', rare: 'bg-blue-700', epic: 'bg-purple-700', legendary: 'bg-yellow-600' };

export function useAchievementChecker(playerData, extraData) {
  const queryClient = useQueryClient();
  const { data: earned = [] } = useQuery({
    queryKey: ['achievements', playerData?.id],
    queryFn: () => base44.entities.Achievement.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const unlock = useMutation({
    mutationFn: async (def) => {
      await base44.entities.Achievement.create({
        player_id: playerData.id,
        achievement_key: def.key,
        title: def.title,
        description: def.desc,
        icon: def.icon,
        xp_reward: def.xp,
        cash_reward: def.cash,
        rarity: def.rarity,
        unlocked_at: new Date().toISOString()
      });
      await base44.entities.Player.update(playerData.id, {
        experience: (playerData.experience || 0) + def.xp,
        crypto_balance: (playerData.crypto_balance || 0) + def.cash,
      });
    },
    onSuccess: (_, def) => {
      sounds.levelUp();
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-slate-900 border border-yellow-500/40 rounded-xl p-4 shadow-xl">
          <span className="text-3xl">{def.icon}</span>
          <div>
            <p className="text-yellow-400 font-bold">Achievement Unlocked!</p>
            <p className="text-white text-sm">{def.title}</p>
            <p className="text-gray-400 text-xs">+{def.xp} XP · +${def.cash.toLocaleString()}</p>
          </div>
        </div>
      ), { duration: 5000 });
      queryClient.invalidateQueries();
    }
  });

  useEffect(() => {
    if (!playerData || !earned) return;
    const earnedKeys = earned.map(a => a.achievement_key);
    ACHIEVEMENT_DEFS.forEach(def => {
      if (!earnedKeys.includes(def.key) && def.check(playerData, extraData)) {
        unlock.mutate(def);
      }
    });
  }, [playerData?.id, playerData?.level, playerData?.total_earnings, playerData?.territory_count]);
}

export default function AchievementTracker({ playerData }) {
  const { data: earned = [] } = useQuery({
    queryKey: ['achievements', playerData?.id],
    queryFn: () => base44.entities.Achievement.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const earnedKeys = earned.map(a => a.achievement_key);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ACHIEVEMENT_DEFS.map(def => {
        const unlocked = earnedKeys.includes(def.key);
        return (
          <div key={def.key} className={`p-3 rounded-xl border text-center transition-all ${unlocked ? 'border-yellow-500/40 bg-yellow-900/10' : 'border-gray-700 opacity-50 grayscale'}`}>
            <div className="text-3xl mb-2">{def.icon}</div>
            <p className="text-white text-xs font-semibold">{def.title}</p>
            <p className="text-gray-500 text-[10px] mt-1">{def.desc}</p>
            <Badge className={`${RARITY_COLORS[def.rarity]} text-[10px] mt-2`}>{def.rarity}</Badge>
            {unlocked && <p className="text-green-400 text-[10px] mt-1">✅ Earned</p>}
          </div>
        );
      })}
    </div>
  );
}