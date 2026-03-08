import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, Eye, Bomb, Handshake, FileText, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import AILimitBanner, { isAILimitError } from '../shared/AILimitBanner';

const actionTypes = {
  negotiate_peace: { icon: Handshake, label: 'Negotiate Peace', cost: 30000, role: 'president' },
  trade_agreement: { icon: FileText, label: 'Trade Agreement', cost: 25000, role: 'mayor' },
  intelligence_gathering: { icon: Eye, label: 'Intelligence Gathering', cost: 40000, role: 'spy_master' },
  sabotage: { icon: Bomb, label: 'Sabotage Operation', cost: 60000, role: 'spy_master' },
  covert_operation: { icon: Eye, label: 'Covert Operation', cost: 75000, role: 'spy_master' },
  form_alliance: { icon: Users, label: 'Form Alliance', cost: 50000, role: 'president' },
  declare_war: { icon: Bomb, label: 'Declare War', cost: 100000, role: 'president' }
};

function buildFallbackDiplomacy(action, faction, playerLevel) {
  const succChance = Math.max(20, Math.min(85, 50 + (playerLevel * 2) - ((faction.aggression || 50) / 2)));
  return {
    success_probability: Math.round(succChance),
    relationship_change: action === 'declare_war' ? -30 : action === 'form_alliance' ? 25 : 10,
    negotiation_log: [
      { round: 1, player_offer: 'Standard diplomatic contact established.', faction_response: `${faction.name} acknowledges your approach with measured interest.`, mood: 'neutral' },
      { round: 2, player_offer: 'Terms presented for consideration.', faction_response: succChance > 60 ? 'We see merit in this arrangement.' : 'Our leadership requires further deliberation.', mood: succChance > 60 ? 'positive' : 'cautious' }
    ],
    intel_gathered: {
      territory_plans: [`${faction.name} is focused on eastern expansion`, 'Supply disruptions have weakened their northern flank'],
      military_strength: faction.power_level || 100,
      weaknesses: ['Overextended supply lines', 'Internal leadership disputes'],
      secret_operations: ['Covert money laundering through shell corporations']
    },
    outcomes: {
      immediate_effect: `Initial contact with ${faction.name} complete.`,
      long_term_impact: 'Relationship dynamics are shifting based on your approach.',
      rewards: {}
    }
  };
}

