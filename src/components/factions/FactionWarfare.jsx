import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Swords, Shield, Trophy, Flame, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function FactionWarfare({ playerData, playerFaction, factionMembership }) {
  const queryClient = useQueryClient();
  const [selectedTarget, setSelectedTarget] = useState(null);

  const { data: allFactions = [] } = useQuery({
    queryKey: ['allFactions'],
    queryFn: () => base44.entities.Faction.list()
  });

  const { data: activeWars = [] } = useQuery({
    queryKey: ['factionWars', playerFaction?.id],
    queryFn: async () => {
      const wars = await base44.entities.FactionWar.list();
      return wars.filter(w => 
        (w.attacker_faction_id === playerFaction.id || w.defender_faction_id === playerFaction.id) &&
        w.status !== 'concluded'
      );
    },
    enabled: !!playerFaction?.id
  });

  const declareWarMutation = useMutation({
    mutationFn: async (targetFaction) => {
      if (factionMembership.rank !== 'leader' && factionMembership.rank !== 'underboss') {
        throw new Error('Only leaders and underbosses can declare war');
      }

      return await base44.entities.FactionWar.create({
        attacker_faction_id: playerFaction.id,
        defender_faction_id: targetFaction.id,
        war_type: 'territory_dispute',
        status: 'declared',
        attacker_power: playerFaction.total_power || 0,
        defender_power: targetFaction.total_power || 0,
        started_at: new Date().toISOString(),
        battle_phases: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['factionWars']);
      toast.success('War declared!');
      setSelectedTarget(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const participateInBattleMutation = useMutation({
    mutationFn: async (war) => {
      const isAttacker = war.attacker_faction_id === playerFaction.id;
      const playerContribution = playerData.strength_score || 10;

      const currentPhases = war.battle_phases || [];
      const phaseNumber = currentPhases.length + 1;

      // Simple battle outcome
      const attackPower = war.attacker_power + (isAttacker ? playerContribution : 0);
      const defensePower = war.defender_power + (!isAttacker ? playerContribution : 0);
      const roll = Math.random();
      const attackerWins = (attackPower / (attackPower + defensePower)) > roll;

      const newPhase = {
        phase_number: phaseNumber,
        winner: attackerWins ? war.attacker_faction_id : war.defender_faction_id,
        casualties: Math.floor(Math.random() * 5) + 1
      };

      await base44.entities.FactionWar.update(war.id, {
        battle_phases: [...currentPhases, newPhase],
        attacker_power: attackPower,
        defender_power: defensePower
      });

      // Reward participant
      const reward = 5000 + (phaseNumber * 1000);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + reward
      });

      await base44.entities.FactionMember.update(factionMembership.id, {
        contribution_points: (factionMembership.contribution_points || 0) + 50
      });

      return { winner: attackerWins ? 'attacker' : 'defender', reward };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['factionWars']);
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['playerFaction']);
      toast.success(`Battle complete! Earned $${result.reward.toLocaleString()}`);
    }
  });

  const rivalFactions = allFactions.filter(f => f.id !== playerFaction?.id);

  return (
    <div className="space-y-6">
      {/* Active Wars */}
      {activeWars.length > 0 && (
        <Card className="glass-panel border-red-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              Active Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeWars.map((war) => {
              const isAttacker = war.attacker_faction_id === playerFaction.id;
              const totalPower = war.attacker_power + war.defender_power;
              const attackerProgress = totalPower > 0 ? (war.attacker_power / totalPower) * 100 : 50;

              return (
                <div key={war.id} className="p-4 rounded-lg bg-slate-900/50 border border-red-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={isAttacker ? 'bg-red-600' : 'bg-blue-600'}>
                      {isAttacker ? 'Attacking' : 'Defending'}
                    </Badge>
                    <Badge variant="outline">{war.war_type.replace('_', ' ')}</Badge>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Battle Progress</span>
                      <span className="text-white">{war.battle_phases?.length || 0} Phases</span>
                    </div>
                    <div className="relative">
                      <Progress value={attackerProgress} className="h-6" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {Math.round(attackerProgress)}% vs {Math.round(100 - attackerProgress)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 rounded bg-red-900/20 border border-red-500/20">
                      <div className="text-xs text-gray-400">Attacker Power</div>
                      <div className="text-lg font-bold text-red-400">{war.attacker_power}</div>
                    </div>
                    <div className="text-center p-2 rounded bg-blue-900/20 border border-blue-500/20">
                      <div className="text-xs text-gray-400">Defender Power</div>
                      <div className="text-lg font-bold text-blue-400">{war.defender_power}</div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600"
                    onClick={() => participateInBattleMutation.mutate(war)}
                    disabled={participateInBattleMutation.isPending}
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Participate in Battle
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Declare War */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-purple-400" />
            Declare War
          </CardTitle>
        </CardHeader>
        <CardContent>
          {factionMembership?.rank !== 'leader' && factionMembership?.rank !== 'underboss' ? (
            <div className="text-center text-gray-400 py-6">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>Only faction leaders and underbosses can declare war</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rivalFactions.map((faction) => (
                <div key={faction.id} className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold">{faction.name}</h4>
                        <Badge>{faction.faction_type}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span>Power: {faction.total_power}</span>
                        <span>Members: {faction.member_count}</span>
                        <span>Territories: {faction.territory_count}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => declareWarMutation.mutate(faction)}
                      disabled={declareWarMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Declare War
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}