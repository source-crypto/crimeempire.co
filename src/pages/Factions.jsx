import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FactionManagement from '../components/factions/FactionManagement';
import AIDiplomacySystem from '../components/factions/AIDiplomacySystem';
import FactionQuestBoard from '../components/factions/FactionQuestBoard';
import FactionWarfare from '../components/factions/FactionWarfare';
import { Users, Brain, Shield, Target, Swords } from 'lucide-react';

export default function Factions() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: () => base44.entities.Player.filter({ created_by: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0]
  });

  const { data: playerFactionData } = useQuery({
    queryKey: ['playerFaction', playerData?.id],
    queryFn: async () => {
      const members = await base44.entities.FactionMember.filter({ 
        player_id: playerData.id 
      });
      if (members.length > 0) {
        const factions = await base44.entities.Faction.filter({ 
          id: members[0].faction_id 
        });
        return { faction: factions[0], membership: members[0] };
      }
      return null;
    },
    enabled: !!playerData?.id
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Factions
        </h1>
        <p className="text-gray-400 mt-1">Form alliances, negotiate deals, and dominate the underworld</p>
      </div>

      <Tabs defaultValue="faction" className="space-y-6">
        <TabsList className="glass-panel border-purple-500/30 flex-wrap h-auto">
          <TabsTrigger value="faction" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            My Faction
          </TabsTrigger>
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Quests
          </TabsTrigger>
          <TabsTrigger value="warfare" className="flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Warfare
          </TabsTrigger>
          <TabsTrigger value="diplomacy" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Diplomacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faction">
          <FactionManagement playerData={playerData} />
        </TabsContent>

        <TabsContent value="quests">
          {playerFactionData ? (
            <FactionQuestBoard 
              playerData={playerData} 
              factionMembership={playerFactionData.membership}
            />
          ) : (
            <div className="glass-panel border-purple-500/30 p-8 text-center">
              <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Join or create a faction to access quests</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="warfare">
          {playerFactionData ? (
            <FactionWarfare 
              playerData={playerData}
              playerFaction={playerFactionData.faction}
              factionMembership={playerFactionData.membership}
            />
          ) : (
            <div className="glass-panel border-purple-500/30 p-8 text-center">
              <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Join or create a faction to participate in warfare</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="diplomacy">
          {playerFactionData ? (
            <AIDiplomacySystem playerFaction={playerFactionData.faction} />
          ) : (
            <div className="glass-panel border-purple-500/30 p-8 text-center">
              <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Join or create a faction to access diplomacy features</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}