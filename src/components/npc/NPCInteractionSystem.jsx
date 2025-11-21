import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Shield, Package, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const npcIcons = {
  informant: User,
  fixer: Phone,
  corrupt_official: Shield,
  arms_dealer: Package,
  money_launderer: Package,
  hacker: User
};

export default function NPCInteractionSystem({ territoryId, playerData }) {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  if (!territoryId || !playerData) return null;

  const { data: territory } = useQuery({
    queryKey: ['territory', territoryId],
    queryFn: async () => {
      const territories = await base44.entities.Territory.filter({ id: territoryId });
      return territories[0];
    }
  });

  const { data: npcs = [] } = useQuery({
    queryKey: ['npcs', territoryId],
    queryFn: () => base44.entities.NPCContact.filter({ territory_id: territoryId })
  });

  const generateNPCMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);

      const prompt = `Generate an AI-driven NPC contact for ${territory.name} territory.

Territory Type: ${territory.resource_type}
Control Level: ${territory.control_percentage}%
Player Level: ${playerData.level}

Create ONE unique NPC with:
1. Name and personality
2. Type (informant, fixer, corrupt_official, arms_dealer, money_launderer, hacker)
3. Backstory (2-3 sentences)
4. 3-4 services they can provide with costs
5. Personality traits
6. Current intel they have

Make it immersive and fitting for the territory.`;

      const npcData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            npc_name: { type: "string" },
            npc_type: { type: "string" },
            backstory: { type: "string" },
            personality_traits: {
              type: "array",
              items: { type: "string" }
            },
            services: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  service_name: { type: "string" },
                  cost: { type: "number" },
                  description: { type: "string" },
                  cooldown_hours: { type: "number" }
                }
              }
            },
            current_intel: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      await base44.entities.NPCContact.create({
        npc_name: npcData.npc_name,
        npc_type: npcData.npc_type,
        territory_id: territoryId,
        territory_name: territory.name,
        loyalty: 50,
        trustworthiness: Math.floor(Math.random() * 30) + 60,
        services: npcData.services,
        personality: {
          traits: npcData.personality_traits,
          backstory: npcData.backstory
        },
        current_intel: npcData.current_intel,
        status: 'available',
        ai_generated: true
      });

      return npcData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['npcs']);
      toast.success('New NPC contact discovered');
      setGenerating(false);
    },
    onError: () => {
      toast.error('Failed to generate NPC');
      setGenerating(false);
    }
  });

  const useServiceMutation = useMutation({
    mutationFn: async ({ npcId, service }) => {
      if (playerData.crypto_balance < service.cost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - service.cost
      });

      await base44.entities.TransactionLog.create({
        transaction_type: 'purchase',
        player_id: playerData.id,
        player_username: playerData.username,
        counterparty_name: npcs.find(n => n.id === npcId)?.npc_name,
        amount: service.cost,
        description: `NPC Service: ${service.service_name}`,
        status: 'completed'
      });

      // Increase loyalty
      const npc = npcs.find(n => n.id === npcId);
      await base44.entities.NPCContact.update(npcId, {
        loyalty: Math.min(100, npc.loyalty + 5)
      });

      return { success: true, service: service.service_name };
    },
    onSuccess: ({ service }) => {
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['npcs']);
      toast.success(`Service acquired: ${service}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            NPC Contacts
            <Badge className="ml-2 bg-cyan-600">{npcs.length}</Badge>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => generateNPCMutation.mutate()}
            disabled={generating}
            className="bg-gradient-to-r from-cyan-600 to-blue-600"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Contact
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {npcs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No NPC contacts in this territory</p>
            <p className="text-sm mt-1">Find contacts to unlock services</p>
          </div>
        ) : (
          <div className="space-y-3">
            {npcs.map((npc) => {
              const Icon = npcIcons[npc.npc_type] || User;
              
              return (
                <div
                  key={npc.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-cyan-900/20">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{npc.npc_name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{npc.npc_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge className={npc.status === 'available' ? 'bg-green-600' : 'bg-red-600'}>
                      {npc.status}
                    </Badge>
                  </div>

                  {npc.personality?.backstory && (
                    <p className="text-sm text-gray-300 mb-3 italic">
                      "{npc.personality.backstory}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <span className="text-gray-400">Loyalty:</span>
                      <span className={`ml-1 ${
                        npc.loyalty > 75 ? 'text-green-400' :
                        npc.loyalty > 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {npc.loyalty}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Trust:</span>
                      <span className="text-cyan-400 ml-1">{npc.trustworthiness}%</span>
                    </div>
                  </div>

                  {npc.current_intel && npc.current_intel.length > 0 && (
                    <div className="mb-3 p-2 rounded bg-blue-900/20 border border-blue-500/20">
                      <p className="text-xs text-blue-400 font-semibold mb-1">Intel:</p>
                      {npc.current_intel.slice(0, 2).map((intel, idx) => (
                        <p key={idx} className="text-xs text-gray-300">• {intel}</p>
                      ))}
                    </div>
                  )}

                  {npc.services && npc.services.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 uppercase">Services:</p>
                      {npc.services.map((service, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          className="w-full justify-between border-purple-500/20 hover:bg-purple-600/20"
                          onClick={() => useServiceMutation.mutate({ npcId: npc.id, service })}
                          disabled={useServiceMutation.isPending || playerData.crypto_balance < service.cost}
                        >
                          <span className="text-left">{service.service_name}</span>
                          <span className="text-cyan-400">${service.cost.toLocaleString()}</span>
                        </Button>
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
  );
}