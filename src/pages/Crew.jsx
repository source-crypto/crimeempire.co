import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, Activity, Shield, Settings as SettingsIcon } from 'lucide-react';
import CrewChat from '../components/crew/CrewChat';
import CrewActivityFeed from '../components/crew/CrewActivityFeed';
import CrewRoleManager from '../components/crew/CrewRoleManager';
import CrewActions from '../components/crew/CrewActions';

export default function Crew() {
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

  const { data: permissions } = useQuery({
    queryKey: ['permissions', playerData?.id],
    queryFn: async () => {
      const perms = await base44.entities.CrewPermission.filter({
        crew_id: playerData.crew_id,
        player_id: playerData.id
      });
      return perms[0];
    },
    enabled: !!playerData?.crew_id && !!playerData?.id,
  });

  if (!playerData || !crewData) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold text-white mb-2">No Crew</h2>
        <p className="text-gray-400">You need to join or create a crew first</p>
      </div>
    );
  }

  const canManageRoles = permissions?.permissions?.assign_roles || playerData.crew_role === 'boss';
  const canManageMembers = permissions?.permissions?.manage_members || playerData.crew_role === 'boss';

  return (
    <div className="space-y-6">
      {/* Crew Header */}
      <Card className="glass-panel border-purple-500/20 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{crewData.name}</h1>
            <p className="text-gray-400">{crewData.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Members</p>
                <p className="text-2xl font-bold text-white">{crewData.member_count}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Territories</p>
                <p className="text-2xl font-bold text-cyan-400">{crewData.territory_count}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Reputation</p>
                <p className="text-2xl font-bold text-purple-400">{crewData.reputation}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Crew Management Tabs */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity Feed
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <CrewChat crewId={crewData.id} currentPlayer={playerData} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <CrewActivityFeed crewId={crewData.id} />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <CrewRoleManager
            crewId={crewData.id}
            currentPlayerRole={playerData.crew_role}
            canManageRoles={canManageRoles}
          />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <CrewActions
            crewId={crewData.id}
            playerData={playerData}
            canManage={canManageMembers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}