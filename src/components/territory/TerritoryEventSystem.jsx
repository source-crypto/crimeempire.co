import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Shield, DollarSign, Zap, Clock, 
  Users, TrendingUp, XCircle, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInHours } from 'date-fns';

const eventIcons = {
  internal_gang_war: Users,
  turf_clash: Shield,
  law_enforcement_raid: AlertTriangle,
  black_market_opportunity: DollarSign,
  resource_shortage: XCircle,
  intel_leak: Zap,
  corruption_scandal: TrendingUp
};

const severityColors = {
  minor: 'bg-yellow-600',
  moderate: 'bg-orange-600',
  major: 'bg-red-600',
  critical: 'bg-red-800'
};

export default function TerritoryEventSystem({ territory, playerData }) {
  const [expandedEvent, setExpandedEvent] = useState(null);
  const queryClient = useQueryClient();

  if (!territory || !playerData) {
    return null;
  }

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['territoryEvents', territory.id],
    queryFn: () => base44.entities.TerritoryEvent.filter({ 
      territory_id: territory.id, 
      status: 'active' 
    }, '-created_date'),
    refetchInterval: 30000
  });

  const generateEventMutation = useMutation({
    mutationFn: async () => {
      const enterprises = await base44.entities.CriminalEnterprise.filter({ 
        location: territory.id 
      });
      
      const developments = await base44.entities.TerritoryDevelopment.filter({ 
        territory_id: territory.id 
      });

      const recentActivities = await base44.entities.CrewActivity.filter(
        { crew_id: playerData.crew_id },
        '-created_date',
        10
      );

      const prompt = `You are generating a dynamic territory event for a crime strategy game.

Territory: ${territory.name} (${territory.resource_type} district)
Control: ${territory.control_percentage}%
Enterprises: ${enterprises.length} active
Development Level: ${developments.length} projects
Recent Player Actions: ${recentActivities.slice(0, 5).map(a => a.activity_type).join(', ')}

Generate ONE immersive territory event that fits the game world. Consider:
- High enterprise activity = more law enforcement attention or rival interest
- Low security = internal conflicts or external threats
- High development = lucrative opportunities or corruption
- Recent heists/battles = retaliation or heat

Event types: internal_gang_war, turf_clash, law_enforcement_raid, black_market_opportunity, resource_shortage, intel_leak, corruption_scandal

Create a narrative-rich event with 3 resolution options that have different risk/reward profiles.`;

      const eventData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            event_type: { 
              type: 'string',
              enum: ['internal_gang_war', 'turf_clash', 'law_enforcement_raid', 'black_market_opportunity', 'resource_shortage', 'intel_leak', 'corruption_scandal']
            },
            severity: { 
              type: 'string',
              enum: ['minor', 'moderate', 'major', 'critical']
            },
            title: { type: 'string' },
            description: { type: 'string' },
            narrative: { type: 'string' },
            effects: {
              type: 'object',
              properties: {
                revenue_modifier: { type: 'number' },
                security_impact: { type: 'number' },
                heat_increase: { type: 'number' },
                resource_gain: { type: 'number' }
              }
            },
            resolution_options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  cost: { type: 'number' },
                  success_probability: { type: 'number' },
                  potential_reward: { type: 'string' },
                  risks: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      return await base44.entities.TerritoryEvent.create({
        territory_id: territory.id,
        territory_name: territory.name,
        ...eventData,
        trigger_factors: {
          enterprise_activity: enterprises.length,
          development_level: developments.length,
          player_actions: recentActivities.slice(0, 3).map(a => a.activity_type)
        },
        expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryEvents']);
      toast.success('New territory event detected!');
    },
    onError: () => {
      toast.error('Failed to generate event');
    }
  });

  const resolveEventMutation = useMutation({
    mutationFn: async ({ eventId, option }) => {
      const event = events.find(e => e.id === eventId);
      
      if (playerData.crypto_balance < option.cost) {
        throw new Error('Insufficient funds');
      }

      const successRoll = Math.random() * 100;
      const success = successRoll < option.success_probability;

      const outcome = {
        action_taken: option.action,
        success,
        cost: option.cost,
        reward: success ? option.potential_reward : 'None',
        consequences: success ? [] : option.risks
      };

      await base44.entities.TerritoryEvent.update(eventId, {
        status: success ? 'resolved' : 'failed',
        resolution_action: option.action,
        outcome
      });

      const newBalance = playerData.crypto_balance - option.cost;
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: success ? newBalance + (event.effects.resource_gain || 0) : newBalance
      });

      if (success && event.effects.revenue_modifier) {
        await base44.entities.Territory.update(territory.id, {
          revenue_multiplier: territory.revenue_multiplier + event.effects.revenue_modifier
        });
      }

      await base44.entities.CrewActivity.create({
        crew_id: playerData.crew_id,
        activity_type: success ? 'territory_captured' : 'territory_lost',
        title: success ? `✓ ${event.title} - Resolved` : `✗ ${event.title} - Failed`,
        description: success ? option.potential_reward : 'Event resolution unsuccessful',
        player_id: playerData.id,
        player_username: playerData.username
      });

      return { success, outcome };
    },
    onSuccess: ({ success }) => {
      queryClient.invalidateQueries(['territoryEvents']);
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['territories']);
      toast.success(success ? 'Event resolved successfully!' : 'Event resolution failed');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (isLoading) {
    return (
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-purple-400" />
              Active Territory Events
              <Badge className="ml-2 bg-purple-600">{events.length}</Badge>
            </CardTitle>
            <Button
              size="sm"
              onClick={() => generateEventMutation.mutate()}
              disabled={generateEventMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
            >
              {generateEventMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Scan for Events
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No active events in this territory</p>
              <p className="text-sm mt-1">Click "Scan for Events" to check for new developments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const Icon = eventIcons[event.event_type] || AlertTriangle;
                const hoursLeft = event.expires_at ? differenceInHours(new Date(event.expires_at), new Date()) : 0;
                const isExpanded = expandedEvent === event.id;

                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-purple-400 mt-1" />
                        <div>
                          <h4 className="font-semibold text-white">{event.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={severityColors[event.severity]}>
                          {event.severity}
                        </Badge>
                        {hoursLeft > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{hoursLeft}h left</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {event.narrative && (
                      <div className="mb-3 p-3 bg-slate-950/50 rounded-lg border border-purple-500/10">
                        <p className="text-sm text-gray-300 italic">{event.narrative}</p>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mb-3"
                      onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                    >
                      {isExpanded ? 'Hide Options' : 'Show Resolution Options'}
                    </Button>

                    {isExpanded && event.resolution_options && (
                      <div className="space-y-2">
                        {event.resolution_options.map((option, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-semibold text-white text-sm">{option.action}</h5>
                                <p className="text-xs text-gray-400 mt-1">
                                  Success: {option.success_probability}%
                                </p>
                              </div>
                              <Badge variant="outline" className="text-cyan-400">
                                ${option.cost.toLocaleString()}
                              </Badge>
                            </div>
                            <p className="text-xs text-green-400 mb-2">
                              ✓ {option.potential_reward}
                            </p>
                            {option.risks && option.risks.length > 0 && (
                              <div className="text-xs text-red-400">
                                {option.risks.map((risk, i) => (
                                  <p key={i}>✗ {risk}</p>
                                ))}
                              </div>
                            )}
                            <Button
                              size="sm"
                              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-cyan-600"
                              onClick={() => resolveEventMutation.mutate({ eventId: event.id, option })}
                              disabled={resolveEventMutation.isPending || playerData.crypto_balance < option.cost}
                            >
                              {resolveEventMutation.isPending ? (
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              ) : null}
                              Take Action
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}