import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageCircle, Users, Bell, Send } from 'lucide-react';
import DirectMessages from '../components/messaging/DirectMessages';
import GroupChats from '../components/messaging/GroupChats';
import NotificationCenter from '../components/messaging/NotificationCenter';

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState('direct');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: () => base44.entities.Player.filter({ created_by: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0]
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unreadMessages', playerData?.id],
    queryFn: () => base44.entities.Message.filter({ 
      recipient_id: playerData.id,
      is_read: false 
    }),
    enabled: !!playerData?.id,
    refetchInterval: 10000
  });

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['unreadNotifications', playerData?.id],
    queryFn: () => base44.entities.Notification.filter({ 
      player_id: playerData.id,
      is_read: false 
    }),
    enabled: !!playerData?.id,
    refetchInterval: 10000
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading Messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Communications Hub
          </h1>
          <p className="text-gray-400 mt-1">Messages, group chats, and notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Unread Messages</p>
                <p className="text-2xl font-bold text-white">{unreadMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Active Chats</p>
                <p className="text-2xl font-bold text-white">
                  {playerData.crew_id ? 1 : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Notifications</p>
                <p className="text-2xl font-bold text-white">{unreadNotifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-panel border-purple-500/20">
          <TabsTrigger value="direct">
            <MessageCircle className="w-4 h-4 mr-2" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="group">
            <Users className="w-4 h-4 mr-2" />
            Group Chats
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct">
          <DirectMessages playerData={playerData} />
        </TabsContent>

        <TabsContent value="group">
          <GroupChats playerData={playerData} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationCenter playerData={playerData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}