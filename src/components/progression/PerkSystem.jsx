import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Lock, Star, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const tierColors = {
  1: 'from-gray-500 to-gray-600',
  2: 'from-green-500 to-emerald-600',
  3: 'from-blue-500 to-cyan-600',
  4: 'from-purple-500 to-indigo-600',
  5: 'from-yellow-500 to-orange-600'
};

const tierNames = {
  1: 'Common',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary'
};

export default function PerkSystem({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedPerk, setSelectedPerk] = useState(null);

  const { data: allPerks = [] } = useQuery({
    queryKey: ['allPerks'],
    queryFn: () => base44.entities.Perk.list()
  });

  const { data: playerPerks = [] } = useQuery({
    queryKey: ['playerPerks', playerData?.id],
    queryFn: () => base44.entities.PlayerPerk.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: playerSkills = [] } = useQuery({
    queryKey: ['playerSkills', playerData?.id],
    queryFn: () => base44.entities.PlayerSkill.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const unlockPerkMutation = useMutation({
    mutationFn: async (perk) => {
      // Check requirements
      const requiredSkill = playerSkills.find(s => s.skill_name === perk.required_skill);
      if (!requiredSkill || !requiredSkill.is_unlocked || requiredSkill.level < perk.required_skill_level) {
        throw new Error(`Requires ${perk.required_skill} level ${perk.required_skill_level}`);
      }

      if ((playerData?.level || 1) < perk.required_player_level) {
        throw new Error(`Requires level ${perk.required_player_level}`);
      }

      await base44.entities.PlayerPerk.create({
        player_id: playerData.id,
        perk_id: perk.id,
        perk_name: perk.perk_name,
        is_unlocked: true,
        unlock_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerPerks']);
      toast.success('Perk unlocked!');
      setSelectedPerk(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const canUnlockPerk = (perk) => {
    const already = playerPerks.some(p => p.perk_id === perk.id);
    if (already) return false;

    const requiredSkill = playerSkills.find(s => s.skill_name === perk.required_skill);
    const hasSkill = requiredSkill?.is_unlocked && requiredSkill.level >= perk.required_skill_level;
    const rightLevel = (playerData?.level || 1) >= perk.required_player_level;

    return hasSkill && rightLevel;
  };

  const unlockedPerks = playerPerks.filter(pp => pp.is_unlocked);
  const availablePerks = allPerks.filter(p => !playerPerks.some(pp => pp.perk_id === p.id));

  return (
    <div className="space-y-6">
      {/* Unlocked Perks */}
      {unlockedPerks.length > 0 && (
        <Card className="glass-panel border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Star className="w-5 h-5 text-yellow-400" />
              Active Perks ({unlockedPerks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unlockedPerks.map((playerPerk) => {
                const perk = allPerks.find(p => p.id === playerPerk.perk_id);
                return (
                  <div key={playerPerk.id} className={`p-4 rounded-lg bg-gradient-to-br ${tierColors[perk?.tier || 1]} border border-white/10`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-semibold">{perk?.perk_name}</h4>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <p className="text-sm text-gray-100 mb-3">{perk?.description}</p>
                    {perk?.stat_bonuses && Object.entries(perk.stat_bonuses).filter(([_, v]) => v).map(([stat, value]) => (
                      <div key={stat} className="text-xs text-green-300">
                        +{value} {stat.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Perks */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Gift className="w-5 h-5 text-purple-400" />
            Available Perks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePerks.map((perk) => {
              const canUnlock = canUnlockPerk(perk);
              const requiredSkill = playerSkills.find(s => s.skill_name === perk.required_skill);

              return (
                <div
                  key={perk.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    canUnlock
                      ? `bg-gradient-to-br ${tierColors[perk.tier || 1]} border-white/20`
                      : 'bg-slate-900/30 border-gray-600/30'
                  }`}
                  onClick={() => setSelectedPerk(selectedPerk === perk.id ? null : perk.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className={`font-semibold ${canUnlock ? 'text-white' : 'text-gray-400'}`}>
                        {perk.perk_name}
                      </h4>
                      <p className="text-xs text-gray-400">{tierNames[perk.tier || 1]}</p>
                    </div>
                    {!canUnlock && <Lock className="w-4 h-4 text-gray-600" />}
                  </div>

                  <p className="text-sm text-gray-300 mb-3">{perk.description}</p>

                  <div className="space-y-1 text-xs mb-3">
                    <div className="text-gray-400">
                      Requires: <span className="text-cyan-400">{perk.required_skill}</span> Lv{perk.required_skill_level}
                    </div>
                    <div className="text-gray-400">
                      Player Level: <span className={`${(playerData?.level || 1) >= perk.required_player_level ? 'text-green-400' : 'text-red-400'}`}>
                        {perk.required_player_level}
                      </span>
                    </div>
                  </div>

                  {selectedPerk === perk.id && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        unlockPerkMutation.mutate(perk);
                      }}
                      disabled={!canUnlock || unlockPerkMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-sm h-8"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Unlock Perk
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}