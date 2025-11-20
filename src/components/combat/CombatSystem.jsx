import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Swords, Shield, Zap, Heart, AlertTriangle, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function CombatSystem({ playerData, enemyType = 'rival_crew', onComplete }) {
  const [encounter, setEncounter] = useState(null);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const queryClient = useQueryClient();

  const initiateCombatMutation = useMutation({
    mutationFn: async () => {
      const difficultyScale = 1 + (playerData.level * 0.1);

      const prompt = `Generate combat encounter for player level ${playerData.level}:

Enemy Type: ${enemyType}
Player Skills: Combat ${playerData.skills?.combat || 10}, Stealth ${playerData.skills?.stealth || 10}

Create enemy with:
1. Enemy count (1-5)
2. Enemy stats (health: 50-150, attack: 10-30, defense: 5-25, tactics_level: 1-10)
3. AI tactics (current_strategy, special_attacks array with 3 attacks)

Scale to player level. Return JSON.`;

      const enemyData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            enemy_count: { type: 'number' },
            enemy_stats: {
              type: 'object',
              properties: {
                health: { type: 'number' },
                attack: { type: 'number' },
                defense: { type: 'number' },
                tactics_level: { type: 'number' }
              }
            },
            ai_tactics: {
              type: 'object',
              properties: {
                current_strategy: { type: 'string' },
                special_attacks: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const newEncounter = await base44.entities.CombatEncounter.create({
        encounter_type: 'territory_defense',
        player_id: playerData.id,
        enemy_type: enemyType,
        ...enemyData,
        difficulty_scale: difficultyScale,
        combat_log: [],
        player_actions: [],
        outcome: 'ongoing',
        status: 'active'
      });

      setEnemyHealth(enemyData.enemy_stats.health);
      return newEncounter;
    },
    onSuccess: (data) => {
      setEncounter(data);
      toast.success('Combat initiated!');
    }
  });

  const performActionMutation = useMutation({
    mutationFn: async (actionType) => {
      const playerSkill = playerData.skills?.[actionType.toLowerCase()] || 10;
      const baseDamage = 20 + playerSkill;
      
      // AI adapts based on player actions
      const aiAdaptation = encounter.player_actions.filter(a => a.action_type === actionType).length > 2
        ? 'defensive'
        : 'aggressive';

      const playerDamage = Math.floor(baseDamage * (Math.random() * 0.5 + 0.75));
      const enemyDamage = Math.floor(
        (encounter.enemy_stats.attack * encounter.difficulty_scale) * 
        (aiAdaptation === 'defensive' ? 0.7 : 1.2) *
        (Math.random() * 0.5 + 0.75)
      );

      const newPlayerHealth = Math.max(0, playerHealth - enemyDamage);
      const newEnemyHealth = Math.max(0, enemyHealth - playerDamage);

      setPlayerHealth(newPlayerHealth);
      setEnemyHealth(newEnemyHealth);

      const newLog = [
        ...(encounter.combat_log || []),
        { round: encounter.combat_log.length + 1, action: actionType, damage: playerDamage, actor: 'player' },
        { round: encounter.combat_log.length + 1, action: 'counter', damage: enemyDamage, actor: 'enemy' }
      ];

      const newActions = [
        ...(encounter.player_actions || []),
        { action_type: actionType, effectiveness: playerDamage }
      ];

      let outcome = 'ongoing';
      let rewards = null;

      if (newEnemyHealth <= 0) {
        outcome = 'victory';
        rewards = {
          experience: 100 + (encounter.difficulty_scale * 50),
          loot: 500 + (encounter.enemy_count * 200),
          reputation: 10
        };

        await base44.entities.Player.update(playerData.id, {
          experience: playerData.experience + rewards.experience,
          crypto_balance: playerData.crypto_balance + rewards.loot,
          stats: {
            ...playerData.stats,
            battles_won: (playerData.stats?.battles_won || 0) + 1
          }
        });
      } else if (newPlayerHealth <= 0) {
        outcome = 'defeat';
        await base44.entities.Player.update(playerData.id, {
          stats: {
            ...playerData.stats,
            battles_lost: (playerData.stats?.battles_lost || 0) + 1
          }
        });
      }

      await base44.entities.CombatEncounter.update(encounter.id, {
        combat_log: newLog,
        player_actions: newActions,
        outcome,
        rewards,
        status: outcome !== 'ongoing' ? 'completed' : 'active',
        ai_tactics: {
          ...encounter.ai_tactics,
          current_strategy: aiAdaptation,
          adaptations: [...(encounter.ai_tactics.adaptations || []), aiAdaptation]
        }
      });

      return { outcome, newPlayerHealth, newEnemyHealth, rewards };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['player']);
      
      if (result.outcome === 'victory') {
        toast.success(`Victory! +$${result.rewards.loot} +${result.rewards.experience} XP`);
        if (onComplete) onComplete(result.outcome);
      } else if (result.outcome === 'defeat') {
        toast.error('Defeat!');
        if (onComplete) onComplete(result.outcome);
      }
    }
  });

  if (!encounter) {
    return (
      <Card className="glass-panel border-red-500/20">
        <CardContent className="p-8 text-center">
          <Swords className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-bold text-white mb-2">Ready for Combat?</h3>
          <Button
            className="bg-gradient-to-r from-red-600 to-orange-600"
            onClick={() => initiateCombatMutation.mutate()}
            disabled={initiateCombatMutation.isPending}
          >
            Initiate Combat
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isComplete = encounter.outcome !== 'ongoing';

  return (
    <Card className="glass-panel border-red-500/20">
      <CardHeader className="border-b border-red-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <Swords className="w-5 h-5 text-red-400" />
          Combat: {encounter.enemy_type.replace('_', ' ')}
          <Badge className="ml-auto">
            x{encounter.enemy_count} Enemies
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Health Bars */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white">You: {playerHealth}%</span>
            </div>
            <Progress value={playerHealth} className="h-3 [&>div]:bg-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-white">Enemy: {enemyHealth}%</span>
            </div>
            <Progress value={enemyHealth} className="h-3 [&>div]:bg-red-600" />
          </div>
        </div>

        {/* AI Strategy */}
        <div className="p-3 rounded-lg bg-slate-900/50 border border-red-500/30">
          <p className="text-xs text-gray-400 mb-1">Enemy Strategy:</p>
          <p className="text-sm text-red-300">{encounter.ai_tactics?.current_strategy}</p>
        </div>

        {isComplete ? (
          <div className="text-center py-4">
            {encounter.outcome === 'victory' ? (
              <>
                <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                <h3 className="text-xl font-bold text-white mb-2">Victory!</h3>
                {encounter.rewards && (
                  <div className="space-y-1">
                    <p className="text-sm text-green-400">+${encounter.rewards.loot}</p>
                    <p className="text-sm text-cyan-400">+{encounter.rewards.experience} XP</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                <h3 className="text-xl font-bold text-white mb-2">Defeat</h3>
                <p className="text-sm text-gray-400">Better luck next time</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-red-600 to-orange-600"
              onClick={() => performActionMutation.mutate('combat')}
              disabled={performActionMutation.isPending}
            >
              <Swords className="w-4 h-4 mr-1" />
              Attack
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
              onClick={() => performActionMutation.mutate('stealth')}
              disabled={performActionMutation.isPending}
            >
              <Zap className="w-4 h-4 mr-1" />
              Special
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600"
              onClick={() => performActionMutation.mutate('defense')}
              disabled={performActionMutation.isPending}
            >
              <Shield className="w-4 h-4 mr-1" />
              Defend
            </Button>
          </div>
        )}

        {/* Combat Log */}
        <div className="max-h-40 overflow-y-auto space-y-1">
          {encounter.combat_log?.slice(-5).reverse().map((log, idx) => (
            <div key={idx} className="text-xs p-2 rounded bg-slate-900/30">
              <span className={log.actor === 'player' ? 'text-green-400' : 'text-red-400'}>
                {log.actor === 'player' ? 'You' : 'Enemy'}
              </span>
              <span className="text-gray-400"> used </span>
              <span className="text-white">{log.action}</span>
              <span className="text-gray-400"> for </span>
              <span className="text-yellow-400">{log.damage} damage</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}