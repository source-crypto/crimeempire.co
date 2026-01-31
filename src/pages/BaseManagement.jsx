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
import { Building2, Shield, Map, Palette, Users, Eye } from 'lucide-react';

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

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading base management...</p>
        </Card>
      </div>
    );
  }

  const [selectedBase, setSelectedBase] = useState(null);

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
        <TabsList className="glass-panel border border-green-500/20">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Build
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="defense" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Defense
          </TabsTrigger>
          <TabsTrigger value="intel" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Intel
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Territory
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