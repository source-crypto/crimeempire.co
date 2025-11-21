import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Target, TrendingDown, Shield, Package, Swords, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const eventTypes = {
  turf_war: { icon: Swords, label: 'Turf War', cost: 50000, repCost: 10 },
  market_manipulation: { icon: TrendingDown, label: 'Market Manipulation', cost: 75000, repCost: 15 },
  law_crackdown: { icon: Shield, label: 'Law Crackdown', cost: 60000, repCost: 20 },
  rival_sabotage: { icon: Target, label: 'Rival Sabotage', cost: 80000, repCost: 25 },
  black_market_surge: { icon: Package, label: 'Black Market Surge', cost: 70000, repCost: 5 },
  faction_conflict: { icon: Swords, label: 'Faction Conflict', cost: 100000, repCost: 30 }
};

export default function PlayerInitiatedEvents({ playerData, crewData }) {
  const [selectedEvent, setSelectedEvent] = useState('turf_war');
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const queryClient = useQueryClient();

  const { data: territories = [] } = useQuery({
    queryKey: ['allTerritories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const { data: initiatedEvents = [] } = useQuery({
    queryKey: ['playerInitiatedEvents', playerData?.id],
    queryFn: () => base44.entities.PlayerInitiatedEvent.filter({ 
      player_id: playerData.id 
    }, '-created_date', 10),
    enabled: !!playerData
  });

  const initiateEventMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTerritory) throw new Error('Select a territory');
      
      const eventConfig = eventTypes[selectedEvent];
      const territory = territories.find(t => t.id === selectedTerritory);

      if (playerData.crypto_balance < eventConfig.cost) {
        throw new Error('Insufficient funds');
      }

      if ((crewData?.reputation || 0) < eventConfig.repCost) {
        throw new Error('Insufficient reputation');
      }

      const prompt = `Generate a player-initiated ${selectedEvent.replace('_', ' ')} event for ${territory.name}.

Player Level: ${playerData.level}
Territory Control: ${territory.control_percentage}%
Territory Type: ${territory.resource_type}
Current World State: Active conflicts, market volatility

Create a dramatic event with:
1. Title and detailed description
2. Multiple cascading effects on territory, market, and factions
3. Success probability based on player resources and world state
4. Potential outcomes (both success and failure scenarios)
5. Timeline of how the event will unfold

Make it immersive and consequential.`;

      const eventData = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            success_rate: { type: "number" },
            effects: {
              type: "object",
              properties: {
                territory_control_shift: { type: "number" },
                market_price_changes: { type: "object" },
                faction_relationships: { type: "object" },
                heat_increase: { type: "number" }
              }
            },
            outcomes: {
              type: "object",
              properties: {
                success: { type: "string" },
                failure: { type: "string" },
                neutral: { type: "string" }
              }
            }
          }
        }
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - eventConfig.cost
      });

      if (crewData) {
        await base44.entities.Crew.update(crewData.id, {
          reputation: crewData.reputation - eventConfig.repCost
        });
      }

      const worldEvent = await base44.entities.WorldEvent.create({
        event_name: eventData.title,
        event_type: selectedEvent,
        description: eventData.description,
        affected_territories: [selectedTerritory],
        severity: 'major',
        status: 'active',
        gameplay_effects: eventData.effects,
        ai_generated: true,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });

      await base44.entities.PlayerInitiatedEvent.create({
        player_id: playerData.id,
        player_username: playerData.username,
        event_request_type: selectedEvent,
        target_territory_id: selectedTerritory,
        target_territory_name: territory.name,
        resource_cost: eventConfig.cost,
        reputation_cost: eventConfig.repCost,
        ai_generated_event: {
          event_id: worldEvent.id,
          title: eventData.title,
          description: eventData.description,
          effects: eventData.effects
        },
        status: 'active',
        success_rate: eventData.success_rate,
        outcomes: eventData.outcomes
      });

      await base44.entities.TransactionLog.create({
        transaction_type: 'purchase',
        player_id: playerData.id,
        player_username: playerData.username,
        amount: eventConfig.cost,
        description: `Initiated ${eventConfig.label} in ${territory.name}`,
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerInitiatedEvents']);
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['crew']);
      queryClient.invalidateQueries(['worldEvents']);
      toast.success('Event initiated successfully!');
      setSelectedTerritory('');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (!playerData) return null;

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-orange-500/20">
        <CardHeader className="border-b border-orange-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            Initiate World Event
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Event Type</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="bg-slate-900/50 border-orange-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eventTypes).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} - ${config.cost.toLocaleString()} / {config.repCost} Rep
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Target Territory</label>
            <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
              <SelectTrigger className="bg-slate-900/50 border-orange-500/20 text-white">
                <SelectValue placeholder="Select territory" />
              </SelectTrigger>
              <SelectContent>
                {territories.map((territory) => (
                  <SelectItem key={territory.id} value={territory.id}>
                    {territory.name} ({territory.resource_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-lg bg-orange-900/20 border border-orange-500/30">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Cost:</span>
                <span className="text-orange-400 ml-2">${eventTypes[selectedEvent].cost.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Reputation:</span>
                <span className="text-red-400 ml-2">-{eventTypes[selectedEvent].repCost}</span>
              </div>
              <div>
                <span className="text-gray-400">Your Balance:</span>
                <span className="text-white ml-2">${playerData.crypto_balance.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Crew Rep:</span>
                <span className="text-white ml-2">{crewData?.reputation || 0}</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-orange-600 to-red-600"
            onClick={() => initiateEventMutation.mutate()}
            disabled={initiateEventMutation.isPending || !selectedTerritory}
          >
            {initiateEventMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Initiating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Initiate Event
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel border-orange-500/20">
        <CardHeader className="border-b border-orange-500/20">
          <CardTitle className="text-white text-sm">Your Initiated Events</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {initiatedEvents.length === 0 ? (
            <p className="text-center text-gray-400 py-4 text-sm">No events initiated</p>
          ) : (
            <div className="space-y-2">
              {initiatedEvents.map((event) => (
                <div key={event.id} className="p-3 rounded-lg bg-slate-900/30 border border-orange-500/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-sm">{event.event_request_type.replace('_', ' ')}</h4>
                      <p className="text-xs text-gray-400">{event.target_territory_name}</p>
                    </div>
                    <Badge className={
                      event.status === 'active' ? 'bg-orange-600' :
                      event.status === 'completed' ? 'bg-green-600' : 'bg-red-600'
                    }>
                      {event.status}
                    </Badge>
                  </div>
                  {event.success_rate && (
                    <p className="text-xs text-gray-400">Success Rate: {event.success_rate}%</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}