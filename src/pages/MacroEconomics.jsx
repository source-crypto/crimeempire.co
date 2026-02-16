import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import MacroEconomicDashboard from '../components/economy/MacroEconomicDashboard';

export default function MacroEconomicsPage() {
  const [currentUser, setCurrentUser] = useState(null);

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
    staleTime: 30000
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-400">Loading player data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MacroEconomicDashboard playerData={playerData} />
    </div>
  );
}