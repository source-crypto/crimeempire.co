import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Swords, Shield, Users, Target, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function EnterprisePvPSystem({ playerData, enterprise }) {
  const [sabotageType, setSabotageType] = useState('supply_disruption');
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const queryClient = useQueryClient();

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: rivalries = [] } = useQuery({
    queryKey: ['rivalries', playerData?.id],
    queryFn: () => base44.entities.EnterpriseRivalry.filter({
      $or: [
        { player_1_id: playerData.id },
        { player_2_id: playerData.id }
      ]
    }),
    enabled: !!playerData?.id
  });

  const { data: alliances = [] } = useQuery({
    queryKey: ['alliances', playerData?.id],
    queryFn: async () => {
      const leaderAlliances = await base44.entities.EnterpriseAlliance.filter({ 
        leader_player_id: playerData.id 
      });
      const memberAlliances = await base44.entities.EnterpriseAlliance.list();
      return memberAlliances.filter(a => 
        a.member_player_ids?.includes(playerData.id) || a.leader_player_id === playerData.id
      );
    },
    enabled: !!playerData?.id
  });

  const { data: targetEnterprises = [] } = useQuery({
    queryKey: ['targetEnterprises', targetPlayerId],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: targetPlayerId }),
    enabled: !!targetPlayerId
  });

  const sabotageMutation = useMutation({
    mutationFn: async ({ targetEnterpriseId, sabotageType }) => {
      const cost = 10000;
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      const targetEnterprise = targetEnterprises.find(e => e.id === targetEnterpriseId);
      const targetPlayer = allPlayers.find(p => p.id === targetPlayerId);

      const damageValues = {
        supply_disruption: { damage: 5000, production: 20 },
        price_manipulation: { damage: 8000, production: 15 },
        resource_theft: { damage: 12000, production: 25 },
        employee_poaching: { damage: 7000, production: 18 },
        reputation_attack: { damage: 6000, production: 10 },
        market_flooding: { damage: 10000, production: 30 }
      };

      const impact = damageValues[sabotageType];
      
      const sabotage = await base44.entities.EconomicSabotage.create({
        sabotage_type: sabotageType,
        attacker_faction_id: playerData.id,
        attacker_name: playerData.username,
        target_enterprise_id: targetEnterpriseId,
        target_player_id: targetPlayerId,
        severity: 'moderate',
        economic_damage: impact.damage,
        production_impact: impact.production,
        duration_hours: 24,
        status: 'executing'
      });

      await base44.entities.CriminalEnterprise.update(targetEnterpriseId, {
        production_rate: Math.max(0, targetEnterprise.production_rate - impact.production),
        heat_level: Math.min(100, targetEnterprise.heat_level + 5)
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      const existingRivalry = rivalries.find(r =>
        (r.player_1_id === playerData.id && r.player_2_id === targetPlayerId) ||
        (r.player_2_id === playerData.id && r.player_1_id === targetPlayerId)
      );

      if (existingRivalry) {
        await base44.entities.EnterpriseRivalry.update(existingRivalry.id, {
          sabotage_count: existingRivalry.sabotage_count + 1,
          total_damage_dealt: existingRivalry.total_damage_dealt + impact.damage,
          rivalry_level: Math.min(10, existingRivalry.rivalry_level + 1)
        });
      } else {
        await base44.entities.EnterpriseRivalry.create({
          player_1_id: playerData.id,
          player_2_id: targetPlayerId,
          initiated_by: playerData.id,
          sabotage_count: 1,
          total_damage_dealt: impact.damage,
          rivalry_level: 1,
          status: 'active'
        });
      }

      return sabotage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rivalries']);
      queryClient.invalidateQueries(['player']);
      toast.success('Sabotage operation launched!');
      setTargetPlayerId('');
    },
    onError: (error) => toast.error(error.message)
  });

  const createAllianceMutation = useMutation({
    mutationFn: async ({ allianceName, allianceType }) => {
      const alliance = await base44.entities.EnterpriseAlliance.create({
        alliance_name: allianceName,
        leader_player_id: playerData.id,
        member_player_ids: [],
        alliance_type: allianceType,
        benefits: {
          shared_resources: allianceType === 'joint_venture',
          joint_defense: allianceType === 'mutual_defense',
          trade_discount: allianceType === 'trade_pact' ? 10 : 0
        },
        status: 'active',
        created_at: new Date().toISOString()
      });

      return alliance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alliances']);
      toast.success('Alliance created!');
    },
    onError: (error) => toast.error(error.message)
  });

  const rivalPlayers = allPlayers.filter(p => 
    p.id !== playerData?.id && 
    rivalries.some(r => 
      (r.player_1_id === p.id || r.player_2_id === p.id) && r.status === 'active'
    )
  );

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Swords className="w-5 h-5 text-red-400" />
          PvP Enterprise Operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sabotage" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/50">
            <TabsTrigger value="sabotage">Sabotage</TabsTrigger>
            <TabsTrigger value="alliances">Alliances</TabsTrigger>
            <TabsTrigger value="rivalries">Rivalries</TabsTrigger>
          </TabsList>

          <TabsContent value="sabotage" className="space-y-4">
            <div className="p-4 rounded-lg bg-red-900/10 border border-red-500/30">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Launch Sabotage Attack
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-white">Target Player</Label>
                  <Select value={targetPlayerId} onValueChange={setTargetPlayerId}>
                    <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white mt-2">
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.filter(p => p.id !== playerData?.id).map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.username} - Lvl {player.level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {targetPlayerId && targetEnterprises.length > 0 && (
                  <>
                    <div>
                      <Label className="text-white">Sabotage Type</Label>
                      <Select value={sabotageType} onValueChange={setSabotageType}>
                        <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="supply_disruption">Supply Disruption - $5k damage</SelectItem>
                          <SelectItem value="price_manipulation">Price Manipulation - $8k damage</SelectItem>
                          <SelectItem value="resource_theft">Resource Theft - $12k damage</SelectItem>
                          <SelectItem value="employee_poaching">Employee Poaching - $7k damage</SelectItem>
                          <SelectItem value="reputation_attack">Reputation Attack - $6k damage</SelectItem>
                          <SelectItem value="market_flooding">Market Flooding - $10k damage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Target Enterprise</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {targetEnterprises.map((ent) => (
                          <Button
                            key={ent.id}
                            variant="outline"
                            className="justify-start text-left h-auto py-3"
                            onClick={() => sabotageMutation.mutate({
                              targetEnterpriseId: ent.id,
                              sabotageType
                            })}
                            disabled={sabotageMutation.isPending}
                          >
                            <div className="flex-1">
                              <div className="font-semibold">{ent.name}</div>
                              <div className="text-xs text-gray-400">
                                {ent.type.replace(/_/g, ' ')} • Lvl {ent.level} • Security: {ent.security_level}
                              </div>
                            </div>
                            <Zap className="w-4 h-4 text-red-400" />
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/30 border border-yellow-500/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Attack Cost</span>
                        <span className="text-red-400 font-semibold">$10,000</span>
                      </div>
                    </div>
                  </>
                )}

                {targetPlayerId && targetEnterprises.length === 0 && (
                  <p className="text-gray-400 text-sm">Target has no enterprises to sabotage</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alliances" className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-500/30">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Your Alliances
              </h3>
              
              {alliances.length === 0 ? (
                <p className="text-gray-400 text-sm mb-3">No active alliances</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {alliances.map((alliance) => (
                    <div key={alliance.id} className="p-3 rounded-lg bg-slate-900/50 border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{alliance.alliance_name}</div>
                          <div className="text-sm text-gray-400">
                            {alliance.member_player_ids?.length || 0} members • {alliance.alliance_type.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <Badge className="bg-blue-600">{alliance.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <AllianceCreator 
                playerData={playerData}
                createAllianceMutation={createAllianceMutation}
              />
            </div>
          </TabsContent>

          <TabsContent value="rivalries" className="space-y-4">
            <div className="p-4 rounded-lg bg-red-900/10 border border-red-500/30">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Active Rivalries
              </h3>
              
              {rivalries.length === 0 ? (
                <p className="text-gray-400 text-sm">No active rivalries</p>
              ) : (
                <div className="space-y-2">
                  {rivalries.map((rivalry) => {
                    const rivalId = rivalry.player_1_id === playerData.id 
                      ? rivalry.player_2_id 
                      : rivalry.player_1_id;
                    const rival = allPlayers.find(p => p.id === rivalId);

                    return (
                      <div key={rivalry.id} className="p-3 rounded-lg bg-slate-900/50 border border-red-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{rival?.username || 'Unknown'}</div>
                            <div className="text-sm text-gray-400">
                              Level {rivalry.rivalry_level} • {rivalry.sabotage_count} attacks • 
                              ${rivalry.total_damage_dealt?.toLocaleString()} damage
                            </div>
                          </div>
                          <Badge className="bg-red-600">{rivalry.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AllianceCreator({ playerData, createAllianceMutation }) {
  const [allianceName, setAllianceName] = useState('');
  const [allianceType, setAllianceType] = useState('mutual_defense');
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    if (!allianceName) {
      toast.error('Enter alliance name');
      return;
    }
    createAllianceMutation.mutate({ allianceName, allianceType });
    setAllianceName('');
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <Button 
        onClick={() => setShowForm(true)}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Users className="w-4 h-4 mr-2" />
        Create New Alliance
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg bg-slate-900/30">
      <div>
        <Label className="text-white">Alliance Name</Label>
        <Input
          placeholder="Enter alliance name..."
          value={allianceName}
          onChange={(e) => setAllianceName(e.target.value)}
          className="bg-slate-900/50 border-purple-500/20 text-white mt-2"
        />
      </div>
      
      <div>
        <Label className="text-white">Alliance Type</Label>
        <Select value={allianceType} onValueChange={setAllianceType}>
          <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mutual_defense">Mutual Defense - Joint protection</SelectItem>
            <SelectItem value="trade_pact">Trade Pact - 10% discount</SelectItem>
            <SelectItem value="joint_venture">Joint Venture - Shared resources</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handleCreate}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={createAllianceMutation.isPending}
        >
          Create
        </Button>
        <Button 
          onClick={() => setShowForm(false)}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}