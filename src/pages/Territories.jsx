import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MapPin, TrendingUp, Link as LinkIcon, Swords, Loader2 } from 'lucide-react';
import TerritoryBenefits from '../components/territory/TerritoryBenefits';
import SupplyLineManager from '../components/territory/SupplyLineManager';
import TerritoryDevelopmentSystem from '../components/territory/TerritoryDevelopmentSystem';
import BattleInterface from '../components/battle/BattleInterface';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Territories() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [activeBattle, setActiveBattle] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser,
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories', playerData?.crew_id],
    queryFn: () => base44.entities.Territory.filter({ controlling_crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions', playerData?.id],
    queryFn: async () => {
      const perms = await base44.entities.CrewPermission.filter({
        crew_id: playerData.crew_id,
        player_id: playerData.id
      });
      return perms[0];
    },
    enabled: !!playerData?.crew_id && !!playerData?.id,
  });

  const canManage = permissions?.permissions?.manage_territories || playerData?.crew_role === 'boss';
  const canInitiateBattle = permissions?.permissions?.initiate_battles || ['boss', 'underboss', 'capo'].includes(playerData?.crew_role);

  const { data: allTerritories = [] } = useQuery({
    queryKey: ['allTerritories'],
    queryFn: () => base44.entities.Territory.list(),
  });

  const attackTerritoryMutation = useMutation({
    mutationFn: async (territory) => {
      if (!playerData.crew_id) {
        throw new Error('You need to be in a crew');
      }

      if (territory.controlling_crew_id === playerData.crew_id) {
        throw new Error('You already control this territory');
      }

      if (territory.is_contested) {
        throw new Error('Territory is already under attack');
      }

      const battleEndsAt = new Date();
      battleEndsAt.setHours(battleEndsAt.getHours() + 24);

      const battle = await base44.entities.Battle.create({
        territory_id: territory.id,
        attacking_crew_id: playerData.crew_id,
        defending_crew_id: territory.controlling_crew_id,
        status: 'active',
        attack_power: 0,
        defense_power: 0,
        participants: [],
        started_at: new Date().toISOString(),
        ends_at: battleEndsAt.toISOString()
      });

      await base44.entities.Territory.update(territory.id, {
        is_contested: true,
        battle_id: battle.id
      });

      await base44.entities.CrewActivity.create({
        crew_id: playerData.crew_id,
        activity_type: 'territory_captured',
        title: '⚔️ Battle Initiated',
        description: `Your crew is attacking ${territory.name}!`,
        player_id: playerData.id,
        player_username: playerData.username
      });

      return battle;
    },
    onSuccess: (battle) => {
      queryClient.invalidateQueries(['allTerritories']);
      queryClient.invalidateQueries(['territories']);
      setActiveBattle(battle);
      toast.success('Battle initiated!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (activeBattle) {
    return (
      <div className="space-y-6">
        <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Active Battle</h1>
              <p className="text-gray-400">Join your crew in battle</p>
            </div>
            <Button variant="outline" onClick={() => setActiveBattle(null)}>
              Back to Territories
            </Button>
          </div>
        </div>
        <BattleInterface 
          battle={activeBattle} 
          playerData={playerData}
          onComplete={() => {
            setActiveBattle(null);
            queryClient.invalidateQueries(['territories']);
            queryClient.invalidateQueries(['allTerritories']);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Territory Control</h1>
        <p className="text-gray-400">Manage your crew's territories and supply lines</p>
      </div>

      <Tabs defaultValue="owned" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="owned">Your Territories</TabsTrigger>
          <TabsTrigger value="all">All Territories</TabsTrigger>
        </TabsList>

        <TabsContent value="owned">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Territory List */}
            <div className="lg:col-span-1">
              <Card className="glass-panel border-purple-500/20">
                <CardHeader className="border-b border-purple-500/20">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MapPin className="w-5 h-5 text-purple-400" />
                    Your Territories
                    <Badge className="ml-auto bg-purple-600">{territories.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {territories.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No territories controlled</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {territories.map((territory) => (
                        <button
                          key={territory.id}
                          onClick={() => setSelectedTerritory(territory)}
                          className={`w-full p-3 rounded-lg text-left transition-all ${
                            selectedTerritory?.id === territory.id
                              ? 'bg-purple-600/30 border-2 border-purple-500/50'
                              : 'bg-slate-900/30 border border-purple-500/10 hover:bg-slate-900/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-white">{territory.name}</h4>
                            {territory.is_contested && (
                              <Badge className="bg-red-600">Contested</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <TrendingUp className="w-4 h-4" />
                            <span>{territory.revenue_multiplier.toFixed(1)}x revenue</span>
                          </div>
                          <p className="text-xs text-purple-400 mt-1 capitalize">
                            {territory.resource_type} district
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Territory Details */}
            <div className="lg:col-span-2">
              {selectedTerritory ? (
                <Tabs defaultValue="benefits" className="space-y-4">
                  <TabsList className="glass-panel border border-purple-500/20">
                    <TabsTrigger value="benefits" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Benefits
                    </TabsTrigger>
                    <TabsTrigger value="supply" className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Supply Lines
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="benefits">
                    <TerritoryBenefits
                      territoryId={selectedTerritory.id}
                      canManage={canManage}
                    />
                  </TabsContent>

                  <TabsContent value="supply">
                    <SupplyLineManager
                      crewId={playerData?.crew_id}
                      canManage={canManage}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <Card className="glass-panel border-purple-500/20 h-full flex items-center justify-center">
                  <CardContent className="text-center py-12">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">Select a territory to manage</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTerritories.map((territory) => {
              const isOwned = territory.controlling_crew_id === playerData?.crew_id;
              const canAttack = !isOwned && !territory.is_contested && canInitiateBattle;

              return (
                <Card key={territory.id} className="glass-panel border-purple-500/20">
                  <CardHeader className="border-b border-purple-500/20">
                    <CardTitle className="text-white flex items-center justify-between">
                      <span className="text-base">{territory.name}</span>
                      {isOwned && <Badge className="bg-green-600">Owned</Badge>}
                      {territory.is_contested && <Badge className="bg-red-600">Contested</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Revenue</span>
                      <span className="text-cyan-400">{territory.revenue_multiplier.toFixed(1)}x</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Control</span>
                      <span className="text-white">{territory.control_percentage}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Type</span>
                      <span className="text-purple-400 capitalize">{territory.resource_type}</span>
                    </div>
                    {canAttack && (
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600"
                        onClick={() => attackTerritoryMutation.mutate(territory)}
                        disabled={attackTerritoryMutation.isPending}
                      >
                        {attackTerritoryMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Attacking...
                          </>
                        ) : (
                          <>
                            <Swords className="w-4 h-4 mr-2" />
                            Attack Territory
                          </>
                        )}
                      </Button>
                    )}
                    {territory.is_contested && territory.battle_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-red-500/30"
                        onClick={async () => {
                          const battles = await base44.entities.Battle.filter({ id: territory.battle_id });
                          if (battles[0]) setActiveBattle(battles[0]);
                        }}
                      >
                        <Swords className="w-4 h-4 mr-2" />
                        View Battle
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}