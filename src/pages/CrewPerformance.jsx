import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import CrewPerformanceDashboard from '@/components/crew/CrewPerformanceDashboard';
import { Loader2 } from 'lucide-react';

export default function CrewPerformance() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0] || null;
    },
    enabled: !!user?.email,
  });

  if (!playerData) return (
    <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Crew Performance
        </h1>
        <p className="text-gray-400 mt-1">Aggregate view of job titles, reputation, and performance ratings for every crew member</p>
      </div>
      {playerData.crew_id ? (
        <CrewPerformanceDashboard crewId={playerData.crew_id} />
      ) : (
        <div className="glass-panel border border-purple-500/20 rounded-lg p-8 text-center text-gray-400">
          You need to be in a crew to view performance metrics.
        </div>
      )}
    </div>
  );
}