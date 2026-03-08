import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import BaseBuilder from '../components/base/BaseBuilder';
import BaseDefenseSystem from '../components/base/BaseDefenseSystem';
import Base3DCrimeMap from '../components/base/Base3DCrimeMap';
import BaseLayoutDesigner from '../components/base/BaseLayoutDesigner';
import NPCFacilityManager from '../components/base/NPCFacilityManager';
import LEIntelligenceSystem from '../components/ai/LEIntelligenceSystem';
import BaseMissionCenter from '../components/base/BaseMissionCenter';
import AIFacilityManager from '../components/base/AIFacilityManager';
import BaseSecuritySystem from '../components/base/BaseSecuritySystem';
import { Building2, Shield, Map, Palette, Users, Eye, Target, Brain, Lock } from 'lucide-react';

export default function BaseManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBase, setSelectedBase] = useState(null);

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

  const { data: bases = [] } = useQuery({
    queryKey: ['playerBases', playerData?.id],
    queryFn: () => base44.entities.PlayerBase.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: baseFacilities = [] } = useQuery({
    queryKey: ['baseFacilities', bases[0]?.id],
    queryFn: () => base44.entities.BaseFacility.filter({ base_id: bases[0].id }),
    enabled: !!bases[0]?.id
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading base management...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-green-500/30 bg-gradient-to-r from-slate-900/50 via-green-900/20 to-slate-900/50 p-6">
        <div>
          <h1 className="text-3xl font-bold text-green-400 mb-2">Base Management</h1>
          <p className="text-gray-400">Establish, customize, and defend your criminal empire headquarters</p>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList className="glass-panel border border-green-500/20 flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="builder" className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />Build
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5" />Design
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />Staff
          </TabsTrigger>
          <TabsTrigger value="missions" className="flex items-center gap-1.5 text-xs">
            <Target className="w-3.5 h-3.5" />Missions
          </TabsTrigger>
          <TabsTrigger value="ai_staff" className="flex items-center gap-1.5 text-xs">
            <Brain className="w-3.5 h-3.5" />AI Staff
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5" />Security
          </TabsTrigger>
          <TabsTrigger value="defense" className="flex items-center gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" />Defense
          </TabsTrigger>
          <TabsTrigger value="intel" className="flex items-center gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5" />Intel
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-1.5 text-xs">
            <Map className="w-3.5 h-3.5" />Territory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <BaseBuilder playerData={playerData} />
        </TabsContent>

        <TabsContent value="design">
          {bases.length === 0 ? (
            <Card className="glass-panel border-blue-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to customize layout</p>
            </Card>
          ) : (
            <BaseLayoutDesigner selectedBase={selectedBase || bases[0]} />
          )}
        </TabsContent>

        <TabsContent value="staff">
          {bases.length === 0 ? (
            <Card className="glass-panel border-purple-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to hire staff</p>
            </Card>
          ) : (
            <NPCFacilityManager selectedBase={selectedBase || bases[0]} playerData={playerData} />
          )}
        </TabsContent>

        <TabsContent value="missions">
          {bases.length === 0 ? (
            <Card className="glass-panel border-blue-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to host missions</p>
            </Card>
          ) : (
            <Card className="glass-panel border-blue-500/20">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Target className="w-5 h-5 text-blue-400" />Base Mission Center</CardTitle></CardHeader>
              <div className="p-4">
                <BaseMissionCenter currentBase={bases[0]} baseFacilities={baseFacilities} playerData={playerData} />
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai_staff">
          {bases.length === 0 ? (
            <Card className="glass-panel border-pink-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to hire AI staff</p>
            </Card>
          ) : (
            <Card className="glass-panel border-pink-500/20">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Brain className="w-5 h-5 text-pink-400" />AI Facility Managers</CardTitle></CardHeader>
              <div className="p-4">
                <AIFacilityManager currentBase={bases[0]} baseFacilities={baseFacilities} playerData={playerData} />
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security">
          {bases.length === 0 ? (
            <Card className="glass-panel border-red-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to install security</p>
            </Card>
          ) : (
            <Card className="glass-panel border-red-500/20">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Lock className="w-5 h-5 text-red-400" />Base Security Systems</CardTitle></CardHeader>
              <div className="p-4">
                <BaseSecuritySystem currentBase={bases[0]} playerData={playerData} />
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="defense">
          {bases.length === 0 ? (
            <Card className="glass-panel border-red-500/20 p-6 text-center">
              <p className="text-gray-400">Establish a base first to manage defenses</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {bases.map((base) => (
                <BaseDefenseSystem
                  key={base.id}
                  playerData={playerData}
                  selectedBase={base}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="intel">
          <LEIntelligenceSystem playerData={playerData} bases={bases} />
        </TabsContent>

        <TabsContent value="map">
          <Base3DCrimeMap bases={bases} playerLocation={{ x: 50, y: 50 }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}