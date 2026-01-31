import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import ReputationDisplay from '../components/reputation/ReputationDisplay';
import ReputationManagement from '../components/reputation/ReputationManagement';
import { Crown, Target } from 'lucide-react';

export default function Reputation() {
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
    enabled: !!currentUser?.email,
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading reputation system...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-gold-500/30 bg-gradient-to-r from-slate-900/50 via-purple-900/20 to-slate-900/50 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-400 mb-2">Reputation Management</h1>
          <p className="text-gray-400">Track your standing with factions, law enforcement, and the underworld</p>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <ReputationDisplay playerData={playerData} />
        </TabsContent>

        <TabsContent value="actions">
          <ReputationManagement playerData={playerData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}