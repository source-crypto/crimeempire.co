import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Crown, Building, Users, TrendingUp, Shield } from 'lucide-react';

export default function Governance() {
  const [currentUser, setCurrentUser] = useState(null);
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

  const { data: governors = [] } = useQuery({
    queryKey: ['governance'],
    queryFn: () => base44.entities.Governance.filter({ is_active: true })
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const president = governors.find(g => g.position === 'president');
  const mayors = governors.filter(g => g.position === 'mayor');

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Governance System</h1>
        <p className="text-gray-400">
          Control territories, manage factions, and shape the criminal underworld
        </p>
      </div>

      <Tabs defaultValue="president">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="president">
            <Crown className="w-4 h-4 mr-2" />
            President
          </TabsTrigger>
          <TabsTrigger value="mayors">
            <Building className="w-4 h-4 mr-2" />
            Mayors
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Shield className="w-4 h-4 mr-2" />
            Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="president">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="flex items-center gap-2 text-white">
                <Crown className="w-5 h-5 text-yellow-400" />
                Presidential Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {president ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{president.player_username}</h3>
                      <p className="text-sm text-gray-400">President of the Underworld</p>
                    </div>
                    <Badge className="bg-yellow-600">
                      Power: {president.power_level}
                    </Badge>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Approval Rating</span>
                      <span className="text-white">{president.approval_rating}%</span>
                    </div>
                    <Progress value={president.approval_rating} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                      <p className="text-xs text-gray-400">Treasury</p>
                      <p className="text-lg font-bold text-green-400">
                        ${president.treasury?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                      <p className="text-xs text-gray-400">Controlled Factions</p>
                      <p className="text-lg font-bold text-purple-400">
                        {president.controlled_factions?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Crown className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold text-white mb-2">No President</h3>
                  <p className="text-gray-400">The throne awaits a worthy ruler</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mayors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {territories.map((territory) => {
              const mayor = mayors.find(m => m.territory_id === territory.id);
              
              return (
                <Card key={territory.id} className="glass-panel border-cyan-500/20">
                  <CardHeader className="border-b border-cyan-500/20">
                    <CardTitle className="flex items-center justify-between text-white">
                      <span className="text-base">{territory.name}</span>
                      {mayor && <Badge className="bg-cyan-600">Mayor</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {mayor ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{mayor.player_username}</p>
                          <p className="text-xs text-gray-400">Territory Mayor</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Approval</span>
                            <span className="text-white">{mayor.approval_rating}%</span>
                          </div>
                          <Progress value={mayor.approval_rating} className="h-2" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Treasury</span>
                          <span className="text-green-400">
                            ${mayor.treasury?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-400">No mayor assigned</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-purple-400" />
                Active Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-400 text-center py-8">
                Policy system coming soon - governors will be able to enact laws that affect territories and factions
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}