export default function FactionDiplomacySystem({ playerData, crewData }) {
  const [selectedAction, setSelectedAction] = useState('negotiate_peace');
  const [selectedFaction, setSelectedFaction] = useState('');
  const [playerMessage, setPlayerMessage] = useState('');
  const [aiLimitHit, setAiLimitHit] = useState(false);
  const queryClient = useQueryClient();

  const { data: factions = [] } = useQuery({
    queryKey: ['rivalFactions'],
    queryFn: () => base44.entities.RivalFaction.list()
  });

  const { data: diplomacyActions = [] } = useQuery({
    queryKey: ['diplomacy', playerData?.id],
    queryFn: () => base44.entities.FactionDiplomacy.filter({ player_id: playerData.id }, '-created_date', 10),
    enabled: !!playerData
  });

  const initiateDiplomacyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFaction) throw new Error('Select a faction first');
      const actionConfig = actionTypes[selectedAction];
      const faction = factions.find(f => f.id === selectedFaction);
      if (!faction) throw new Error('Faction not found');
      if ((playerData.crypto_balance || 0) < actionConfig.cost) throw new Error(`Need $${actionConfig.cost.toLocaleString()} — insufficient funds`);

      let diplomacyData;
      try {
        const prompt = `Simulate a ${selectedAction.replace(/_/g, ' ')} between a player (level ${playerData.level}, crew rep ${crewData?.reputation || 0}) and faction "${faction.name}" (type: ${faction.faction_type}, power: ${faction.power_level}, aggression: ${faction.aggression}). Player message: "${playerMessage || 'Standard approach'}". Return JSON with: success_probability (number 0-100), relationship_change (number), negotiation_log (array of {round, player_offer, faction_response, mood}), intel_gathered ({territory_plans, military_strength, weaknesses, secret_operations}), outcomes ({immediate_effect, long_term_impact}).`;
        diplomacyData = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: false,
          response_json_schema: {
            type: "object",
            properties: {
              success_probability: { type: "number" },
              relationship_change: { type: "number" },
              negotiation_log: { type: "array", items: { type: "object", properties: { round: { type: "number" }, player_offer: { type: "string" }, faction_response: { type: "string" }, mood: { type: "string" } } } },
              intel_gathered: { type: "object", properties: { territory_plans: { type: "array", items: { type: "string" } }, military_strength: { type: "number" }, weaknesses: { type: "array", items: { type: "string" } }, secret_operations: { type: "array", items: { type: "string" } } } },
              outcomes: { type: "object", properties: { immediate_effect: { type: "string" }, long_term_impact: { type: "string" }, rewards: { type: "object" } } }
            }
          }
        });
      } catch (err) {
        if (isAILimitError(err)) {
          setAiLimitHit(true);
          diplomacyData = buildFallbackDiplomacy(selectedAction, faction, playerData.level || 1);
        } else {
          throw err;
        }
      }

      // Deduct cost
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - actionConfig.cost
      });

      const completionTime = new Date();
      completionTime.setHours(completionTime.getHours() + 24);

      await base44.entities.FactionDiplomacy.create({
        player_id: playerData.id,
        crew_id: playerData.crew_id,
        target_faction_id: selectedFaction,
        target_faction_name: faction.name,
        action_type: selectedAction,
        diplomat_role: actionConfig.role,
        cost: actionConfig.cost,
        duration_hours: 24,
        success_probability: diplomacyData.success_probability,
        ai_negotiation_log: diplomacyData.negotiation_log || [],
        intel_gathered: diplomacyData.intel_gathered || {},
        relationship_change: diplomacyData.relationship_change,
        status: 'negotiating',
        outcomes: diplomacyData.outcomes,
        started_at: new Date().toISOString(),
        completed_at: completionTime.toISOString()
      });

      await base44.entities.TransactionLog.create({
        transaction_type: 'purchase',
        player_id: playerData.id,
        player_username: playerData.username,
        amount: actionConfig.cost,
        description: `${actionConfig.label} with ${faction.name}`,
        status: 'completed'
      });

      return diplomacyData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['diplomacy']);
      queryClient.invalidateQueries(['player']);
      toast.success('Diplomatic action initiated!');
      setPlayerMessage('');
      setSelectedFaction('');
    },
    onError: (error) => toast.error(error.message)
  });

  if (!playerData) return null;

  return (
    <div className="space-y-4">
      {aiLimitHit && <AILimitBanner />}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader className="border-b border-blue-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-blue-400" />
            Faction Diplomacy & Espionage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Action Type</label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="bg-slate-900/50 border-blue-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(actionTypes).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} — ${config.cost.toLocaleString()} ({config.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Target Faction</label>
            <Select value={selectedFaction} onValueChange={setSelectedFaction}>
              <SelectTrigger className="bg-slate-900/50 border-blue-500/20 text-white">
                <SelectValue placeholder="Select faction..." />
              </SelectTrigger>
              <SelectContent>
                {factions.length === 0 ? (
                  <SelectItem value="_none" disabled>No factions available</SelectItem>
                ) : (
                  factions.map((faction) => (
                    <SelectItem key={faction.id} value={faction.id}>
                      {faction.name} ({faction.faction_type}) — Power: {faction.power_level}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Your Approach (Optional)</label>
            <Textarea
              placeholder="Describe your negotiation strategy or operation details..."
              value={playerMessage}
              onChange={(e) => setPlayerMessage(e.target.value)}
              className="bg-slate-900/50 border-blue-500/20 text-white"
              rows={3}
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Cost:</span>
                <span className="text-blue-400 ml-2">${actionTypes[selectedAction].cost.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Role:</span>
                <span className="text-cyan-400 ml-2 capitalize">{actionTypes[selectedAction].role.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-gray-400">Your Balance:</span>
                <span className={`ml-2 ${(playerData.crypto_balance || 0) >= actionTypes[selectedAction].cost ? 'text-green-400' : 'text-red-400'}`}>
                  ${(playerData.crypto_balance || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Factions:</span>
                <span className="text-white ml-2">{factions.length} available</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
            onClick={() => initiateDiplomacyMutation.mutate()}
            disabled={initiateDiplomacyMutation.isPending || !selectedFaction || (playerData.crypto_balance || 0) < actionTypes[selectedAction].cost}
          >
            {initiateDiplomacyMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
            ) : (
              <><Crown className="w-4 h-4 mr-2" />Initiate {actionTypes[selectedAction].label}</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel border-blue-500/20">
        <CardHeader className="border-b border-blue-500/20">
          <CardTitle className="text-white text-sm">Active Diplomatic Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {diplomacyActions.length === 0 ? (
            <p className="text-center text-gray-400 py-4 text-sm">No active diplomatic actions</p>
          ) : (
            <div className="space-y-3">
              {diplomacyActions.map((action) => (
                <div key={action.id} className="p-3 rounded-lg bg-slate-900/30 border border-blue-500/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-sm capitalize">{action.action_type.replace(/_/g, ' ')}</h4>
                      <p className="text-xs text-gray-400">{action.target_faction_name}</p>
                    </div>
                    <Badge className={
                      action.status === 'negotiating' ? 'bg-yellow-600' :
                      action.status === 'completed' ? 'bg-green-600' :
                      action.status === 'failed' ? 'bg-red-600' : 'bg-gray-600'
                    }>
                      {action.status}
                    </Badge>
                  </div>

                  {action.success_probability && (
                    <p className="text-xs text-cyan-400 mb-2">Success Rate: {action.success_probability}%</p>
                  )}

                  {action.intel_gathered?.territory_plans?.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-blue-900/20 border border-blue-500/20">
                      <p className="text-xs text-blue-400 font-semibold mb-1">Intel Gathered:</p>
                      {action.intel_gathered.territory_plans.slice(0, 2).map((intel, idx) => (
                        <p key={idx} className="text-xs text-gray-300">• {intel}</p>
                      ))}
                    </div>
                  )}

                  {action.ai_negotiation_log?.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-slate-900/50 border border-blue-500/10 max-h-32 overflow-y-auto">
                      <p className="text-xs text-blue-400 font-semibold mb-1">Negotiations:</p>
                      {action.ai_negotiation_log.slice(0, 2).map((log, idx) => (
                        <div key={idx} className="mb-2">
                          <p className="text-xs text-gray-300">Round {log.round}:</p>
                          <p className="text-xs text-cyan-300 ml-2">"{log.faction_response}"</p>
                        </div>
                      ))}
                    </div>
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