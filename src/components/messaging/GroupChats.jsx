import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, Send, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupChats({ playerData }) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: crewData } = useQuery({
    queryKey: ['crew', playerData.crew_id],
    queryFn: () => base44.entities.Crew.filter({ id: playerData.crew_id }),
    enabled: !!playerData.crew_id,
    select: (data) => data[0],
    staleTime: 60000
  });

  const { data: crewMessages = [] } = useQuery({
    queryKey: ['crewMessages', playerData.crew_id],
    queryFn: () => base44.entities.Message.filter({
      conversation_type: 'crew',
      conversation_id: playerData.crew_id
    }, '-created_date', 50),
    enabled: !!playerData.crew_id,
    staleTime: 5000,
    refetchInterval: 15000,
    select: (data) => data.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    )
  });

  const sendCrewMessageMutation = useMutation({
    mutationFn: async (text) => {
      return base44.entities.Message.create({
        sender_id: playerData.id,
        sender_username: playerData.username,
        conversation_type: 'crew',
        conversation_id: playerData.crew_id,
        message_text: text,
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crewMessages'] });
      setMessageText('');
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [crewMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendCrewMessageMutation.mutate(messageText);
  };

  if (!playerData.crew_id) {
    return (
      <Card className="glass-panel border-purple-500/30">
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Join a crew to access group chats</p>
          <Button 
            className="mt-4 bg-gradient-to-r from-purple-600 to-cyan-600"
            onClick={() => window.location.href = '/Crew'}
          >
            Find a Crew
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="text-white text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            {crewData?.name || 'Crew Chat'}
          </div>
          <Badge className="bg-purple-600">
            {crewMessages.length} messages
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Messages */}
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-3">
            {crewMessages.map((message) => {
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
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-gray-300">
                        {message.sender_username}
                      </p>
                      {message.sender_id === playerData.id && (
                        <Badge className="bg-cyan-600 text-xs">You</Badge>
                      )}
                    </div>
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
            placeholder="Message your crew..."
            className="bg-slate-900/50 border-purple-500/20 text-white"
          />
          <Button
            type="submit"
            disabled={!messageText.trim() || sendCrewMessageMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-cyan-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}