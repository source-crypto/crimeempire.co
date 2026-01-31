import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NPCBehaviorSimulator from '../components/ai/NPCBehaviorSimulator';
import FactionAIReactivitySystem from '../components/ai/FactionAIReactivitySystem';
import LawEnforcementInvestigationTracker from '../components/ai/LawEnforcementInvestigationTracker';
import { Users, Brain, Shield } from 'lucide-react';

export default function AIManagement() {
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

  const { data: playerReputation } = useQuery({
    queryKey: ['playerReputation', playerData?.id],
    queryFn: async () => {
      const reps = await base44.entities.PlayerReputation.filter({ player_id: playerData.id });
      return reps[0] || {};
    },
    enabled: !!playerData?.id
  });

  const { data: enterpriseNPCs = [] } = useQuery({
    queryKey: ['enterpriseNPCs'],
    queryFn: () => base44.entities.EnterpriseNPC.list()
  });

  const { data: factions = [] } = useQuery({
    queryKey: ['factions'],
    queryFn: () => base44.entities.Faction.list()
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading AI systems...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-slate-900/50 via-cyan-900/20 to-slate-900/50 p-6">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">Advanced AI Systems</h1>
          <p className="text-gray-400">Monitor NPC behavior, faction decisions, and law enforcement investigations</p>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="npcs" className="space-y-4">
        <TabsList className="glass-panel border border-cyan-500/20">
          <TabsTrigger value="npcs" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            NPC AI
          </TabsTrigger>
          <TabsTrigger value="factions" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Faction AI
          </TabsTrigger>
          <TabsTrigger value="law" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Law Enforcement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="npcs">
          <NPCBehaviorSimulator enterpriseNPCs={enterpriseNPCs} />
        </TabsContent>

        <TabsContent value="factions">
          <FactionAIReactivitySystem factions={factions} />
        </TabsContent>

        <TabsContent value="law">
          <LawEnforcementInvestigationTracker 
            playerData={playerData}
            playerReputation={playerReputation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}