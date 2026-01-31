import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Gift, TrendingUp } from 'lucide-react';
import SkillTreeDisplay from '../components/progression/SkillTreeDisplay';
import PerkSystem from '../components/progression/PerkSystem';
import ExperienceTracker from '../components/progression/ExperienceTracker';

export default function Skills() {
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

  if (!playerData) {
    return <div className="text-white text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Character Progression
        </h1>
        <p className="text-gray-400 mt-1">Master skills, unlock perks, and specialize your playstyle</p>
      </div>

      <Tabs defaultValue="skills" className="space-y-4">
        <TabsList className="glass-panel border-purple-500/30">
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Skill Trees
          </TabsTrigger>
          <TabsTrigger value="perks" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Perks
          </TabsTrigger>
          <TabsTrigger value="experience" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Experience
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <SkillTreeDisplay playerData={playerData} />
        </TabsContent>

        <TabsContent value="perks">
          <PerkSystem playerData={playerData} />
        </TabsContent>

        <TabsContent value="experience">
          <ExperienceTracker playerData={playerData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}