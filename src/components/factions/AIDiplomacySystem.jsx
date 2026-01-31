import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Handshake, Swords, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AIDiplomacySystem({ playerFaction }) {
  const queryClient = useQueryClient();
  const [negotiating, setNegotiating] = useState(false);

  const { data: allFactions = [] } = useQuery({
    queryKey: ['allFactions'],
    queryFn: () => base44.entities.Faction.list()
  });

  const { data: diplomacyRelations = [] } = useQuery({
    queryKey: ['diplomacy', playerFaction?.id],
    queryFn: () => base44.entities.FactionDiplomacy.filter({
      $or: [
        { faction_a_id: playerFaction.id },
        { faction_b_id: playerFaction.id }
      ]
    }),
    enabled: !!playerFaction?.id
  });

  const aiNegotiateMutation = useMutation({
    mutationFn: async (targetFaction) => {
      const prompt = `You are an AI diplomat negotiating between two criminal factions.

YOUR FACTION (${playerFaction.name}):
- Type: ${playerFaction.faction_type}
- Specialization: ${playerFaction.specialization}
- Power: ${playerFaction.total_power}
- Members: ${playerFaction.member_count}
- Personality: Aggression ${playerFaction.ai_personality?.aggression}, Diplomacy ${playerFaction.ai_personality?.diplomacy}

TARGET FACTION (${targetFaction.name}):
- Type: ${targetFaction.faction_type}
- Specialization: ${targetFaction.specialization}
- Power: ${targetFaction.total_power}
- Members: ${targetFaction.member_count}
- Personality: Aggression ${targetFaction.ai_personality?.aggression}, Diplomacy ${targetFaction.ai_personality?.diplomacy}

Analyze both factions' personalities, specializations, and power balance. Propose a diplomatic relationship and any trade agreements that would benefit both parties.

Return ONLY valid JSON:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_relationship: {
              type: "string",
              enum: ["alliance", "trade_partner", "neutral", "rivalry"]
            },
            trust_level: { type: "number" },
            trade_agreements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  resource_type: { type: "string" },
                  quantity: { type: "number" },
                  price: { type: "number" },
                  active: { type: "boolean" }
                }
              }
            },
            alliance_benefits: {
              type: "object",
              properties: {
                shared_intelligence: { type: "boolean" },
                military_support: { type: "boolean" },
                resource_sharing: { type: "boolean" }
              }
            },
            negotiation_outcome: { type: "string" },
            reasoning: { type: "string" }
          }
        }
      });

      // Create or update diplomacy relation
      const existingRelation = diplomacyRelations.find(
        r => (r.faction_a_id === playerFaction.id && r.faction_b_id === targetFaction.id) ||
             (r.faction_b_id === playerFaction.id && r.faction_a_id === targetFaction.id)
      );

      if (existingRelation) {
        await base44.entities.FactionDiplomacy.update(existingRelation.id, {
          relationship_type: response.recommended_relationship,
          trust_level: response.trust_level,
          trade_agreements: response.trade_agreements,
          alliance_benefits: response.alliance_benefits,
          negotiated_by_ai: true
        });
      } else {
        await base44.entities.FactionDiplomacy.create({
          faction_a_id: playerFaction.id,
          faction_b_id: targetFaction.id,
          relationship_type: response.recommended_relationship,
          trust_level: response.trust_level,
          trade_agreements: response.trade_agreements,
          alliance_benefits: response.alliance_benefits,
          negotiated_by_ai: true
        });
      }

      return { ...response, targetFaction };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['diplomacy']);
      toast.success(`AI negotiated ${data.recommended_relationship} with ${data.targetFaction.name}`);
      setNegotiating(false);
    },
    onError: () => toast.error('Negotiation failed')
  });

  const otherFactions = allFactions.filter(f => f.id !== playerFaction?.id);

  const getRelationIcon = (type) => {
    switch(type) {
      case 'alliance': return <Handshake className="w-4 h-4 text-green-400" />;
      case 'rivalry': return <Swords className="w-4 h-4 text-red-400" />;
      case 'war': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'trade_partner': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      default: return <Handshake className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-cyan-400" />
          AI Diplomacy System
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {diplomacyRelations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">Active Relations</h4>
            {diplomacyRelations.map(relation => {
              const otherFactionId = relation.faction_a_id === playerFaction.id 
                ? relation.faction_b_id 
                : relation.faction_a_id;
              const otherFaction = allFactions.find(f => f.id === otherFactionId);
              
              return (
                <div key={relation.id} className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getRelationIcon(relation.relationship_type)}
                      <span className="text-sm font-semibold text-white">{otherFaction?.name}</span>
                    </div>
                    <Badge className={
                      relation.relationship_type === 'alliance' ? 'bg-green-600' :
                      relation.relationship_type === 'rivalry' ? 'bg-red-600' :
                      relation.relationship_type === 'trade_partner' ? 'bg-blue-600' :
                      'bg-gray-600'
                    }>
                      {relation.relationship_type}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-gray-400">Trust Level: <span className="text-cyan-400">{relation.trust_level}/100</span></p>
                    {relation.trade_agreements?.length > 0 && (
                      <p className="text-gray-400">
                        Trade Agreements: <span className="text-green-400">{relation.trade_agreements.length} active</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-cyan-500/20 pt-4">
          <h4 className="text-sm font-semibold text-white mb-3">Other Factions</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {otherFactions.map(faction => (
              <div key={faction.id} className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-white">{faction.name}</h5>
                    <p className="text-xs text-gray-400">
                      Power: {faction.total_power} | Members: {faction.member_count}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => aiNegotiateMutation.mutate(faction)}
                    disabled={aiNegotiateMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    AI Negotiate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}