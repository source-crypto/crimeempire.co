import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, User } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectMessages({ playerData }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list('-created_date', 100),
    staleTime: 60000
  });

  const otherPlayers = allPlayers.filter(p => p.id !== playerData.id);

  const { data: messages = [] } = useQuery({
    queryKey: ['directMessages', playerData.id, selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return [];
      
      const sent = await base44.entities.Message.filter({
        sender_id: playerData.id,
        recipient_id: selectedPlayerId,
        conversation_type: 'direct'
      }, '-created_date', 50) || [];

      const received = await base44.entities.Message.filter({
        sender_id: selectedPlayerId,
        recipient_id: playerData.id,
        conversation_type: 'direct'
      }, '-created_date', 50) || [];

      return [...sent, ...received].sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    enabled: !!selectedPlayerId,
    staleTime: 5000,
    refetchInterval: 15000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      return base44.entities.Message.create({
        sender_id: playerData.id,
        sender_username: playerData.username,
        recipient_id: selectedPlayerId,
        conversation_type: 'direct',
        message_text: text,
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
      setMessageText('');
      toast.success('Message sent');
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      for (const id of messageIds) {
        await base44.entities.Message.update(id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
    }
  });

  useEffect(() => {
    if (messages.length > 0) {
      const unreadMessages = messages.filter(m => 
        m.recipient_id === playerData.id && !m.is_read
      );
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate(unreadMessages.map(m => m.id));
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedPlayerId) return;
    sendMessageMutation.mutate(messageText);
  };

  const selectedPlayer = otherPlayers.find(p => p.id === selectedPlayerId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Player List */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            Players
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {otherPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedPlayerId === player.id
                      ? 'bg-purple-600/30 border border-purple-500/50'
                      : 'bg-slate-900/50 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">{player.username}</p>
                      <p className="text-xs text-gray-400">Level {player.level}</p>
                    </div>
                    <Badge className="bg-cyan-600 text-xs">
                      {player.crew_role || 'Solo'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="md:col-span-2 glass-panel border-cyan-500/30">
        <CardHeader className="border-b border-cyan-500/20">
          <CardTitle className="text-white text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              {selectedPlayer ? selectedPlayer.username : 'Select a player'}
            </div>
            {selectedPlayer && (
              <Badge className="bg-purple-600">
                {selectedPlayer.crew_role || 'Independent'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {!selectedPlayerId ? (
            <div className="flex items-center justify-center h-96 text-gray-400">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a player to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <ScrollArea className="h-96 pr-4">
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isSender = message.sender_id === playerData.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            isSender
                              ? 'bg-purple-600/30 border border-purple-500/50'
                              : 'bg-slate-800/50 border border-slate-700/50'
                          }`}
                        >
                          <p className="text-xs text-gray-400 mb-1">
                            {message.sender_username}
                          </p>
                          <p className="text-white text-sm">{message.message_text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(message.created_date).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Send Message */}
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-slate-900/50 border-purple-500/20 text-white"
                />
                <Button
                  type="submit"
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}