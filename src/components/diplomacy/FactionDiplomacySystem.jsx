import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Handshake, Swords, TrendingUp, Shield, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const relationshipIcons = {
  alliance: Handshake,
  non_aggression: Shield,
  trade_agreement: TrendingUp,
  rivalry: Swords,
  war: AlertTriangle,
  neutral: Shield
};

const relationshipColors = {
  alliance: 'bg-green-600',
  non_aggression: 'bg-blue-600',
  trade_agreement: 'bg-cyan-600',
  rivalry: 'bg-orange-600',
  war: 'bg-red-600',
  neutral: 'bg-gray-600'
};

export default function FactionDiplomacySystem() {
  const queryClient = useQueryClient();

  const { data: factions = [] } = useQuery({
    queryKey: ['factions'],
    queryFn: () => base44.entities.RivalFaction.filter({ is_active: true })
  });

  const { data: relations = [] } = useQuery({
    queryKey: ['factionDiplomacy'],
    queryFn: () => base44.entities.FactionDiplomacy.filter({ status: 'active' }),
    refetchInterval: 30000
  });

  const generateRelationMutation = useMutation({
    mutationFn: async () => {
      if (factions.length < 2) {
        throw new Error('Need at least 2 factions');
      }

      const factionA = factions[Math.floor(Math.random() * factions.length)];
      const remaining = factions.filter(f => f.id !== factionA.id);
      const factionB = remaining[Math.floor(Math.random() * remaining.length)];

      const prompt = `Generate diplomatic relations between two criminal factions:

Faction A: ${factionA.name} (${factionA.faction_type})
Faction B: ${factionB.name} (${factionB.faction_type})

Create relation with:
1. Relationship type (alliance/non_aggression/trade_agreement/rivalry)
2. Trust level (30-80)
3. Treaty terms (duration in hours, benefits)
4. Betrayal likelihood (10-60 based on relationship)

Consider faction types and strategies. Return JSON.`;

      const relationData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            relationship_type: { type: 'string' },
            trust_level: { type: 'number' },
            treaty_terms: {
              type: 'object',
              properties: {
                duration: { type: 'number' },
                trade_bonus: { type: 'number' },
                military_support: { type: 'boolean' },
                territory_respect: { type: 'boolean' }
              }
            },
            betrayal_likelihood: { type: 'number' }
          }
        }
      });

      const formedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + relationData.treaty_terms.duration);

      return await base44.entities.FactionDiplomacy.create({
        faction_a_id: factionA.id,
        faction_a_name: factionA.name,
        faction_b_id: factionB.id,
        faction_b_name: factionB.name,
        ...relationData,
        status: 'active',
        events_log: [],
        formed_at: formedAt.toISOString(),
        expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['factionDiplomacy']);
      toast.success('New diplomatic relation formed!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const betrayalCheckMutation = useMutation({
    mutationFn: async (relation) => {
      const shouldBetray = Math.random() * 100 < relation.betrayal_likelihood;

      if (shouldBetray) {
        await base44.entities.FactionDiplomacy.update(relation.id, {
          status: 'broken',
          relationship_type: 'rivalry',
          trust_level: 0,
          events_log: [
            ...(relation.events_log || []),
            {
              event_type: 'betrayal',
              description: `${relation.faction_a_name} betrayed ${relation.faction_b_name}!`,
              trust_impact: -100,
              timestamp: new Date().toISOString()
            }
          ]
        });

        return { betrayed: true, betrayer: relation.faction_a_name };
      }

      return { betrayed: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['factionDiplomacy']);
      if (result.betrayed) {
        toast.warning(`⚠️ Betrayal! ${result.betrayer} broke the pact!`);
      }
    }
  });

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Handshake className="w-5 h-5 text-purple-400" />
            Faction Diplomacy
          </CardTitle>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-cyan-600"
            onClick={() => generateRelationMutation.mutate()}
            disabled={generateRelationMutation.isPending || factions.length < 2}
          >
            {generateRelationMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Form Relation
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {relations.length === 0 ? (
          <div className="text-center py-8">
            <Handshake className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No diplomatic relations yet</p>
          </div>
        ) : (
          relations.map((relation) => {
            const RelationIcon = relationshipIcons[relation.relationship_type];

            return (
              <div key={relation.id} className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RelationIcon className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {relation.faction_a_name} ↔ {relation.faction_b_name}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {relation.relationship_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <Badge className={relationshipColors[relation.relationship_type]}>
                    {relation.relationship_type.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Trust Level</span>
                    <span>{relation.trust_level}%</span>
                  </div>
                  <Progress value={relation.trust_level} className="h-1" />
                </div>

                {relation.treaty_terms && (
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    {relation.treaty_terms.trade_bonus > 0 && (
                      <div className="text-gray-400">
                        Trade: <span className="text-green-400">+{relation.treaty_terms.trade_bonus}%</span>
                      </div>
                    )}
                    {relation.treaty_terms.military_support && (
                      <div className="text-gray-400">
                        Military: <span className="text-cyan-400">Active</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-400">Betrayal Risk</span>
                  <span className={`font-semibold ${
                    relation.betrayal_likelihood > 50 ? 'text-red-400' : 
                    relation.betrayal_likelihood > 30 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {relation.betrayal_likelihood}%
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-red-500/30 text-xs"
                  onClick={() => betrayalCheckMutation.mutate(relation)}
                  disabled={betrayalCheckMutation.isPending}
                >
                  Check for Betrayal
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}