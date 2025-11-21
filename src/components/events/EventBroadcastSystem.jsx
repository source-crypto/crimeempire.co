import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Radio, Users, MessageSquare, TrendingUp, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function EventBroadcastSystem({ playerData }) {
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [playerResponse, setPlayerResponse] = useState('');
  const queryClient = useQueryClient();

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['eventBroadcasts'],
    queryFn: () => base44.entities.EventBroadcast.filter({ status: 'active' }, '-created_date', 20),
    refetchInterval: 10000
  });

  const joinEventMutation = useMutation({
    mutationFn: async (broadcast) => {
      const alreadyJoined = broadcast.participants?.some(p => p.player_id === playerData.id);
      if (alreadyJoined) {
        throw new Error('Already joined this event');
      }

      const updatedParticipants = [...(broadcast.participants || []), {
        player_id: playerData.id,
        player_username: playerData.username,
        joined_at: new Date().toISOString(),
        contribution: 0
      }];

      await base44.entities.EventBroadcast.update(broadcast.id, {
        participants: updatedParticipants
      });

      return broadcast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['eventBroadcasts']);
      toast.success('Joined event!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const submitResponseMutation = useMutation({
    mutationFn: async () => {
      if (!playerResponse.trim()) throw new Error('Please provide a response');

      const prompt = `Assess this player's response to the event inquiry.

Event: ${selectedBroadcast.event_name}
Question: ${selectedBroadcast.ai_inquiry.question}
Context: ${selectedBroadcast.ai_inquiry.context}
Player Response: "${playerResponse}"

Assessment Criteria:
${selectedBroadcast.ai_inquiry.assessment_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Evaluate:
1. Relevance and understanding (0-100)
2. Strategic thinking (0-100)
3. Creativity (0-100)
4. Overall quality (0-100)
5. Provide feedback and suggestions
6. Calculate rewards based on performance`;

      const assessment = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            relevance_score: { type: "number" },
            strategic_score: { type: "number" },
            creativity_score: { type: "number" },
            overall_score: { type: "number" },
            feedback: { type: "string" },
            rewards: {
              type: "object",
              properties: {
                crypto: { type: "number" },
                experience: { type: "number" },
                reputation: { type: "number" }
              }
            }
          }
        }
      });

      const updatedResponses = [...(selectedBroadcast.player_responses || []), {
        player_id: playerData.id,
        response: playerResponse,
        ai_assessment: assessment,
        score: assessment.overall_score
      }];

      await base44.entities.EventBroadcast.update(selectedBroadcast.id, {
        player_responses: updatedResponses
      });

      if (assessment.rewards.crypto > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance + assessment.rewards.crypto,
          experience: (playerData.experience || 0) + assessment.rewards.experience
        });

        await base44.entities.TransactionLog.create({
          transaction_type: 'enterprise_revenue',
          player_id: playerData.id,
          player_username: playerData.username,
          amount: assessment.rewards.crypto,
          description: `Event Assessment Reward: ${selectedBroadcast.event_name}`,
          status: 'completed'
        });
      }

      return assessment;
    },
    onSuccess: (assessment) => {
      queryClient.invalidateQueries(['eventBroadcasts']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Assessment complete! Score: ${assessment.overall_score}/100`);
      setPlayerResponse('');
      setSelectedBroadcast(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (!playerData) return null;

  if (selectedBroadcast) {
    const hasResponded = selectedBroadcast.player_responses?.some(r => r.player_id === playerData.id);

    return (
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">{selectedBroadcast.event_name}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setSelectedBroadcast(null)}>
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20">
            <p className="text-sm text-gray-300 mb-2">{selectedBroadcast.broadcast_message}</p>
            {selectedBroadcast.ai_inquiry && (
              <div className="mt-4 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                <p className="text-sm font-semibold text-blue-400 mb-2">📋 Event Assessment</p>
                <p className="text-sm text-white mb-2">{selectedBroadcast.ai_inquiry.question}</p>
                <p className="text-xs text-gray-400 mb-3">{selectedBroadcast.ai_inquiry.context}</p>
                
                {hasResponded ? (
                  <div className="p-3 rounded bg-green-900/20 border border-green-500/30">
                    <p className="text-sm text-green-400">✓ You've completed this assessment</p>
                    {selectedBroadcast.player_responses.find(r => r.player_id === playerData.id)?.ai_assessment && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-300">
                          Score: {selectedBroadcast.player_responses.find(r => r.player_id === playerData.id).score}/100
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Textarea
                      placeholder="Your strategic response..."
                      value={playerResponse}
                      onChange={(e) => setPlayerResponse(e.target.value)}
                      className="bg-slate-900/50 border-blue-500/20 text-white mb-3"
                      rows={4}
                    />
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                      onClick={() => submitResponseMutation.mutate()}
                      disabled={submitResponseMutation.isPending}
                    >
                      {submitResponseMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assessing...</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" /> Submit Response</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{selectedBroadcast.participants?.length || 0} participants joined</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-purple-400" />
          Global Event Broadcasts
          <Badge className="ml-auto bg-purple-600">{broadcasts.length} Active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {broadcasts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active broadcasts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((broadcast) => {
              const isParticipant = broadcast.participants?.some(p => p.player_id === playerData.id);
              const hasResponded = broadcast.player_responses?.some(r => r.player_id === playerData.id);

              return (
                <div
                  key={broadcast.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
                  onClick={() => setSelectedBroadcast(broadcast)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold">{broadcast.event_name}</h4>
                      <p className="text-xs text-gray-400 capitalize">{broadcast.event_type?.replace('_', ' ')}</p>
                    </div>
                    <Badge className={isParticipant ? 'bg-green-600' : 'bg-blue-600'}>
                      {isParticipant ? 'Joined' : 'Open'}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-300 mb-3 line-clamp-2">{broadcast.broadcast_message}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {broadcast.participants?.length || 0}
                      </span>
                      {broadcast.ai_inquiry && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Assessment
                        </span>
                      )}
                    </div>
                    {!isParticipant ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-500/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          joinEventMutation.mutate(broadcast);
                        }}
                        disabled={joinEventMutation.isPending}
                      >
                        Join Event
                      </Button>
                    ) : hasResponded ? (
                      <Badge className="bg-green-600">Completed</Badge>
                    ) : (
                      <Badge className="bg-yellow-600">Respond</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}