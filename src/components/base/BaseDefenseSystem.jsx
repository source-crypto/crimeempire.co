import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, Lock, Eye } from 'lucide-react';
import { toast } from 'sonner';

const defenseUpgrades = [
  { name: 'Surveillance System', cost: 15000, effectiveness: 25 },
  { name: 'Alarm System', cost: 12000, effectiveness: 20 },
  { name: 'Access Control', cost: 10000, effectiveness: 15 },
  { name: 'Guard Reinforcement', cost: 8000, effectiveness: 30 }
];

export default function BaseDefenseSystem({ playerData, selectedBase }) {
  const queryClient = useQueryClient();
  const [expandedDefense, setExpandedDefense] = useState(false);

  const { data: baseDefense } = useQuery({
    queryKey: ['baseDefense', selectedBase?.id],
    queryFn: async () => {
      const defenses = await base44.entities.BaseDefense.filter({ base_id: selectedBase.id });
      return defenses[0] || {};
    },
    enabled: !!selectedBase?.id
  });

  const { data: leRaids = [] } = useQuery({
    queryKey: ['baseLERaids', selectedBase?.id],
    queryFn: () => base44.entities.BaseLERaid.filter({ base_id: selectedBase.id }),
    enabled: !!selectedBase?.id
  });

  const upgradeMutation = useMutation({
    mutationFn: async (upgrade) => {
      if (playerData.crypto_balance < upgrade.cost) {
        throw new Error('Insufficient funds');
      }

      let newDefense = {...baseDefense};
      const key = upgrade.name.toLowerCase().replace(/\s+/g, '_');
      
      newDefense = {
        ...newDefense,
        [key]: Math.min(100, (baseDefense[key] || 0) + upgrade.effectiveness),
        defense_rating: Math.min(100, (baseDefense.defense_rating || 0) + (upgrade.effectiveness * 0.8))
      };

      await base44.entities.BaseDefense.update(baseDefense.id, newDefense);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - upgrade.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseDefense']);
      queryClient.invalidateQueries(['player']);
      toast.success('Defense upgraded!');
    },
    onError: (error) => toast.error(error.message)
  });

  const triggerRaidMutation = useMutation({
    mutationFn: async () => {
      const raidDifficulty = selectedBase.vulnerability_rating;
      const defenseRating = baseDefense?.defense_rating || 0;
      const successChance = Math.max(20, Math.min(95, raidDifficulty - defenseRating));

      const success = Math.random() * 100 < successChance;

      await base44.entities.BaseLERaid.create({
        base_id: selectedBase.id,
        player_id: playerData.id,
        units_deployed: Math.floor(3 + (raidDifficulty / 20)),
        defense_effectiveness: defenseRating,
        estimated_outcome: success ? 'success' : 'failure'
      });

      if (!success) {
        await base44.entities.PlayerBase.update(selectedBase.id, {
          last_ле_raid: new Date().toISOString(),
          vulnerability_rating: Math.max(0, selectedBase.vulnerability_rating - 20)
        });
        toast.success('Base defended against raid!');
      } else {
        toast.error('Raid successful! Assets seized.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseLERaids']);
      queryClient.invalidateQueries(['playerBases']);
    }
  });

  if (!baseDefense) return <div className="text-white">Loading defenses...</div>;

  return (
    <div className="space-y-3">
      {/* Defense Status */}
      <Card className="glass-panel border-yellow-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Shield className="w-4 h-4 text-yellow-400" />
            Defense Systems
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Overall Defense</p>
              <p className="text-cyan-400 font-bold">{Math.round(baseDefense.defense_rating)}%</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Surveillance</p>
              <p className="text-blue-400 font-bold">{Math.round(baseDefense.surveillance_system || 0)}%</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Alarm</p>
              <p className="text-purple-400 font-bold">{Math.round(baseDefense.alarm_system || 0)}%</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Guards</p>
              <p className="text-green-400 font-bold">{baseDefense.guard_count}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Defense Rating</span>
              <span>{Math.round(baseDefense.defense_rating)}%</span>
            </div>
            <Progress value={baseDefense.defense_rating} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Upgrades */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle
            onClick={() => setExpandedDefense(!expandedDefense)}
            className="flex items-center gap-2 text-white text-sm cursor-pointer hover:text-green-300"
          >
            <Lock className="w-4 h-4 text-green-400" />
            Available Upgrades
          </CardTitle>
        </CardHeader>
        {expandedDefense && (
          <CardContent className="space-y-2">
            {defenseUpgrades.map((upgrade) => (
              <div key={upgrade.name} className="p-2 bg-slate-900/50 rounded border border-green-500/20 flex items-center justify-between text-xs">
                <div>
                  <p className="text-white font-semibold">{upgrade.name}</p>
                  <p className="text-gray-400">+{upgrade.effectiveness}% effectiveness</p>
                </div>
                <button
                  onClick={() => upgradeMutation.mutate(upgrade)}
                  disabled={playerData.crypto_balance < upgrade.cost || upgradeMutation.isPending}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                >
                  ${upgrade.cost.toLocaleString()}
                </button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Recent Raids */}
      {leRaids.length > 0 && (
        <Card className="glass-panel border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Raid History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {leRaids.slice(-3).map((raid) => (
                <div key={raid.id} className="p-1.5 bg-slate-900/50 rounded text-xs border border-red-500/20">
                  <div className="flex justify-between">
                    <span className="text-gray-300">{raid.units_deployed} units</span>
                    <Badge className={raid.estimated_outcome === 'success' ? 'bg-red-600' : 'bg-green-600'}>
                      {raid.estimated_outcome}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <button
        onClick={() => triggerRaidMutation.mutate()}
        className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-semibold"
      >
        Simulate LE Raid
      </button>
    </div>
  );
}