import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield, Swords, AlertTriangle, Target, Users, Loader2, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const factionTypeIcons = {
  gang: Swords,
  cartel: Target,
  mafia: Users,
  corporation: Shield,
  law_enforcement: AlertTriangle
};

const strategyColors = {
  aggressive_expansion: 'from-red-600 to-orange-600',
  defensive: 'from-blue-600 to-cyan-600',
  economic: 'from-green-600 to-emerald-600',
  guerrilla: 'from-purple-600 to-pink-600',
  diplomatic: 'from-yellow-600 to-orange-600'
};

export default function RivalFactionSystem({ playerData }) {
  const queryClient = useQueryClient();

  const { data: factions = [] } = useQuery({
    queryKey: ['factions'],
    queryFn: () => base44.entities.RivalFaction.filter({ is_active: true }),
    refetchInterval: 30000
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['factionActivities'],
    queryFn: () => base44.entities.FactionActivity.filter({ status: 'in_progress' }),
    refetchInterval: 10000
  });

  const generateFactionMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a unique rival criminal faction:

Create a compelling rival faction with:
1. Name (intimidating, memorable)
2. Description (2-3 sentences about their operations)
3. Faction type (gang/cartel/mafia/corporation)
4. Power level (50-150)
5. Aggression (30-90)
6. Intelligence (40-80)
7. Resources (50000-200000)
8. Strategy (aggressive_expansion/defensive/economic/guerrilla)

Make it unique and threatening. Return JSON.`;

      const aiFaction = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            faction_type: { type: 'string' },
            power_level: { type: 'number' },
            aggression: { type: 'number' },
            intelligence: { type: 'number' },
            resources: { type: 'number' },
            strategy: { type: 'string' }
          }
        }
      });

      const faction = await base44.entities.RivalFaction.create({
        ...aiFaction,
        controlled_territories: [],
        reputation: 0,
        is_active: true,
        color: '#DC2626'
      });

      return faction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['factions']);
      toast.success('New rival faction emerged!');
    }
  });

  const generateAttackMutation = useMutation({
    mutationFn: async (faction) => {
      const territories = await base44.entities.Territory.filter({
        controlling_crew_id: playerData.crew_id
      });

      if (territories.length === 0) {
        throw new Error('No territories to attack');
      }

      const targetTerritory = territories[Math.floor(Math.random() * territories.length)];

      const prompt = `Generate a faction attack scenario:

Faction: ${faction.name} (${faction.faction_type})
Target: ${targetTerritory.name}
Faction Power: ${faction.power_level}
Aggression: ${faction.aggression}

Create attack scenario with:
1. Activity type (territory_raid/counter_attack/supply_disruption)
2. Threat level (30-90)
3. Power committed (${faction.power_level * 0.5}-${faction.power_level})
4. Description (dramatic, 2-3 sentences)
5. Attack strategy details

Return JSON.`;

      const scenario = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            activity_type: { type: 'string' },
            threat_level: { type: 'number' },
            power_committed: { type: 'number' },
            description: { type: 'string' },
            strategy_details: { type: 'object' }
          }
        }
      });

      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 6);

      const activity = await base44.entities.FactionActivity.create({
        faction_id: faction.id,
        faction_name: faction.name,
        activity_type: scenario.activity_type,
        target_type: 'territory',
        target_id: targetTerritory.id,
        target_name: targetTerritory.name,
        status: 'in_progress',
        threat_level: scenario.threat_level,
        power_committed: scenario.power_committed,
        description: scenario.description,
        ai_generated_scenario: scenario.strategy_details,
        defenders: [],
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString()
      });

      await base44.entities.Territory.update(targetTerritory.id, {
        is_contested: true
      });

      if (playerData.crew_id) {
        await base44.entities.CrewActivity.create({
          crew_id: playerData.crew_id,
          activity_type: 'territory_lost',
          title: '⚠️ Under Attack!',
          description: `${faction.name} is attacking ${targetTerritory.name}!`,
          player_id: playerData.id,
          player_username: playerData.username
        });
      }

      return activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['factionActivities']);
      queryClient.invalidateQueries(['territories']);
      toast.warning('Your territory is under attack!');
    }
  });

  const defendActivityMutation = useMutation({
    mutationFn: async (activity) => {
      const defensePower = playerData.strength_score * 10;
      const success = defensePower > activity.power_committed * 0.7;

      await base44.entities.FactionActivity.update(activity.id, {
        status: success ? 'failed' : 'success',
        defenders: [
          ...(activity.defenders || []),
          { player_id: playerData.id, contribution: defensePower }
        ],
        outcome: {
          casualties: success ? 0 : Math.floor(Math.random() * 3),
          loot_lost: success ? 0 : Math.floor(Math.random() * 5000),
          territory_lost: !success,
          reputation_impact: success ? 10 : -20
        }
      });

      if (activity.target_type === 'territory') {
        await base44.entities.Territory.update(activity.target_id, {
          is_contested: false,
          control_percentage: success ? 100 : 50
        });
      }

      return success;
    },
    onSuccess: (success) => {
      queryClient.invalidateQueries(['factionActivities']);
      queryClient.invalidateQueries(['territories']);
      toast[success ? 'success' : 'error'](
        success ? 'Attack repelled!' : 'Defense failed!'
      );
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-red-500/20">
        <CardHeader className="border-b border-red-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-red-400" />
              Rival Factions
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30"
              onClick={() => generateFactionMutation.mutate()}
              disabled={generateFactionMutation.isPending}
            >
              {generateFactionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Spawn Faction'
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Active Threats */}
      {activities.length > 0 && (
        <Card className="glass-panel border-red-500/30">
          <CardHeader className="border-b border-red-500/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Active Threats ({activities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-white">{activity.faction_name}</h4>
                    <p className="text-sm text-red-300">{activity.description}</p>
                  </div>
                  <Badge className="bg-red-600">
                    Threat: {activity.threat_level}
                  </Badge>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Target: {activity.target_name}</span>
                    <span>Power: {activity.power_committed}</span>
                  </div>
                  <Progress
                    value={(activity.power_committed / 200) * 100}
                    className="h-2 [&>div]:bg-red-600"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                  onClick={() => defendActivityMutation.mutate(activity)}
                  disabled={defendActivityMutation.isPending}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Defend
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Faction List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factions.map((faction) => {
          const FactionIcon = factionTypeIcons[faction.faction_type];

          return (
            <Card key={faction.id} className="glass-panel border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-red-900/30">
                      <FactionIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{faction.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">
                        {faction.faction_type}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {faction.description}
                </p>

                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div className="text-center p-2 rounded bg-slate-900/30">
                    <p className="text-gray-400">Power</p>
                    <p className="font-bold text-white">{faction.power_level}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-slate-900/30">
                    <p className="text-gray-400">Aggression</p>
                    <p className="font-bold text-red-400">{faction.aggression}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-slate-900/30">
                    <p className="text-gray-400">Intel</p>
                    <p className="font-bold text-cyan-400">{faction.intelligence}</p>
                  </div>
                </div>

                <Badge className={`w-full justify-center mb-3 bg-gradient-to-r ${
                  strategyColors[faction.strategy] || 'from-gray-600 to-gray-700'
                }`}>
                  {faction.strategy ? faction.strategy.replace('_', ' ') : 'Unknown'}
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-red-500/30"
                  onClick={() => generateAttackMutation.mutate(faction)}
                  disabled={generateAttackMutation.isPending || !playerData.crew_id}
                >
                  {generateAttackMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Swords className="w-4 h-4 mr-2" />
                      Simulate Attack
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}