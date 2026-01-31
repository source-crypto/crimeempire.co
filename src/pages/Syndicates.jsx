import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, MapPin, Shield, Crown } from 'lucide-react';

export default function Syndicates() {
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

  const { data: crews = [] } = useQuery({
    queryKey: ['allCrews'],
    queryFn: () => base44.entities.Crew.list('-reputation', 20)
  });

  const { data: myCrew } = useQuery({
    queryKey: ['myCrew', playerData?.crew_id],
    queryFn: async () => {
      const crew = await base44.entities.Crew.filter({ id: playerData.crew_id });
      return crew[0];
    },
    enabled: !!playerData?.crew_id
  });

  if (!playerData) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Criminal Syndicates</h1>
        <p className="text-gray-400">Join forces or compete with other crews</p>
      </div>

      {myCrew && (
        <Card className="glass-panel border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Crown className="w-5 h-5 text-yellow-400" />
              Your Syndicate: {myCrew.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Members</p>
                <p className="text-2xl font-bold text-white">{myCrew.member_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Territories</p>
                <p className="text-2xl font-bold text-cyan-400">{myCrew.territory_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Power</p>
                <p className="text-2xl font-bold text-red-400">{myCrew.total_power}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Reputation</p>
                <p className="text-2xl font-bold text-purple-400">{myCrew.reputation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5 text-purple-400" />
            Top Syndicates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {crews.map((crew, index) => (
            <div
              key={crew.id}
              className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-gray-500">#{index + 1}</div>
                <div>
                  <h3 className="font-semibold text-white">{crew.name}</h3>
                  <p className="text-sm text-gray-400">{crew.description}</p>
                  <div className="flex gap-3 mt-2">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      {crew.member_count} members
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {crew.territory_count} territories
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-purple-600">{crew.reputation} Rep</Badge>
                {crew.is_recruiting && (
                  <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700">
                    Join
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}