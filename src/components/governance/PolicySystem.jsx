import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Scale, Shield, DollarSign, TrendingUp, Users, 
  AlertTriangle, CheckCircle, XCircle, Loader2, Plus, Gavel
} from 'lucide-react';
import { toast } from 'sonner';

const policyTypeIcons = {
  taxation: DollarSign,
  security: Shield,
  trade: TrendingUp,
  crime_control: AlertTriangle,
  economic: DollarSign,
  social: Users
};

const policyTypeColors = {
  taxation: 'from-green-600 to-emerald-600',
  security: 'from-blue-600 to-cyan-600',
  trade: 'from-purple-600 to-pink-600',
  crime_control: 'from-red-600 to-orange-600',
  economic: 'from-yellow-600 to-orange-600',
  social: 'from-indigo-600 to-purple-600'
};

export default function PolicySystem({ playerData }) {
  const queryClient = useQueryClient();
  const [showEnactForm, setShowEnactForm] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [policyType, setPolicyType] = useState('');

  const { data: territories = [] } = useQuery({
    queryKey: ['playerTerritories', playerData?.id],
    queryFn: async () => {
      const allTerritories = await base44.entities.Territory.filter({
        owner_id: playerData.id
      });
      return allTerritories;
    },
    enabled: !!playerData?.id,
    staleTime: 60000
  });

  const { data: activePolicies = [] } = useQuery({
    queryKey: ['activePolicies', playerData?.id],
    queryFn: () => base44.entities.Policy.filter({
      enacted_by: playerData.id,
      status: 'active'
    }, '-created_date', 30),
    enabled: !!playerData?.id,
    staleTime: 30000
  });

  const { data: factions = [] } = useQuery({
    queryKey: ['factions'],
    queryFn: () => base44.entities.Faction.list(),
    staleTime: 60000
  });

  const generatePolicyMutation = useMutation({
    mutationFn: async ({ territoryId, policyType }) => {
      const territory = territories.find(t => t.id === territoryId);
      
      const prompt = `Generate a governance policy for a crime game territory:

Territory: ${territory.name}
Policy Type: ${policyType}
Governor: ${playerData.username}

Create a realistic policy with:
1. Policy name (formal government style)
2. Detailed description (2-3 sentences explaining the law)
3. Specific numeric effects on the territory and factions
4. Public support estimate (30-80)
5. Enforcement cost (500-5000 weekly)
6. Duration in weeks (4-52, or null for permanent)

Effects should include relevant modifiers like:
- tax_rate_change (+/- 5 to 20)
- crime_heat_modifier (+/- 10 to 30)
- trade_bonus (+/- 5 to 15)
- security_level_change (+/- 5 to 25)
- income_modifier (+/- 10 to 30%)
- faction_influence_change (+/- 5 to 20)

Return JSON.`;

      const aiPolicy = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            policy_name: { type: 'string' },
            description: { type: 'string' },
            effects: {
              type: 'object',
              properties: {
                tax_rate_change: { type: 'number' },
                crime_heat_modifier: { type: 'number' },
                trade_bonus: { type: 'number' },
                security_level_change: { type: 'number' },
                income_modifier: { type: 'number' },
                faction_influence_change: { type: 'number' }
              }
            },
            public_support: { type: 'number' },
            enforcement_cost: { type: 'number' },
            duration_weeks: { type: 'number' }
          }
        }
      });

      const enactedAt = new Date();
      const expiresAt = aiPolicy.duration_weeks 
        ? new Date(enactedAt.getTime() + aiPolicy.duration_weeks * 7 * 24 * 60 * 60 * 1000)
        : null;

      const policy = await base44.entities.Policy.create({
        ...aiPolicy,
        policy_type: policyType,
        enacted_by: playerData.id,
        governor_name: playerData.username,
        territory_id: territoryId,
        territory_name: territory.name,
        status: 'active',
        enacted_at: enactedAt.toISOString(),
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        affected_factions: factions.slice(0, 2).map(f => f.id)
      });

      // Apply effects to territory
      await base44.entities.Territory.update(territoryId, {
        tax_rate: (territory.tax_rate || 0) + (aiPolicy.effects.tax_rate_change || 0),
        security_level: (territory.security_level || 0) + (aiPolicy.effects.security_level_change || 0)
      });

      // Create governance record
      await base44.entities.Governance.create({
        territory_id: territoryId,
        action_type: 'policy_enacted',
        initiated_by: playerData.id,
        details: {
          policy_id: policy.id,
          policy_name: policy.policy_name
        },
        status: 'completed'
      });

      return policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activePolicies']);
      queryClient.invalidateQueries(['playerTerritories']);
      setShowEnactForm(false);
      toast.success('Policy enacted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to enact policy: ${error.message}`);
    }
  });

  const repealPolicyMutation = useMutation({
    mutationFn: async (policy) => {
      await base44.entities.Policy.update(policy.id, {
        status: 'repealed'
      });

      // Reverse effects
      const territory = territories.find(t => t.id === policy.territory_id);
      if (territory) {
        await base44.entities.Territory.update(policy.territory_id, {
          tax_rate: (territory.tax_rate || 0) - (policy.effects.tax_rate_change || 0),
          security_level: (territory.security_level || 0) - (policy.effects.security_level_change || 0)
        });
      }

      return policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activePolicies']);
      queryClient.invalidateQueries(['playerTerritories']);
      toast.success('Policy repealed');
    }
  });

  if (!playerData) {
    return (
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-8 text-center text-gray-400">
          <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Player data required</p>
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
              <Scale className="w-5 h-5 text-purple-400" />
              Policy System
            </CardTitle>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => setShowEnactForm(!showEnactForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Enact New Policy
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Enact Policy Form */}
      {showEnactForm && (
        <Card className="glass-panel border-purple-500/30">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white">Enact New Policy</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-gray-300">Territory</Label>
              <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/30">
                  <SelectValue placeholder="Select territory" />
                </SelectTrigger>
                <SelectContent>
                  {territories.map(territory => (
                    <SelectItem key={territory.id} value={territory.id}>
                      {territory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Policy Type</Label>
              <Select value={policyType} onValueChange={setPolicyType}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/30">
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taxation">Taxation</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="crime_control">Crime Control</SelectItem>
                  <SelectItem value="economic">Economic</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => generatePolicyMutation.mutate({ 
                territoryId: selectedTerritory, 
                policyType 
              })}
              disabled={!selectedTerritory || !policyType || generatePolicyMutation.isPending}
            >
              {generatePolicyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Policy...
                </>
              ) : (
                <>
                  <Gavel className="w-4 h-4 mr-2" />
                  Generate & Enact Policy
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Policies */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">
            Active Policies ({activePolicies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[600px] pr-4">
            {activePolicies.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active policies</p>
                <p className="text-sm mt-2">Enact laws to govern your territories</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activePolicies.map(policy => {
                  const Icon = policyTypeIcons[policy.policy_type];
                  
                  return (
                    <Card key={policy.id} className="glass-panel border-purple-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${policyTypeColors[policy.policy_type]}`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white">{policy.policy_name}</h4>
                              <p className="text-xs text-gray-400">{policy.territory_name}</p>
                            </div>
                          </div>
                          <Badge className="bg-purple-600 capitalize">
                            {policy.policy_type.replace('_', ' ')}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-400 mb-4">
                          {policy.description}
                        </p>

                        <div className="space-y-2 mb-4">
                          <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Public Support</span>
                              <span>{policy.public_support}%</span>
                            </div>
                            <Progress 
                              value={policy.public_support} 
                              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-cyan-600"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded bg-slate-900/30">
                              <p className="text-gray-400">Weekly Cost</p>
                              <p className="font-bold text-white">{policy.enforcement_cost} 💰</p>
                            </div>
                            <div className="p-2 rounded bg-slate-900/30">
                              <p className="text-gray-400">Duration</p>
                              <p className="font-bold text-white">
                                {policy.duration_weeks ? `${policy.duration_weeks} weeks` : 'Permanent'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-4 p-3 rounded-lg bg-slate-900/30">
                          <p className="text-xs text-gray-400 mb-2 font-semibold">Effects:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {policy.effects.tax_rate_change && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400">Tax Rate:</span>
                                <span className={policy.effects.tax_rate_change > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {policy.effects.tax_rate_change > 0 ? '+' : ''}{policy.effects.tax_rate_change}%
                                </span>
                              </div>
                            )}
                            {policy.effects.crime_heat_modifier && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400">Crime Heat:</span>
                                <span className={policy.effects.crime_heat_modifier > 0 ? 'text-red-400' : 'text-green-400'}>
                                  {policy.effects.crime_heat_modifier > 0 ? '+' : ''}{policy.effects.crime_heat_modifier}
                                </span>
                              </div>
                            )}
                            {policy.effects.security_level_change && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400">Security:</span>
                                <span className={policy.effects.security_level_change > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {policy.effects.security_level_change > 0 ? '+' : ''}{policy.effects.security_level_change}
                                </span>
                              </div>
                            )}
                            {policy.effects.trade_bonus && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400">Trade:</span>
                                <span className={policy.effects.trade_bonus > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {policy.effects.trade_bonus > 0 ? '+' : ''}{policy.effects.trade_bonus}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-red-500/30 text-red-400 hover:bg-red-900/20"
                          onClick={() => repealPolicyMutation.mutate(policy)}
                          disabled={repealPolicyMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Repeal Policy
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}