import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, Shield, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function TerritoryOutpostManager({ territory, playerFaction }) {
  const queryClient = useQueryClient();
  const [showBuildForm, setShowBuildForm] = useState(false);
  const [outpostType, setOutpostType] = useState('safehouse');

  const { data: outposts = [] } = useQuery({
    queryKey: ['outposts', territory.id],
    queryFn: () => base44.entities.TerritoryOutpost.filter({ 
      territory_id: territory.id 
    })
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges', territory.id],
    queryFn: () => base44.entities.TerritoryChallenge.filter({ 
      territory_id: territory.id,
      status: 'active'
    }),
    refetchInterval: 30000
  });

  const buildOutpostMutation = useMutation({
    mutationFn: async () => {
      const costs = {
        safehouse: 25000,
        drug_lab: 50000,
        weapon_factory: 75000,
        chop_shop: 60000,
        surveillance: 40000
      };
      
      const cost = costs[outpostType];

      const outpost = await base44.entities.TerritoryOutpost.create({
        territory_id: territory.id,
        outpost_type: outpostType,
        name: `${outpostType.replace('_', ' ')} - ${territory.name}`,
        owner_faction_id: playerFaction.id,
        coordinates: {
          lat: territory.coordinates.lat + (Math.random() - 0.5) * 0.01,
          lng: territory.coordinates.lng + (Math.random() - 0.5) * 0.01
        },
        fortification_level: 1,
        production_rate: outpostType === 'safehouse' ? 0 : 100,
        revenue_per_hour: outpostType === 'safehouse' ? 500 : 2000
      });

      return { outpost, cost };
    },
    onSuccess: ({ cost }) => {
      queryClient.invalidateQueries(['outposts']);
      toast.success(`Outpost built for $${cost.toLocaleString()}`);
      setShowBuildForm(false);
    },
    onError: (error) => toast.error(error.message)
  });

  const upgradeMutation = useMutation({
    mutationFn: async (outpost) => {
      const cost = outpost.upgrade_level * 20000;
      
      await base44.entities.TerritoryOutpost.update(outpost.id, {
        upgrade_level: outpost.upgrade_level + 1,
        production_rate: outpost.production_rate * 1.2,
        revenue_per_hour: outpost.revenue_per_hour * 1.2,
        capacity: outpost.capacity * 1.5
      });

      return cost;
    },
    onSuccess: (cost) => {
      queryClient.invalidateQueries(['outposts']);
      toast.success(`Upgraded for $${cost.toLocaleString()}`);
    }
  });

  const fortifyMutation = useMutation({
    mutationFn: async (outpost) => {
      const cost = outpost.fortification_level * 15000;
      
      await base44.entities.TerritoryOutpost.update(outpost.id, {
        fortification_level: Math.min(outpost.fortification_level + 1, 10),
        assigned_units: outpost.assigned_units + 5
      });

      return cost;
    },
    onSuccess: (cost) => {
      queryClient.invalidateQueries(['outposts']);
      toast.success(`Fortified for $${cost.toLocaleString()}`);
    }
  });

  const resolveChallengeMutation = useMutation({
    mutationFn: async ({ challenge, option }) => {
      const success = Math.random() * 100 < option.success_probability;

      await base44.entities.TerritoryChallenge.update(challenge.id, {
        status: success ? 'resolved' : 'failed'
      });

      if (success) {
        await base44.entities.Faction.update(playerFaction.id, {
          treasury: (playerFaction.treasury || 0) + challenge.reward_for_success
        });
      }

      return { success, challenge };
    },
    onSuccess: ({ success }) => {
      queryClient.invalidateQueries(['challenges']);
      queryClient.invalidateQueries(['playerFaction']);
      toast.success(success ? 'Challenge resolved!' : 'Challenge failed');
    }
  });

  const outpostIcons = {
    drug_lab: '🧪',
    weapon_factory: '🔫',
    chop_shop: '🚗',
    safehouse: '🏠',
    surveillance: '📡'
  };

  return (
    <div className="space-y-4">
      {challenges.length > 0 && (
        <Card className="glass-panel border-red-500/30">
          <CardHeader className="border-b border-red-500/20">
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Active Challenges
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {challenges.map(challenge => (
              <div key={challenge.id} className="p-2 rounded bg-red-900/20 border border-red-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{challenge.challenge_type}</span>
                  <Badge variant="destructive">{challenge.severity}</Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">{challenge.description}</p>
                <div className="text-xs text-gray-400 mb-2">
                  Reward: <span className="text-green-400">${challenge.reward_for_success?.toLocaleString()}</span>
                </div>
                {challenge.resolution_options?.map((option, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    onClick={() => resolveChallengeMutation.mutate({ challenge, option })}
                    disabled={resolveChallengeMutation.isPending}
                    className="w-full mt-1 text-xs"
                  >
                    {option.option_name} ({option.success_probability}%)
                  </Button>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-purple-500/30">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Outposts ({outposts.length})
            </div>
            {!showBuildForm && (
              <Button size="sm" onClick={() => setShowBuildForm(true)}>
                Build Outpost
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {showBuildForm && (
            <div className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/30 space-y-3">
              <Select value={outpostType} onValueChange={setOutpostType}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safehouse">Safehouse ($25k)</SelectItem>
                  <SelectItem value="drug_lab">Drug Lab ($50k)</SelectItem>
                  <SelectItem value="weapon_factory">Weapon Factory ($75k)</SelectItem>
                  <SelectItem value="chop_shop">Chop Shop ($60k)</SelectItem>
                  <SelectItem value="surveillance">Surveillance ($40k)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  onClick={() => buildOutpostMutation.mutate()}
                  disabled={buildOutpostMutation.isPending}
                  className="flex-1"
                >
                  Build
                </Button>
                <Button variant="outline" onClick={() => setShowBuildForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {outposts.map(outpost => (
              <div key={outpost.id} className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>{outpostIcons[outpost.outpost_type]}</span>
                      {outpost.outpost_type.replace('_', ' ').toUpperCase()}
                    </h4>
                    <p className="text-xs text-gray-400">Level {outpost.upgrade_level}</p>
                  </div>
                  <Badge className={outpost.is_operational ? 'bg-green-600' : 'bg-red-600'}>
                    {outpost.is_operational ? 'Active' : 'Offline'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-gray-400">Defense:</span>
                    <span className="text-blue-400">{outpost.fortification_level}/10</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-green-400" />
                    <span className="text-gray-400">Revenue:</span>
                    <span className="text-green-400">${outpost.revenue_per_hour}/hr</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    <span className="text-gray-400">Production:</span>
                    <span className="text-purple-400">{outpost.production_rate}/hr</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-400">Heat:</span>
                    <span className="text-yellow-400">{outpost.heat_level}/100</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => upgradeMutation.mutate(outpost)}
                    disabled={upgradeMutation.isPending}
                    className="flex-1 text-xs"
                  >
                    Upgrade
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => fortifyMutation.mutate(outpost)}
                    disabled={fortifyMutation.isPending || outpost.fortification_level >= 10}
                    className="flex-1 text-xs"
                  >
                    Fortify
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}