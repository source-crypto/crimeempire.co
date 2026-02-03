import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import StrategicAdvisor from '../components/ai/StrategicAdvisor';
import { Brain } from 'lucide-react';

export default function Strategy() {
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
    enabled: !!currentUser?.email
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-slate-900/50 via-cyan-900/20 to-slate-900/50 p-6">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 mb-2">AI Strategic Advisor</h1>
            <p className="text-gray-400">Get AI-powered insights and recommendations</p>
          </div>
        </div>
      </Card>

      <StrategicAdvisor playerData={playerData} />
    </div>
  );
}