import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, Globe } from 'lucide-react';
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
          <TrendingUp className="w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading Global Economic Command...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Similar to Live Intelligence Map style */}
      <Card className="glass-panel border-green-500/30 bg-gradient-to-r from-slate-900/50 via-green-900/20 to-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-green-400" />
            <span className="text-2xl text-white">Global Macro Economic Command</span>
          </CardTitle>
          <p className="text-gray-400 text-sm mt-2">
            Real-time economic intelligence and market dynamics
          </p>
        </CardHeader>
      </Card>

      {/* Dashboard Content */}
      <MacroEconomicDashboard playerData={playerData} />
    </div>
  );
}