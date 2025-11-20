import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Globe, Zap, Shield, TrendingDown, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const eventIcons = {
  law_crackdown: AlertTriangle,
  economic_crisis: TrendingDown,
  faction_alliance: Users,
  faction_betrayal: Shield,
  gang_war: Zap,
  market_boom: TrendingDown,
  police_raid: AlertTriangle,
  territory_uprising: Globe
};

const severityColors = {
  minor: 'bg-blue-600',
  moderate: 'bg-yellow-600',
  major: 'bg-orange-600',
  catastrophic: 'bg-red-600'
};

export default function WorldEventSystem({ playerData }) {
  const queryClient = useQueryClient();

  const { data: activeEvents = [] } = useQuery({
    queryKey: ['worldEvents', 'active'],
    queryFn: () => base44.entities.WorldEvent.filter({ status: 'active' }),
    refetchInterval: 30000
  });

  const generateEventMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a major world event for a crime game:

Current Game State:
- Active Players: Multiple crews
- Territories: Contested
- Market: Dynamic

Create a dramatic world event:
1. Event name (compelling)
2. Event type (law_crackdown/economic_crisis/faction_alliance/gang_war)
3. Description (2-3 sentences, dramatic)
4. Narrative (story context, engaging)
5. Severity (moderate/major/catastrophic)
6. Market impact (price_modifier: -0.5 to 0.5, demand/supply changes)
7. Gameplay effects (wanted_level_increase, heat_modifier, revenue_modifier, defense_modifier)

Make it feel like a major event that affects the entire game world. Return JSON.`;

      const eventData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            event_name: { type: 'string' },
            event_type: { type: 'string' },
            description: { type: 'string' },
            narrative: { type: 'string' },
            severity: { type: 'string' },
            market_impact: {
              type: 'object',
              properties: {
                price_modifier: { type: 'number' },
                demand_change: { type: 'number' },
                supply_change: { type: 'number' }
              }
            },
            gameplay_effects: {
              type: 'object',
              properties: {
                wanted_level_increase: { type: 'number' },
                heat_modifier: { type: 'number' },
                revenue_modifier: { type: 'number' },
                defense_modifier: { type: 'number' }
              }
            }
          }
        }
      });

      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 12);

      return await base44.entities.WorldEvent.create({
        ...eventData,
        status: 'active',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        affected_territories: [],
        affected_factions: [],
        player_participation: [],
        ai_generated: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['worldEvents']);
      toast.warning('⚠️ World Event: Check the global feed!');
    }
  });

  const participateEventMutation = useMutation({
    mutationFn: async (event) => {
      const participation = event.player_participation || [];
      const existingIndex = participation.findIndex(p => p.player_id === playerData.id);

      if (existingIndex >= 0) {
        participation[existingIndex].contribution += 10;
      } else {
        participation.push({
          player_id: playerData.id,
          contribution: 10,
          side: 'resistance'
        });
      }

      await base44.entities.WorldEvent.update(event.id, {
        player_participation: participation
      });

      await base44.entities.Player.update(playerData.id, {
        experience: playerData.experience + 100
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['worldEvents']);
      queryClient.invalidateQueries(['player']);
      toast.success('Event participation recorded!');
    }
  });

  return (
    <Card className="glass-panel border-red-500/20">
      <CardHeader className="border-b border-red-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="w-5 h-5 text-red-400" />
            World Events
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/30"
            onClick={() => generateEventMutation.mutate()}
            disabled={generateEventMutation.isPending}
          >
            {generateEventMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Generate Event'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {activeEvents.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No active world events</p>
          </div>
        ) : (
          activeEvents.map((event) => {
            const EventIcon = eventIcons[event.event_type] || Globe;
            const isParticipating = event.player_participation?.some(p => p.player_id === playerData?.id);

            return (
              <div key={event.id} className="p-4 rounded-lg bg-red-900/20 border border-red-500/30">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-red-900/30">
                    <EventIcon className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-white">{event.event_name}</h4>
                      <Badge className={severityColors[event.severity]}>
                        {event.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{event.description}</p>
                    <p className="text-xs text-gray-400 mb-3">{event.narrative}</p>

                    {event.gameplay_effects && (
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        {event.gameplay_effects.wanted_level_increase > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">
                              Heat +{event.gameplay_effects.wanted_level_increase}
                            </span>
                          </div>
                        )}
                        {event.gameplay_effects.revenue_modifier !== 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-yellow-400" />
                            <span className="text-yellow-400">
                              Revenue {event.gameplay_effects.revenue_modifier > 0 ? '+' : ''}
                              {(event.gameplay_effects.revenue_modifier * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600"
                      onClick={() => participateEventMutation.mutate(event)}
                      disabled={participateEventMutation.isPending || isParticipating}
                    >
                      {isParticipating ? 'Participating' : 'Participate'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}