import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, AlertTriangle, Loader2, Flame, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function EscalationManager({ playerData }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const queryClient = useQueryClient();

  const { data: governance = [] } = useQuery({
    queryKey: ['governance'],
    queryFn: () => base44.entities.Governance.list(),
    refetchInterval: 1000
  });

  const currentGovernance = governance[0];

  useEffect(() => {
    if (currentGovernance?.crisis_active && currentGovernance?.crisis_started_at) {
      const interval = setInterval(() => {
        const started = new Date(currentGovernance.crisis_started_at).getTime();
        const now = Date.now();
        const elapsed = (now - started) / 1000;
        const remaining = Math.max(0, 240 - elapsed);
        setTimeLeft(remaining);

        if (remaining === 0 && currentGovernance.escalation_phase === 'four_minute_crisis') {
          // Auto-transition to Galactic Propo
          transitionToGalacticPropoMutation.mutate();
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [currentGovernance]);

  const initiateCrisisMutation = useMutation({
    mutationFn: async () => {
      let gov = governance[0];
      if (!gov) {
        gov = await base44.entities.Governance.create({
          escalation_phase: 'normal',
          crisis_active: false,
          universal_constants: {
            experience_multiplier: 1,
            volatility_multiplier: 1,
            player_impact_multiplier: 1,
            diplomatic_tension_multiplier: 1
          }
        });
      }

      await base44.entities.Governance.update(gov.id, {
        escalation_phase: 'four_minute_crisis',
        crisis_active: true,
        crisis_timer: 240,
        crisis_started_at: new Date().toISOString(),
        universal_constants: {
          experience_multiplier: 4,
          volatility_multiplier: 3,
          player_impact_multiplier: 3,
          diplomatic_tension_multiplier: 2
        }
      });

      // Generate crisis event
      const prompt = `Generate DRAMATIC Four-Minute Crisis.

Create:
1. Crisis name and description
2. Massive market disruptions
3. Faction conflicts erupting
4. Supply line chaos
5. High-stakes player opportunities

Make it INTENSE and URGENT.`;

      const crisis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            event_name: { type: "string" },
            description: { type: "string" },
            market_impacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_type: { type: "string" },
                  price_multiplier: { type: "number" }
                }
              }
            },
            opportunities: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 4);

      await base44.entities.EconomicEvent.create({
        event_name: crisis.event_name,
        event_type: 'four_minute_crisis',
        severity: 'cosmic',
        ai_analysis: {
          root_cause: crisis.description,
          predicted_duration: 4,
          player_opportunities: crisis.opportunities
        },
        escalation_phase: 'four_minute',
        status: 'active',
        expires_at: expiresAt.toISOString()
      });

      // Broadcast
      await base44.entities.EventBroadcast.create({
        event_name: `🚨 FOUR-MINUTE CRISIS: ${crisis.event_name}`,
        event_type: 'four_minute_crisis',
        broadcast_message: crisis.description,
        is_global: true,
        status: 'active',
        expires_at: expiresAt.toISOString()
      });

      return crisis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['governance']);
      queryClient.invalidateQueries(['economicEvents']);
      toast.success('🚨 FOUR-MINUTE CRISIS INITIATED!');
    }
  });

  const transitionToGalacticPropoMutation = useMutation({
    mutationFn: async () => {
      const gov = governance[0];
      
      await base44.entities.Governance.update(gov.id, {
        escalation_phase: 'galactic_propo',
        crisis_active: false,
        galactic_propo_unlocked: true,
        universal_constants: {
          experience_multiplier: 2,
          volatility_multiplier: 2,
          player_impact_multiplier: 2,
          diplomatic_tension_multiplier: 3
        },
        cosmic_commodities: [
          { name: 'Quantum Essence', type: 'cosmic', unlock_phase: 'galactic_propo' },
          { name: 'Temporal Shards', type: 'cosmic', unlock_phase: 'galactic_propo' },
          { name: 'Void Crystals', type: 'cosmic', unlock_phase: 'galactic_propo' }
        ]
      });

      const prompt = `Generate Galactic Propo phase content.

Phase: Galaxy-wide political rearrangement
New cosmic commodities unlocked
Factions reveal true agendas
Ancient powers awaken

Generate:
1. Major geopolitical shifts
2. New commodity types
3. Faction agenda revelations
4. Ancient faction introductions`;

      const propo = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            event_name: { type: "string" },
            description: { type: "string" },
            geopolitical_shifts: {
              type: "array",
              items: { type: "string" }
            },
            ancient_factions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      await base44.entities.EconomicEvent.create({
        event_name: propo.event_name,
        event_type: 'galactic_propo',
        severity: 'cosmic',
        ai_analysis: {
          root_cause: propo.description,
          player_opportunities: propo.geopolitical_shifts
        },
        escalation_phase: 'galactic_propo',
        status: 'active'
      });

      // Create ancient factions
      for (const ancient of propo.ancient_factions.slice(0, 2)) {
        await base44.entities.RivalFaction.create({
          name: ancient.name,
          description: ancient.description,
          faction_type: 'ancient',
          power_level: 500,
          aggression: 70,
          intelligence: 90,
          resources: 10000000,
          strategy: 'cosmic_domination',
          is_active: true
        });
      }

      return propo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['governance']);
      queryClient.invalidateQueries(['economicEvents']);
      queryClient.invalidateQueries(['rivalFactions']);
      toast.success('🌌 GALACTIC PROPO PHASE UNLOCKED!');
    }
  });

  const transitionToUnuniversalMutation = useMutation({
    mutationFn: async () => {
      const gov = governance[0];

      await base44.entities.Governance.update(gov.id, {
        escalation_phase: 'ununiversal',
        ununiversal_unlocked: true,
        reality_fracture_level: 50,
        universal_constants: {
          experience_multiplier: 10,
          volatility_multiplier: 10,
          player_impact_multiplier: 5,
          diplomatic_tension_multiplier: 5
        },
        cosmic_commodities: [
          ...gov.cosmic_commodities,
          { name: 'Reality Fragments', type: 'existential', unlock_phase: 'ununiversal' },
          { name: 'Entropic Matter', type: 'existential', unlock_phase: 'ununiversal' },
          { name: 'Universal Constants', type: 'existential', unlock_phase: 'ununiversal' }
        ],
        player_survivors: [playerData.id]
      });

      const prompt = `Generate UNUNIVERSAL MODE - cosmic endgame.

Reality fractures
Existential resources
Multi-dimensional economics
Player shapes new universe laws

Generate:
1. Reality fracture description
2. New physics rules
3. Existential resource mechanics
4. Cosmic-level challenges`;

      const ununiversal = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            event_name: { type: "string" },
            description: { type: "string" },
            new_physics: {
              type: "array",
              items: { type: "string" }
            },
            existential_challenges: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      await base44.entities.EconomicEvent.create({
        event_name: ununiversal.event_name,
        event_type: 'ununiversal_shift',
        severity: 'cosmic',
        ai_analysis: {
          root_cause: ununiversal.description,
          player_opportunities: ununiversal.existential_challenges
        },
        escalation_phase: 'ununiversal',
        status: 'active'
      });

      return ununiversal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['governance']);
      queryClient.invalidateQueries(['economicEvents']);
      toast.success('🌀 UNUNIVERSAL MODE ACTIVATED!');
    }
  });

  if (!playerData) return null;

  const phaseColors = {
    normal: 'bg-green-600',
    four_minute_crisis: 'bg-red-600 animate-pulse',
    galactic_propo: 'bg-purple-600',
    ununiversal: 'bg-pink-600'
  };

  return (
    <Card className="glass-panel border-yellow-500/20">
      <CardHeader className="border-b border-yellow-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-yellow-400" />
          Escalation System
          <Badge className={phaseColors[currentGovernance?.escalation_phase || 'normal']}>
            {currentGovernance?.escalation_phase || 'Normal'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {currentGovernance?.crisis_active && (
          <div className="p-4 rounded-lg bg-red-900/30 border border-red-500/50 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <p className="text-red-400 font-bold text-lg">🚨 CRISIS ACTIVE</p>
              <p className="text-white font-mono text-xl">{Math.floor(timeLeft / 60)}:{String(Math.floor(timeLeft % 60)).padStart(2, '0')}</p>
            </div>
            <Progress value={(timeLeft / 240) * 100} className="h-3" />
            <p className="text-xs text-gray-300 mt-2">
              Experience ×{currentGovernance.universal_constants.experience_multiplier} | 
              Volatility ×{currentGovernance.universal_constants.volatility_multiplier} | 
              Impact ×{currentGovernance.universal_constants.player_impact_multiplier}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Button
            className="w-full bg-gradient-to-r from-red-600 to-orange-600"
            onClick={() => initiateCrisisMutation.mutate()}
            disabled={initiateCrisisMutation.isPending || currentGovernance?.crisis_active}
          >
            {initiateCrisisMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initiating...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Initiate 4-Minute Crisis</>
            )}
          </Button>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
            onClick={() => transitionToGalacticPropoMutation.mutate()}
            disabled={transitionToGalacticPropoMutation.isPending || currentGovernance?.escalation_phase !== 'four_minute_crisis'}
          >
            {transitionToGalacticPropoMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transitioning...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Enter Galactic Propo</>
            )}
          </Button>

          <Button
            className="w-full bg-gradient-to-r from-pink-600 to-purple-900"
            onClick={() => transitionToUnuniversalMutation.mutate()}
            disabled={transitionToUnuniversalMutation.isPending || !currentGovernance?.galactic_propo_unlocked}
          >
            {transitionToUnuniversalMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
            ) : (
              <>🌀 Activate Ununiversal Mode</>
            )}
          </Button>
        </div>

        {currentGovernance?.cosmic_commodities?.length > 0 && (
          <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
            <p className="text-purple-400 font-semibold text-sm mb-2">Cosmic Commodities Unlocked:</p>
            <div className="space-y-1">
              {currentGovernance.cosmic_commodities.map((commodity, idx) => (
                <div key={idx} className="text-xs text-gray-300">
                  ✨ {commodity.name} ({commodity.type})
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}