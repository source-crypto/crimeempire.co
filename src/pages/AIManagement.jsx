import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NPCBehaviorSimulator from '../components/ai/NPCBehaviorSimulator';
import FactionAIReactivitySystem from '../components/ai/FactionAIReactivitySystem';
import LawEnforcementInvestigationTracker from '../components/ai/LawEnforcementInvestigationTracker';
import AIMissionDirector from '../components/ai/AIMissionDirector';
import ChaseSequenceManager from '../components/ai/ChaseSequenceManager';
import EventDrivenLEResponse from '../components/ai/EventDrivenLEResponse';
import FacilityIntelligenceOps from '../components/ai/FacilityIntelligenceOps';
import NPCInfiltrationSystem from '../components/ai/NPCInfiltrationSystem';
import { Users, Brain, Shield, Target, AlertTriangle, Activity, Search, UserX } from 'lucide-react';

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
    staleTime: 30000
  });

  const { data: playerReputation } = useQuery({
    queryKey: ['playerReputation', playerData?.id],
    queryFn: async () => {
      const reps = await base44.entities.PlayerReputation.filter({ player_id: playerData.id });
      return reps[0] || {};
    },
    enabled: !!playerData?.id,
    staleTime: 30000
  });

  const { data: enterpriseNPCs = [] } = useQuery({
    queryKey: ['enterpriseNPCs'],
    queryFn: () => base44.entities.EnterpriseNPC.list(),
    staleTime: 30000
  });

  const { data: factions = [] } = useQuery({
    queryKey: ['factions'],
    queryFn: () => base44.entities.Faction.list(),
    staleTime: 30000
  });

  const { data: leResponse } = useQuery({
    queryKey: ['lawEnforcementResponse', playerData?.id],
    queryFn: async () => {
      const responses = await base44.entities.LawEnforcementResponse.filter({ player_id: playerData.id });
      return responses[0] || null;
    },
    enabled: !!playerData?.id,
    staleTime: 30000
  });

  const { data: bases = [] } = useQuery({
    queryKey: ['playerBases', playerData?.id],
    queryFn: () => base44.entities.PlayerBase.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id,
    staleTime: 30000
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
          <TabsTrigger value="missions" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Mission Director
          </TabsTrigger>
          <TabsTrigger value="chase" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Chase System
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Event Response
          </TabsTrigger>
          <TabsTrigger value="facility" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Facility Intel
          </TabsTrigger>
          <TabsTrigger value="infiltration" className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            NPC Infiltration
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

        <TabsContent value="missions">
          <AIMissionDirector 
            playerData={playerData}
            playerReputation={playerReputation}
          />
        </TabsContent>

        <TabsContent value="chase">
          <ChaseSequenceManager 
            playerData={playerData}
            leResponse={leResponse}
          />
        </TabsContent>

        <TabsContent value="events">
          <EventDrivenLEResponse 
            playerData={playerData}
            bases={bases}
          />
        </TabsContent>

        <TabsContent value="facility">
          {bases.length === 0 ? (
            <Card className="glass-panel border-blue-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to view facility intel</p>
            </Card>
          ) : (
            <FacilityIntelligenceOps selectedBase={bases[0]} />
          )}
        </TabsContent>

        <TabsContent value="infiltration">
          {bases.length === 0 ? (
            <Card className="glass-panel border-purple-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to view infiltration attempts</p>
            </Card>
          ) : (
            <NPCInfiltrationSystem selectedBase={bases[0]} playerData={playerData} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}