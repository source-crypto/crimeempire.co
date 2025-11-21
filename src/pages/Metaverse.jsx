import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, BarChart3, Shield, Zap, Globe } from 'lucide-react';
import MissionBoard from '../components/missions/MissionBoard';
import DynamicMarket from '../components/marketplace/DynamicMarket';
import RivalFactionSystem from '../components/factions/RivalFactionSystem';
import WorldEventSystem from '../components/worldevents/WorldEventSystem';
import PlayerInitiatedEvents from '../components/worldevents/PlayerInitiatedEvents';
import FactionDiplomacySystem from '../components/diplomacy/FactionDiplomacySystem';

export default function Metaverse() {
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
  });

  const { data: crewData } = useQuery({
    queryKey: ['crew', playerData?.crew_id],
    queryFn: async () => {
      const crews = await base44.entities.Crew.filter({ id: playerData.crew_id });
      return crews[0];
    },
    enabled: !!playerData?.crew_id,
  });

  if (!playerData) {
    return (
      <div className="text-center py-12">
        <Zap className="w-16 h-16 mx-auto mb-4 text-purple-400 animate-pulse" />
        <h2 className="text-2xl font-bold text-white">Loading Metaverse...</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Crime Metaverse</h1>
        <p className="text-gray-400">
          AI-driven missions, dynamic markets, and rival factions in a living game world
        </p>
      </div>

      <Tabs defaultValue="missions" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="missions" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Missions
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Market
          </TabsTrigger>
          <TabsTrigger value="factions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Rival Factions
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            World Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missions">
          <MissionBoard playerData={playerData} />
        </TabsContent>

        <TabsContent value="market">
          <DynamicMarket playerData={playerData} />
        </TabsContent>

        <TabsContent value="factions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RivalFactionSystem playerData={playerData} />
            <FactionDiplomacySystem playerData={playerData} crewData={crewData} />
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorldEventSystem playerData={playerData} />
            <PlayerInitiatedEvents playerData={playerData} crewData={crewData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}