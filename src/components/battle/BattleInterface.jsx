import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Swords, Users, Shield, Zap, TrendingUp, Clock, Target, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInMinutes } from 'date-fns';

export default function BattleInterface({ battle, playerData, onComplete }) {
  const [vehicleCount, setVehicleCount] = useState(1);
  const queryClient = useQueryClient();

  const { data: battleData, refetch } = useQuery({
    queryKey: ['battle', battle.id],
    queryFn: () => base44.entities.Battle.filter({ id: battle.id }).then(b => b[0]),
    refetchInterval: 3000,
    enabled: !!battle.id
  });

  const { data: territory } = useQuery({
    queryKey: ['territory', battle.territory_id],
    queryFn: () => base44.entities.Territory.filter({ id: battle.territory_id }).then(t => t[0]),
    enabled: !!battle.territory_id
  });

  const joinBattleMutation = useMutation({
    mutationFn: async ({ side }) => {
      const power = vehicleCount * 100 + (playerData.strength_score * 10) + (playerData.level * 50);
      
      const participants = battleData.participants || [];
      participants.push({
        player_id: playerData.id,
        username: playerData.username,
        side,
        contribution: power
      });

      const updateData = {
        participants,
        attack_power: side === 'attacker' 
          ? (battleData.attack_power || 0) + power 
          : battleData.attack_power,
        defense_power: side === 'defender' 
          ? (battleData.defense_power || 0) + power 
          : battleData.defense_power
      };

      await base44.entities.Battle.update(battleData.id, updateData);

      // Create crew activity
      await base44.entities.CrewActivity.create({
        crew_id: playerData.crew_id,
        activity_type: 'battle_won',
        title: '⚔️ Joined Battle',
        description: `${playerData.username} joined the battle for ${territory?.name}`,
        player_id: playerData.id,
        player_username: playerData.username
      });

      return updateData;
    },
    onSuccess: () => {
      refetch();
      toast.success('Joined battle!');
    }
  });

  const resolveBattleMutation = useMutation({
    mutationFn: async () => {
      const winner = battleData.attack_power > battleData.defense_power 
        ? battleData.attacking_crew_id 
        : battleData.defending_crew_id;
      
      const status = battleData.attack_power > battleData.defense_power ? 'success' : 'failed';

      // Update battle
      await base44.entities.Battle.update(battleData.id, {
        status: 'completed',
        winner_crew_id: winner,
        completed_at: new Date().toISOString()
      });

      // Update territory if attackers won
      if (status === 'success') {
        await base44.entities.Territory.update(battleData.territory_id, {
          controlling_crew_id: winner,
          is_contested: false,
          battle_id: null,
          control_percentage: 100
        });

        await base44.entities.CrewActivity.create({
          crew_id: winner,
          activity_type: 'territory_captured',
          title: '🏆 Territory Captured!',
          description: `Your crew captured ${territory?.name}`,
          value: 50000
        });
      } else {
        await base44.entities.Territory.update(battleData.territory_id, {
          is_contested: false,
          battle_id: null
        });
      }

      // Reward participants
      const participants = battleData.participants || [];
      for (const participant of participants) {
        const isWinner = (participant.side === 'attacker' && status === 'success') ||
                        (participant.side === 'defender' && status === 'failed');
        
        const reward = isWinner ? participant.contribution * 10 : participant.contribution * 3;
        
        const players = await base44.entities.Player.filter({ id: participant.player_id });
        if (players[0]) {
          await base44.entities.Player.update(players[0].id, {
            crypto_balance: players[0].crypto_balance + reward,
            total_earnings: (players[0].total_earnings || 0) + reward
          });
        }
      }

      return { winner, status };
    },
    onSuccess: (data) => {
      toast.success(`Battle completed! ${data.status === 'success' ? 'Attackers won!' : 'Defenders held!'}`);
      onComplete();
    }
  });

  if (!battleData) {
    return <div className="text-white">Loading battle...</div>;
  }

  const totalPower = battleData.attack_power + battleData.defense_power;
  const attackPercentage = totalPower > 0 ? (battleData.attack_power / totalPower) * 100 : 50;
  const minutesRemaining = differenceInMinutes(new Date(battleData.ends_at), new Date());
  const canResolve = minutesRemaining <= 0 || battleData.status === 'completed';

  const hasJoined = battleData.participants?.some(p => p.player_id === playerData.id);
  const playerSide = battleData.participants?.find(p => p.player_id === playerData.id)?.side;

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-red-500/30">
        <CardHeader className="border-b border-red-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Swords className="w-6 h-6 text-red-400" />
            Battle for {territory?.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Battle Status */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-red-900/20 border border-red-500/20">
              <Users className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <p className="text-xs text-gray-400">Attackers</p>
              <p className="text-2xl font-bold text-red-400">{battleData.attack_power?.toFixed(0) || 0}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-900/20 border border-yellow-500/20">
              <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-xs text-gray-400">Time Left</p>
              <p className="text-2xl font-bold text-yellow-400">{Math.max(0, minutesRemaining)}m</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-900/20 border border-blue-500/20">
              <Shield className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-xs text-gray-400">Defenders</p>
              <p className="text-2xl font-bold text-blue-400">{battleData.defense_power?.toFixed(0) || 0}</p>
            </div>
          </div>

          {/* Power Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Attacker Advantage</span>
              <span>Defender Advantage</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-red-600 to-orange-600"
                style={{ width: `${attackPercentage}%` }}
              />
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-600"
                style={{ width: `${100 - attackPercentage}%` }}
              />
            </div>
          </div>

          {/* Participants */}
          <div className="mb-6">
            <h4 className="font-semibold text-white mb-3">Participants ({battleData.participants?.length || 0})</h4>
            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
              {battleData.participants?.map((participant, idx) => (
                <div key={idx} className={`p-2 rounded text-sm ${
                  participant.side === 'attacker' ? 'bg-red-900/20' : 'bg-blue-900/20'
                }`}>
                  <span className="text-white font-semibold">{participant.username}</span>
                  <span className="text-gray-400 ml-2">+{participant.contribution}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Join Battle */}
          {!hasJoined && battleData.status === 'active' && (
            <div className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/20">
              <h4 className="font-semibold text-white mb-3">Deploy Forces</h4>
              <div className="mb-3">
                <label className="text-sm text-gray-400 mb-2 block">Vehicles to Deploy</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={vehicleCount}
                  onChange={(e) => setVehicleCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-slate-900/50 border-purple-500/20 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Estimated Power: {(vehicleCount * 100 + playerData.strength_score * 10 + playerData.level * 50).toFixed(0)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-gradient-to-r from-red-600 to-orange-600"
                  onClick={() => joinBattleMutation.mutate({ side: 'attacker' })}
                  disabled={joinBattleMutation.isPending || playerData.crew_id !== battleData.attacking_crew_id}
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Join Attack
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-cyan-600"
                  onClick={() => joinBattleMutation.mutate({ side: 'defender' })}
                  disabled={joinBattleMutation.isPending || playerData.crew_id !== battleData.defending_crew_id}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Join Defense
                </Button>
              </div>
            </div>
          )}

          {hasJoined && (
            <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/20">
              <p className="text-green-400 text-center font-semibold">
                You've joined as {playerSide}!
              </p>
            </div>
          )}

          {/* Resolve Battle */}
          {canResolve && battleData.status === 'active' && (
            <Button
              className="w-full mt-4 bg-gradient-to-r from-yellow-600 to-orange-600"
              onClick={() => resolveBattleMutation.mutate()}
              disabled={resolveBattleMutation.isPending}
            >
              {resolveBattleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Resolve Battle
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}