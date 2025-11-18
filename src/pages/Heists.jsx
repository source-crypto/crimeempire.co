import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, DollarSign, Users } from 'lucide-react';
import HeistScout from '../components/heist/HeistScout';
import HeistPlanner from '../components/heist/HeistPlanner';
import { format } from 'date-fns';

export default function Heists() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [planningMode, setPlanningMode] = useState(false);

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

  const { data: heists = [] } = useQuery({
    queryKey: ['heists', playerData?.crew_id],
    queryFn: () => base44.entities.Heist.filter({ crew_id: playerData.crew_id }, '-created_date', 20),
    enabled: !!playerData?.crew_id,
  });

  const handleSelectTarget = (target) => {
    setSelectedTarget(target);
    setPlanningMode(true);
  };

  const handleBack = () => {
    setSelectedTarget(null);
    setPlanningMode(false);
  };

  if (!playerData) {
    return (
      <div className="text-center py-12">
        <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
      </div>
    );
  }

  if (planningMode && selectedTarget) {
    return (
      <HeistPlanner
        selectedTarget={selectedTarget}
        playerData={playerData}
        crewId={playerData.crew_id}
        onBack={handleBack}
      />
    );
  }

  const statusColors = {
    planning: 'bg-yellow-600',
    in_progress: 'bg-blue-600',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
    busted: 'bg-red-600'
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Heist Planning</h1>
        <p className="text-gray-400">Use AI to scout targets and plan the perfect heist</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scout Targets */}
        <div className="lg:col-span-2">
          <HeistScout playerData={playerData} onSelectTarget={handleSelectTarget} />
        </div>

        {/* Recent Heists */}
        <div>
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-purple-400" />
                Recent Heists
                <Badge className="ml-auto bg-purple-600">{heists.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {heists.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No heists yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heists.map((heist) => (
                    <div
                      key={heist.id}
                      className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white text-sm">
                            {heist.heist_name}
                          </h4>
                          <p className="text-xs text-gray-400">
                            {format(new Date(heist.created_date), 'MMM d, HH:mm')}
                          </p>
                        </div>
                        <Badge className={statusColors[heist.status]}>
                          {heist.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1 text-gray-400">
                          <DollarSign className="w-3 h-3" />
                          <span>${(heist.estimated_payout || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Users className="w-3 h-3" />
                          <span>{heist.participants?.length || 0} crew</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}