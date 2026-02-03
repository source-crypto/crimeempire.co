import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crosshair, Shield, Users, Eye, Map, AlertTriangle, 
  Swords, Target, Loader2, TrendingUp 
} from 'lucide-react';
import { toast } from 'sonner';

export default function TerritoryWarRoomStrategy({ playerData, crewData }) {
  const queryClient = useQueryClient();
  const [selectedTarget, setSelectedTarget] = useState(null);

  const { data: allTerritories = [] } = useQuery({
    queryKey: ['allTerritories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const { data: activeBattles = [] } = useQuery({
    queryKey: ['activeBattles', crewData?.id],
    queryFn: () => base44.entities.Battle.filter({
      $or: [
        { attacking_crew_id: crewData.id },
        { defending_crew_id: crewData.id }
      ],
      status: 'active'
    }),
    enabled: !!crewData?.id
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['territoryChallenges', playerData?.id],
    queryFn: () => base44.entities.TerritoryChallenge.filter({
      player_id: playerData.id,
      status: 'active'
    }),
    enabled: !!playerData?.id
  });

  const scoutTerritoryMutation = useMutation({
    mutationFn: async (territoryId) => {
      const cost = 2000;
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      const territory = allTerritories.find(t => t.id === territoryId);
      
      const intelligence = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a scouting report for a territory attack:
        
Territory: ${territory.name}
Type: ${territory.resource_type}
Defense: ${territory.defense_rating || 50}
Control: ${territory.control_percentage}%

Provide:
1. Recommended attack time (based on control %)
2. Estimated defenders strength
3. Weak points to exploit
4. Success probability
5. Suggested strategy
6. Required crew size

Return as JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            attack_time_recommendation: { type: 'string' },
            defender_strength: { type: 'string' },
            weak_points: { type: 'array', items: { type: 'string' } },
            success_probability: { type: 'number' },
            strategy: { type: 'string' },
            recommended_crew_size: { type: 'number' }
          }
        }
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      return { territory, intelligence };
    },
    onSuccess: (data) => {
      setSelectedTarget(data);
      queryClient.invalidateQueries(['player']);
      toast.success('Territory scouted successfully!');
    },
    onError: (error) => toast.error(error.message)
  });

  const enemyTerritories = allTerritories.filter(t => 
    t.controlling_crew_id && 
    t.controlling_crew_id !== crewData?.id &&
    !t.is_contested
  );

  const neutralTerritories = allTerritories.filter(t => 
    !t.controlling_crew_id && !t.is_contested
  );

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-red-400" />
          War Room - Strategic Planning
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="scout">
          <TabsList className="bg-slate-900/50 mb-4">
            <TabsTrigger value="scout">Scout Targets</TabsTrigger>
            <TabsTrigger value="active">Active Battles</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="scout" className="space-y-4">
            {selectedTarget ? (
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    Intel Report: {selectedTarget.territory.name}
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setSelectedTarget(null)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Success Probability</span>
                      <span className={`font-bold text-lg ${
                        selectedTarget.intelligence.success_probability > 70 ? 'text-green-400' :
                        selectedTarget.intelligence.success_probability > 40 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {selectedTarget.intelligence.success_probability}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <p className="text-gray-400 text-sm mb-1">Recommended Strategy</p>
                    <p className="text-white text-sm">{selectedTarget.intelligence.strategy}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <p className="text-gray-400 text-sm mb-2">Weak Points</p>
                    <div className="space-y-1">
                      {selectedTarget.intelligence.weak_points?.map((point, idx) => (
                        <div key={idx} className="text-sm text-cyan-400 flex items-start gap-2">
                          <Target className="w-3 h-3 mt-1 shrink-0" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-gray-400 text-xs mb-1">Defender Strength</p>
                      <p className="text-white font-semibold">{selectedTarget.intelligence.defender_strength}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-gray-400 text-xs mb-1">Crew Size Needed</p>
                      <p className="text-white font-semibold">{selectedTarget.intelligence.recommended_crew_size} members</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                    <p className="text-blue-300 text-sm">
                      <strong>Best Attack Time:</strong> {selectedTarget.intelligence.attack_time_recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-3">Enemy Territories</h3>
                {enemyTerritories.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No enemy territories available</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {enemyTerritories.map((territory) => (
                      <div key={territory.id} className="p-3 rounded-lg bg-slate-900/30 border border-red-500/20">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-white font-semibold">{territory.name}</h4>
                            <p className="text-xs text-gray-400 capitalize">{territory.resource_type}</p>
                          </div>
                          <Badge className="bg-red-600">{territory.control_percentage}% control</Badge>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => scoutTerritoryMutation.mutate(territory.id)}
                            disabled={scoutTerritoryMutation.isPending}
                          >
                            {scoutTerritoryMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Scout ($2k)
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {neutralTerritories.length > 0 && (
                  <>
                    <h3 className="text-white font-semibold mb-3 mt-6">Unclaimed Territories</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {neutralTerritories.map((territory) => (
                        <div key={territory.id} className="p-3 rounded-lg bg-slate-900/30 border border-green-500/20">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-white font-semibold">{territory.name}</h4>
                              <p className="text-xs text-gray-400 capitalize">{territory.resource_type}</p>
                            </div>
                            <Badge className="bg-green-600">Unclaimed</Badge>
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 mt-2"
                            onClick={() => scoutTerritoryMutation.mutate(territory.id)}
                            disabled={scoutTerritoryMutation.isPending}
                          >
                            Scout Territory
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeBattles.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active battles</p>
            ) : (
              <div className="space-y-3">
                {activeBattles.map((battle) => {
                  const territory = allTerritories.find(t => t.id === battle.territory_id);
                  const isAttacking = battle.attacking_crew_id === crewData?.id;

                  return (
                    <div key={battle.id} className="p-4 rounded-lg bg-slate-900/30 border border-red-500/20">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold">{territory?.name}</h4>
                          <Badge className={isAttacking ? 'bg-red-600' : 'bg-blue-600'}>
                            {isAttacking ? 'Attacking' : 'Defending'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Started</p>
                          <p className="text-white text-sm">
                            {new Date(battle.started_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-2 rounded bg-red-900/20">
                          <p className="text-xs text-gray-400">Attack Power</p>
                          <p className="text-red-400 font-bold">{battle.attack_power || 0}</p>
                        </div>
                        <div className="p-2 rounded bg-blue-900/20">
                          <p className="text-xs text-gray-400">Defense Power</p>
                          <p className="text-blue-400 font-bold">{battle.defense_power || 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="challenges">
            {challenges.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active challenges</p>
            ) : (
              <div className="space-y-3">
                {challenges.map((challenge) => (
                  <div key={challenge.id} className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/20">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-semibold">{challenge.challenge_type}</h4>
                        <p className="text-sm text-gray-400">{challenge.description}</p>
                      </div>
                      <Badge className={
                        challenge.difficulty === 'hard' ? 'bg-red-600' :
                        challenge.difficulty === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                      }>
                        {challenge.difficulty}
                      </Badge>
                    </div>
                    <div className="mt-3 p-2 rounded bg-slate-900/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Rewards</span>
                        <span className="text-green-400 font-semibold">
                          ${challenge.rewards?.crypto || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}