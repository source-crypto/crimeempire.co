import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, DollarSign, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInHours } from 'date-fns';

const eventIcons = {
  internal_gang_war: AlertTriangle,
  turf_clash: Zap,
  law_enforcement_raid: Shield,
  black_market_deal: DollarSign,
  protection_racket: Shield,
  rival_sabotage: AlertTriangle,
  local_uprising: AlertTriangle
};

const eventColors = {
  minor: 'bg-blue-600',
  moderate: 'bg-yellow-600',
  major: 'bg-orange-600',
  critical: 'bg-red-600'
};

export default function TerritoryEventSystem({ territoryId, playerData }) {
  const [generatingEvent, setGeneratingEvent] = useState(false);
  const queryClient = useQueryClient();

  if (!territoryId || !playerData) {
    return null;
  }

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['territoryEvents', territoryId],
    queryFn: () => base44.entities.TerritoryEvent.filter({ territory_id: territoryId, status: 'active' }),
    refetchInterval: 30000
  });

  const { data: territory } = useQuery({
    queryKey: ['territory', territoryId],
    queryFn: async () => {
      const territories = await base44.entities.Territory.filter({ id: territoryId });
      return territories[0];
    }
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['territoryEnterprises', territoryId],
    queryFn: async () => {
      return await base44.entities.CriminalEnterprise.list();
    }
  });

  const generateEventMutation = useMutation({
    mutationFn: async () => {
      setGeneratingEvent(true);
      
      const prompt = `Generate a dynamic territory event for "${territory.name}" (${territory.resource_type} district).

Context:
- Control: ${territory.control_percentage}%
- Revenue: ${territory.revenue_multiplier}x
- Active Enterprises: ${enterprises.length}
- Player Level: ${playerData.level}
- Current Heat: ${playerData.wanted_level}/5

Generate ONE event that matches the current state. Include:
1. Event type (internal_gang_war, turf_clash, law_enforcement_raid, black_market_deal, protection_racket, rival_sabotage, local_uprising)
2. Compelling title and description
3. Severity (minor/moderate/major/critical)
4. Effects on revenue, control, and heat
5. 2-3 resolution options with costs and outcomes

Make it realistic and impactful.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            event_type: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            severity: { type: "string" },
            effects: {
              type: "object",
              properties: {
                revenue_modifier: { type: "number" },
                control_loss: { type: "number" },
                heat_increase: { type: "number" },
                opportunity_value: { type: "number" }
              }
            },
            resolution_options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  cost: { type: "number" },
                  outcome_description: { type: "string" }
                }
              }
            }
          }
        }
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      await base44.entities.TerritoryEvent.create({
        territory_id: territoryId,
        territory_name: territory.name,
        event_type: result.event_type,
        title: result.title,
        description: result.description,
        severity: result.severity,
        effects: result.effects,
        resolution_options: result.resolution_options,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        ai_generated: true
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryEvents']);
      toast.success('New territory event generated');
      setGeneratingEvent(false);
    },
    onError: () => {
      toast.error('Failed to generate event');
      setGeneratingEvent(false);
    }
  });

  const resolveEventMutation = useMutation({
    mutationFn: async ({ eventId, action }) => {
      const event = events.find(e => e.id === eventId);
      const selectedOption = event.resolution_options.find(opt => opt.action === action);

      if (selectedOption.cost > playerData.crypto_balance) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - selectedOption.cost
      });

      await base44.entities.TerritoryEvent.update(eventId, {
        status: 'resolved',
        resolved_action: action,
        outcome: {
          success: true,
          description: selectedOption.outcome_description
        }
      });

      await base44.entities.CrewActivity.create({
        crew_id: playerData.crew_id,
        activity_type: 'major_payout',
        title: `Event Resolved: ${event.title}`,
        description: selectedOption.outcome_description,
        player_id: playerData.id,
        player_username: playerData.username,
        value: selectedOption.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryEvents']);
      queryClient.invalidateQueries(['player']);
      toast.success('Event resolved successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resolve event');
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Territory Events</CardTitle>
            <Button
              size="sm"
              onClick={() => generateEventMutation.mutate()}
              disabled={generatingEvent || events.length >= 3}
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
            >
              {generatingEvent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Event
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
              <p>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No active events</p>
              <p className="text-sm mt-1">Generate an event to see what happens</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const Icon = eventIcons[event.event_type] || AlertTriangle;
                const hoursLeft = differenceInHours(new Date(event.expires_at), new Date());

                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-600/20">
                          <Icon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{event.title}</h4>
                          <p className="text-xs text-gray-400 mt-1">Expires in {hoursLeft}h</p>
                        </div>
                      </div>
                      <Badge className={eventColors[event.severity]}>
                        {event.severity}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-300 mb-4">{event.description}</p>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                      {event.effects?.revenue_modifier && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-yellow-400" />
                          <span className="text-gray-400">
                            Revenue: {event.effects.revenue_modifier > 0 ? '+' : ''}{(event.effects.revenue_modifier * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {event.effects?.control_loss && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-gray-400">
                            Control: -{event.effects.control_loss}%
                          </span>
                        </div>
                      )}
                      {event.effects?.heat_increase && (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-orange-400" />
                          <span className="text-gray-400">
                            Heat: +{event.effects.heat_increase}
                          </span>
                        </div>
                      )}
                      {event.effects?.opportunity_value && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-gray-400">
                            Opportunity: ${event.effects.opportunity_value.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase">Resolution Options</p>
                      {event.resolution_options?.map((option, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          className="w-full justify-between border-purple-500/20 hover:bg-purple-600/20"
                          onClick={() => resolveEventMutation.mutate({ eventId: event.id, action: option.action })}
                          disabled={resolveEventMutation.isPending || option.cost > playerData.crypto_balance}
                        >
                          <span className="text-left flex-1">{option.action}</span>
                          <span className="text-cyan-400">${option.cost.toLocaleString()}</span>
                        </Button>
                      ))}
                    </div>
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