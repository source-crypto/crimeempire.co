import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, TrendingUp, Link as LinkIcon } from 'lucide-react';
import TerritoryBenefits from '../components/territory/TerritoryBenefits';
import SupplyLineManager from '../components/territory/SupplyLineManager';
import { Badge } from '@/components/ui/badge';

export default function Territories() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTerritory, setSelectedTerritory] = useState(null);

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

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Territory Control</h1>
        <p className="text-gray-400">Manage your crew's territories and supply lines</p>
      </div>

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
                  crewId={playerData.crew_id}
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
    </div>
  );
}