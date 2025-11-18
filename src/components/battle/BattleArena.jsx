import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Swords, Users, Shield, Zap, TrendingUp, Clock, Trophy, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function BattleArena({ battle, playerData, onComplete }) {
  const [vehicleCount, setVehicleCount] = useState(1);
  const [hasJoined, setHasJoined] = useState(false);
  const queryClient = useQueryClient();

  const { data: battleData, refetch } = useQuery({
    queryKey: ['battle', battle.id],
    queryFn: () => base44.entities.Battle.filter({ id: battle.id }),
    refetchInterval: 3000,
    enabled: !!battle.id
  });

  const currentBattle = battleData?.[0] || battle;

  const joinBattleMutation = useMutation({
    mutationFn: async (side) => {
      if (playerData.crew_id !== currentBattle.attacking_crew_id && 
          playerData.crew_id !== currentBattle.defending_crew_id) {
        throw new Error('You must be part of one of the crews in this battle');
      }

      const power = vehicleCount * 100 + playerData.strength_score * 10;
      
      const participants = currentBattle.participants || [];
      participants.push({
        player_id: playerData.id,
        username: playerData.username,
        side,
        contribution: power
      });

      const updates = {
        participants,
        attack_power: side === 'attacker' 
          ? currentBattle.attack_power + power 
          : currentBattle.attack_power,
        defense_power: side === 'defender' 
          ? currentBattle.defense_power + power 
          : currentBattle.defense_power
      };

      await base44.entities.Battle.update(currentBattle.id, updates);

      await base44.entities.CrewActivity.create({
        crew_id: playerData.crew_id,
        activity_type: 'battle_won',
        title: 'Joined Battle',
        description: `${playerData.username} joined the battle as ${side}`,
        player_id: playerData.id,
        player_username: playerData.username
      });

      setHasJoined(true);
    },
    onSuccess: () => {
      refetch();
      toast.success('Joined battle successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const resolveBattleMutation = useMutation({
    mutationFn: async () => {
      const winner = currentBattle.attack_power > currentBattle.defense_power
        ? currentBattle.attacking_crew_id
        : currentBattle.defending_crew_id;

      const winnerSide = currentBattle.attack_power > currentBattle.defense_power
        ? 'attacker'
        : 'defender';

      await base44.entities.Battle.update(currentBattle.id, {
        status: 'completed',
        winner_crew_id: winner,
        completed_at: new Date().toISOString()
      });

      // Update territory
      if (winnerSide === 'attacker') {
        await base44.entities.Territory.update(currentBattle.territory_id, {
          controlling_crew_id: winner,
          is_contested: false,
          battle_id: null
        });
      } else {
        await base44.entities.Territory.update(currentBattle.territory_id, {
          is_contested: false,
          battle_id: null
        });
      }

      // Distribute rewards
      const participants = currentBattle.participants || [];
      for (const participant of participants) {
        const isWinner = (participant.side === winnerSide);
        const reward = isWinner ? participant.contribution * 10 : participant.contribution * 2;

        const players = await base44.entities.Player.filter({ id: participant.player_id });
        if (players[0]) {
          await base44.entities.Player.update(players[0].id, {
            crypto_balance: players[0].crypto_balance + reward,
            total_earnings: (players[0].total_earnings || 0) + reward,
            stats: {
              ...(players[0].stats || {}),
              battles_won: (players[0].stats?.battles_won || 0) + (isWinner ? 1 : 0),
              battles_lost: (players[0].stats?.battles_lost || 0) + (isWinner ? 0 : 1)
            }
          });
        }
      }

      await base44.entities.CrewActivity.create({
        crew_id: winner,
        activity_type: winnerSide === 'attacker' ? 'territory_captured' : 'battle_won',
        title: 'Battle Victory!',
        description: `Successfully ${winnerSide === 'attacker' ? 'captured' : 'defended'} territory`,
        value: currentBattle.attack_power + currentBattle.defense_power
      });
    },
    onSuccess: () => {
      toast.success('Battle resolved!');
      onComplete();
    }
  });

  const playerSide = playerData.crew_id === currentBattle.attacking_crew_id
    ? 'attacker'
    : playerData.crew_id === currentBattle.defending_crew_id
    ? 'defender'
    : null;

  const totalPower = currentBattle.attack_power + currentBattle.defense_power;
  const attackPercentage = totalPower > 0 ? (currentBattle.attack_power / totalPower) * 100 : 50;

  const timeUntilEnd = new Date(currentBattle.ends_at) - new Date();
  const canResolve = timeUntilEnd <= 0 || currentBattle.status !== 'active';

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-red-500/30">
        <CardHeader className="border-b border-red-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Swords className="w-6 h-6 text-red-400" />
            Battle in Progress
            <Badge className="ml-auto bg-red-600">{currentBattle.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center p-4 rounded-lg bg-red-900/20 border border-red-500/30">
              <h3 className="text-lg font-bold text-red-400 mb-2">Attackers</h3>
              <p className="text-3xl font-bold text-white mb-2">
                {currentBattle.attack_power.toFixed(0)}
              </p>
              <p className="text-sm text-gray-400">
                {currentBattle.participants?.filter(p => p.side === 'attacker').length || 0} fighters
              </p>
            </div>

            <div className="text-center p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <h3 className="text-lg font-bold text-blue-400 mb-2">Defenders</h3>
              <p className="text-3xl font-bold text-white mb-2">
                {currentBattle.defense_power.toFixed(0)}
              </p>
              <p className="text-sm text-gray-400">
                {currentBattle.participants?.filter(p => p.side === 'defender').length || 0} fighters
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-red-400">Attackers</span>
              <span className="text-blue-400">Defenders</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-red-600 to-orange-600 transition-all duration-500"
                style={{ width: `${attackPercentage}%` }}
              />
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-500"
                style={{ width: `${100 - attackPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
            <Clock className="w-4 h-4" />
            <span>
              {canResolve 
                ? 'Ready to resolve' 
                : `${formatDistanceToNow(new Date(currentBattle.ends_at), { addSuffix: true })}`
              }
            </span>
          </div>

          {playerSide && !hasJoined && currentBattle.status === 'active' && (
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30 space-y-3">
              <h4 className="font-semibold text-white">Join the Battle</h4>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Deploy Vehicles (Increases your power)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={vehicleCount}
                  onChange={(e) => setVehicleCount(parseInt(e.target.value) || 1)}
                  className="bg-slate-900/50 border-purple-500/20 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Estimated power contribution: {vehicleCount * 100 + playerData.strength_score * 10}
                </p>
              </div>
              <Button
                className={`w-full ${
                  playerSide === 'attacker'
                    ? 'bg-gradient-to-r from-red-600 to-orange-600'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600'
                }`}
                onClick={() => joinBattleMutation.mutate(playerSide)}
                disabled={joinBattleMutation.isPending}
              >
                {joinBattleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4 mr-2" />
                    Join as {playerSide}
                  </>
                )}
              </Button>
            </div>
          )}

          {canResolve && currentBattle.status === 'active' && (
            <Button
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
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
                  <Trophy className="w-4 h-4 mr-2" />
                  Resolve Battle
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">Participants</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentBattle.participants?.map((participant, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  participant.side === 'attacker'
                    ? 'bg-red-900/20 border border-red-500/20'
                    : 'bg-blue-900/20 border border-blue-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold text-white">{participant.username}</span>
                  </div>
                  <Badge variant="outline">
                    Power: {participant.contribution}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}