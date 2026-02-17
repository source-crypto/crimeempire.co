import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Shield, Target, TrendingUp } from 'lucide-react';

export default function TeamManagement() {
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

  const { data: crew } = useQuery({
    queryKey: ['crew', playerData?.crew_id],
    queryFn: async () => {
      const crews = await base44.entities.Crew.filter({ id: playerData.crew_id });
      return crews[0];
    },
    enabled: !!playerData?.crew_id
  });

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', playerData?.crew_id],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id
  });

  const { data: crewActivities = [] } = useQuery({
    queryKey: ['crewActivities', playerData?.crew_id],
    queryFn: () => base44.entities.CrewActivity.filter({ crew_id: playerData.crew_id }, '-created_date', 10),
    enabled: !!playerData?.crew_id
  });

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-6 h-6 text-purple-400" />
            Team Management
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Manage your crew and team operations
          </p>
        </CardHeader>
      </Card>

      {!crew ? (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">You're not in a crew</p>
            <p className="text-sm text-gray-500">Join or create a crew to access team management</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    {crew.name}
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">{crew.description}</p>
                </div>
                <Badge className="bg-purple-600">
                  Level {crew.level || 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-slate-900/30">
                  <Users className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="text-xs text-gray-400">Members</p>
                  <p className="text-xl font-bold text-white">{crewMembers.length}</p>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-900/30">
                  <Shield className="w-5 h-5 text-cyan-400 mb-2" />
                  <p className="text-xs text-gray-400">Total Power</p>
                  <p className="text-xl font-bold text-white">{crew.total_power || 0}</p>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-900/30">
                  <Target className="w-5 h-5 text-green-400 mb-2" />
                  <p className="text-xs text-gray-400">Reputation</p>
                  <p className="text-xl font-bold text-white">{crew.reputation || 0}</p>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-900/30">
                  <TrendingUp className="w-5 h-5 text-yellow-400 mb-2" />
                  <p className="text-xs text-gray-400">Total Revenue</p>
                  <p className="text-xl font-bold text-white">${(crew.total_revenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="text-white">Crew Members</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {crewMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">{member.player_username}</h4>
                        <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          member.role === 'boss' ? 'bg-yellow-600' :
                          member.role === 'underboss' ? 'bg-purple-600' :
                          member.role === 'capo' ? 'bg-blue-600' : 'bg-gray-600'
                        }>
                          {member.role}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          Contribution: ${(member.total_contribution || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {crewActivities.length > 0 && (
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white">Recent Activities</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {crewActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10"
                    >
                      <p className="text-sm text-white">{activity.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400 capitalize">{activity.activity_type}</p>
                        {activity.value && (
                          <span className="text-xs text-green-400 font-semibold">
                            +${activity.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}