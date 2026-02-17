import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Brain, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AIEmployees() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: npcs = [] } = useQuery({
    queryKey: ['enterpriseNPCs', playerData?.id],
    queryFn: () => base44.entities.EnterpriseNPC.list(),
    enabled: !!playerData
  });

  const { data: employeeManagers = [] } = useQuery({
    queryKey: ['aiEmployeeManager', playerData?.id],
    queryFn: () => base44.entities.AIEmployeeManager.filter({ player_id: playerData.id }),
    enabled: !!playerData
  });

  const myNPCs = npcs.filter(npc => 
    npc.enterprise_id === playerData?.id || npc.assigned_to_player === playerData?.id
  );

  const avgMorale = myNPCs.length > 0
    ? myNPCs.reduce((sum, npc) => sum + (npc.morale || 75), 0) / myNPCs.length
    : 75;

  const avgProductivity = myNPCs.reduce((sum, npc) => sum + (npc.production_bonus || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="w-6 h-6 text-blue-400" />
            AI Employee Management
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Manage your AI-powered workforce
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-blue-400">{myNPCs.length}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Avg Morale</p>
            <p className="text-2xl font-bold text-green-400">{avgMorale.toFixed(0)}%</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Productivity Bonus</p>
            <p className="text-2xl font-bold text-purple-400">+{avgProductivity.toFixed(0)}%</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">AI Managers</p>
            <p className="text-2xl font-bold text-cyan-400">{employeeManagers.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-blue-500/20">
        <CardHeader className="border-b border-blue-500/20">
          <CardTitle className="text-white">Your Employees</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {myNPCs.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No employees hired</p>
              <p className="text-sm text-gray-500 mt-2">Recruit NPCs to boost production</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myNPCs.map((npc) => (
                <div
                  key={npc.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-blue-500/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{npc.npc_name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{npc.npc_type}</p>
                    </div>
                    <Badge className={
                      npc.rarity === 'legendary' ? 'bg-yellow-600' :
                      npc.rarity === 'epic' ? 'bg-purple-600' :
                      npc.rarity === 'rare' ? 'bg-blue-600' : 'bg-gray-600'
                    }>
                      {npc.rarity}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Skill Level:</span>
                      <span className="text-cyan-400 font-semibold">{npc.skill_level}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Morale:</span>
                      <span className={
                        npc.morale > 70 ? 'text-green-400' :
                        npc.morale > 40 ? 'text-yellow-400' : 'text-red-400'
                      }>
                        {npc.morale}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loyalty:</span>
                      <span className="text-purple-400 font-semibold">{npc.loyalty}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Production Bonus:</span>
                      <span className="text-green-400 font-semibold">+{npc.production_bonus}%</span>
                    </div>
                  </div>

                  {npc.specialization && (
                    <p className="text-xs text-cyan-400 italic">
                      Specialization: {npc.specialization}
                    </p>
                  )}
                  
                  {npc.trait && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {npc.trait}
                    </Badge>
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