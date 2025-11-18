import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Crown, Shield, Zap, Users } from 'lucide-react';
import { format } from 'date-fns';

const roleIcons = {
  boss: Crown,
  underboss: Shield,
  capo: Zap,
  soldier: Users,
  associate: Users
};

const roleColors = {
  boss: 'text-yellow-400',
  underboss: 'text-purple-400',
  capo: 'text-cyan-400',
  soldier: 'text-green-400',
  associate: 'text-gray-400'
};

export default function CrewChat({ crewId, currentPlayer }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['crewMessages', crewId],
    queryFn: () => base44.entities.CrewMessage.filter({ crew_id: crewId }, '-created_date', 100),
    refetchInterval: 3000,
    enabled: !!crewId
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.CrewMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries(['crewMessages', crewId]);
      setMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    await sendMessageMutation.mutateAsync({
      crew_id: crewId,
      sender_id: currentPlayer.id,
      sender_username: currentPlayer.username,
      sender_role: currentPlayer.crew_role,
      message: message.trim(),
      message_type: 'text'
    });
  };

  return (
    <Card className="glass-panel border-purple-500/20 h-[500px] flex flex-col">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white text-lg">Crew Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.reverse().map((msg) => {
            const RoleIcon = roleIcons[msg.sender_role] || Users;
            const isSystem = msg.message_type === 'system';
            const isCurrentUser = msg.sender_id === currentPlayer.id;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-300 text-xs">
                    {msg.message}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-lg ${roleColors[msg.sender_role]}`}>
                  <RoleIcon className="w-5 h-5" />
                </div>
                <div className={`flex-1 ${isCurrentUser ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${roleColors[msg.sender_role]}`}>
                      {msg.sender_username}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {msg.sender_role}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      isCurrentUser
                        ? 'bg-purple-600/30 text-white'
                        : 'bg-slate-800/50 text-gray-200'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-purple-500/20">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-900/50 border-purple-500/20 text-white"
              maxLength={500}
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}