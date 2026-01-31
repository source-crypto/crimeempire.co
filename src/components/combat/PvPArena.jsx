import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sword, Shield, Trophy, Skull, Target, Zap } from "lucide-react";

export default function PvPArena({ playerData }) {
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [combatActive, setCombatActive] = useState(false);
  const queryClient = useQueryClient();

  const { data: onlinePlayers = [] } = useQuery({
    queryKey: ['onlinePlayers'],
    queryFn: () => base44.entities.Player.list('-level', 20),
    refetchInterval: 10000
  });

  const { data: activeCombats = [] } = useQuery({
    queryKey: ['activeCombats', playerData?.id],
    queryFn: () => base44.entities.PvPCombat.filter({
      status: 'pending',
      defender_id: playerData.id
    }),
    enabled: !!playerData?.id,
    refetchInterval: 3000
  });

  const initiateDuelMutation = useMutation({
    mutationFn: async (opponent) => {
      const attackerPower = calculateCombatPower(playerData);
      const defenderPower = calculateCombatPower(opponent);

      return await base44.entities.PvPCombat.create({
        combat_type: 'duel',
        attacker_id: playerData.id,
        attacker_username: playerData.username,
        defender_id: opponent.id,
        defender_username: opponent.username,
        attacker_power: attackerPower,
        defender_power: defenderPower,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeCombats']);
      setSelectedOpponent(null);
    }
  });

  const executeCombatMutation = useMutation({
    mutationFn: async ({ combatId, accept }) => {
      if (!accept) {
        await base44.entities.PvPCombat.update(combatId, { status: 'cancelled' });
        return;
      }

      const combat = activeCombats.find(c => c.id === combatId);
      
      // AI-powered combat simulation
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Simulate a PvP combat between two players:
Attacker: ${combat.attacker_username} (Power: ${combat.attacker_power})
Defender: ${combat.defender_username} (Power: ${combat.defender_power})

Generate a realistic combat outcome with:
- Winner ID (use actual IDs: ${combat.attacker_id} or ${combat.defender_id})
- Combat log (3-5 actions)
- Rewards (crypto: 1000-5000, reputation: 10-50)
- Penalties for loser (crypto_lost: 500-2000, reputation_lost: 5-20)`,
        response_json_schema: {
          type: "object",
          properties: {
            winner_id: { type: "string" },
            loser_id: { type: "string" },
            combat_log: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  damage: { type: "number" }
                }
              }
            },
            rewards: {
              type: "object",
              properties: {
                crypto: { type: "number" },
                reputation: { type: "number" }
              }
            },
            penalties: {
              type: "object",
              properties: {
                crypto_lost: { type: "number" },
                reputation_lost: { type: "number" }
              }
            }
          }
        }
      });

      // Update combat record
      await base44.entities.PvPCombat.update(combatId, {
        status: 'completed',
        winner_id: result.winner_id,
        loser_id: result.loser_id,
        rewards: result.rewards,
        penalties: result.penalties,
        combat_log: result.combat_log
      });

      // Update winner
      const winner = await base44.entities.Player.filter({ id: result.winner_id });
      if (winner[0]) {
        await base44.entities.Player.update(result.winner_id, {
          crypto_balance: (winner[0].crypto_balance || 0) + result.rewards.crypto,
          endgame_points: (winner[0].endgame_points || 0) + result.rewards.reputation,
          stats: {
            ...winner[0].stats,
            battles_won: (winner[0].stats?.battles_won || 0) + 1
          }
        });
      }

      // Update loser
      const loser = await base44.entities.Player.filter({ id: result.loser_id });
      if (loser[0]) {
        await base44.entities.Player.update(result.loser_id, {
          crypto_balance: Math.max(0, (loser[0].crypto_balance || 0) - result.penalties.crypto_lost),
          endgame_points: Math.max(0, (loser[0].endgame_points || 0) - result.penalties.reputation_lost),
          stats: {
            ...loser[0].stats,
            battles_lost: (loser[0].stats?.battles_lost || 0) + 1
          }
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeCombats']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const calculateCombatPower = (player) => {
    return (player.strength_score || 10) * 10 + 
           (player.level || 1) * 20 + 
           (player.endgame_points || 0) / 10;
  };

  const availableOpponents = onlinePlayers.filter(p => p.id !== playerData?.id);

  return (
    <div className="space-y-6">
      {/* Incoming Challenges */}
      {activeCombats.length > 0 && (
        <Card className="glass-panel border-red-500/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sword className="w-5 h-5 text-red-400" />
              Incoming Challenges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeCombats.map((combat) => (
              <div key={combat.id} className="p-4 rounded-lg bg-slate-900/50 border border-red-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">{combat.attacker_username} challenges you!</p>
                    <p className="text-sm text-slate-400">Combat Type: {combat.combat_type}</p>
                  </div>
                  <Badge className="bg-red-600">
                    Power: {combat.attacker_power}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => executeCombatMutation.mutate({ combatId: combat.id, accept: true })}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Sword className="w-4 h-4 mr-1" />
                    Accept Duel
                  </Button>
                  <Button
                    onClick={() => executeCombatMutation.mutate({ combatId: combat.id, accept: false })}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player Selection */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Available Opponents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableOpponents.map((opponent) => {
              const opponentPower = calculateCombatPower(opponent);
              const playerPower = calculateCombatPower(playerData);
              const winChance = Math.min(95, Math.max(5, 50 + (playerPower - opponentPower) / 10));

              return (
                <div
                  key={opponent.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedOpponent?.id === opponent.id
                      ? 'bg-purple-900/30 border-purple-500'
                      : 'bg-slate-900/30 border-slate-700 hover:border-purple-500/50'
                  }`}
                  onClick={() => setSelectedOpponent(opponent)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-semibold">{opponent.username}</p>
                      <p className="text-xs text-slate-400">Level {opponent.level}</p>
                    </div>
                    <Badge className="bg-orange-600">
                      {opponentPower.toFixed(0)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Win Chance</span>
                      <span className={winChance > 50 ? 'text-green-400' : 'text-red-400'}>
                        {winChance.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={winChance} className="h-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {selectedOpponent && (
            <div className="mt-4 p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white">Challenge {selectedOpponent.username} to a duel?</p>
                <Button
                  onClick={() => initiateDuelMutation.mutate(selectedOpponent)}
                  disabled={initiateDuelMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Sword className="w-4 h-4 mr-2" />
                  Initiate Duel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combat Stats */}
      <Card className="glass-panel border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Your Combat Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-900/20">
              <Trophy className="w-6 h-6 mx-auto mb-1 text-green-400" />
              <p className="text-2xl font-bold text-white">{playerData?.stats?.battles_won || 0}</p>
              <p className="text-xs text-slate-400">Victories</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-900/20">
              <Skull className="w-6 h-6 mx-auto mb-1 text-red-400" />
              <p className="text-2xl font-bold text-white">{playerData?.stats?.battles_lost || 0}</p>
              <p className="text-xs text-slate-400">Defeats</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-900/20">
              <Zap className="w-6 h-6 mx-auto mb-1 text-purple-400" />
              <p className="text-2xl font-bold text-white">{calculateCombatPower(playerData).toFixed(0)}</p>
              <p className="text-xs text-slate-400">Power</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}