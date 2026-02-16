import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  BookOpen, Target, Gift, Map, Building2, Users, 
  ChevronRight, CheckCircle, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function StoryArcDisplay({ playerData }) {
  const [advancing, setAdvancing] = useState(null);
  const queryClient = useQueryClient();

  const { data: activeArcs = [] } = useQuery({
    queryKey: ['narrativeArcs', playerData?.id],
    queryFn: () => base44.entities.NarrativeArc.filter({ 
      player_id: playerData.id,
      status: 'active'
    }, '-created_date', 5),
    enabled: !!playerData,
    staleTime: 30000
  });

  const { data: completedArcs = [] } = useQuery({
    queryKey: ['completedArcs', playerData?.id],
    queryFn: () => base44.entities.NarrativeArc.filter({ 
      player_id: playerData.id,
      status: 'completed'
    }, '-created_date', 10),
    enabled: !!playerData,
    staleTime: 60000
  });

  const advanceChapterMutation = useMutation({
    mutationFn: async ({ arc, choice }) => {
      const nextChapter = arc.current_chapter + 1;
      
      // AI generates next chapter based on choice
      const prompt = `
Continue this narrative arc based on player choice:

Arc: ${arc.arc_title}
Type: ${arc.arc_type}
Current Chapter: ${arc.current_chapter}/${arc.total_chapters}
Previous Story: ${arc.narrative_text}
Player Choice: ${choice}

Generate the next chapter that:
1. Reacts to the player's choice
2. Escalates tension and stakes
3. Provides new objective
4. ${nextChapter === arc.total_chapters ? 'Brings the arc to a satisfying conclusion' : 'Sets up for future chapters'}
`;

      const nextChapterStory = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            narrative_text: { type: "string" },
            new_objective: { type: "string" },
            consequence: { type: "string" }
          }
        }
      });

      const updatedChoices = [...(arc.choices_made || []), { chapter: arc.current_chapter, choice }];
      const isComplete = nextChapter > arc.total_chapters;

      await base44.entities.NarrativeArc.update(arc.id, {
        current_chapter: nextChapter,
        narrative_text: nextChapterStory.narrative_text,
        current_objective: nextChapterStory.new_objective,
        choices_made: updatedChoices,
        status: isComplete ? 'completed' : 'active'
      });

      // Award rewards if complete
      if (isComplete && arc.rewards) {
        if (arc.rewards.crypto) {
          await base44.entities.Player.update(playerData.id, {
            crypto_balance: playerData.crypto_balance + arc.rewards.crypto
          });
          
          await base44.entities.TransactionLog.create({
            player_id: playerData.id,
            transaction_type: 'narrative_reward',
            amount: arc.rewards.crypto,
            balance_after: playerData.crypto_balance + arc.rewards.crypto,
            description: `Completed story arc: ${arc.arc_title}`
          });
        }

        if (arc.rewards.reputation_boost) {
          const playerRep = await base44.entities.PlayerReputation.filter({ player_id: playerData.id });
          if (playerRep[0]) {
            await base44.entities.PlayerReputation.update(playerRep[0].id, {
              reputation_score: (playerRep[0].reputation_score || 0) + arc.rewards.reputation_boost
            });
          }
        }

        await base44.entities.Notification.create({
          player_id: playerData.id,
          notification_type: 'resource_ready',
          title: `Story Arc Complete: ${arc.arc_title}`,
          message: `You've earned $${arc.rewards.crypto?.toLocaleString()} and ${arc.rewards.reputation_boost} reputation!`,
          priority: 'high'
        });
      }

      return { arc, isComplete };
    },
    onSuccess: ({ isComplete }) => {
      queryClient.invalidateQueries(['narrativeArcs']);
      queryClient.invalidateQueries(['completedArcs']);
      queryClient.invalidateQueries(['player']);
      toast.success(isComplete ? 'Story arc completed!' : 'Chapter advanced!');
    }
  });

  const handleChoice = (arc, choice) => {
    setAdvancing(arc.id);
    advanceChapterMutation.mutate({ arc, choice });
    setTimeout(() => setAdvancing(null), 3000);
  };

  const getArcTypeIcon = (type) => {
    const icons = {
      empire_building: Building2,
      war: Target,
      mystery: BookOpen,
      betrayal: Users,
      revenge: Target,
      ambition: Target,
      redemption: Gift
    };
    return icons[type] || BookOpen;
  };

  return (
    <Tabs defaultValue="active" className="space-y-4">
      <TabsList className="glass-panel">
        <TabsTrigger value="active">
          Active Stories ({activeArcs.length})
        </TabsTrigger>
        <TabsTrigger value="completed">
          Completed ({completedArcs.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-4">
        {activeArcs.length === 0 ? (
          <Card className="glass-panel border-purple-500/20">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-purple-400 opacity-50" />
              <p className="text-gray-400">No active story arcs. Generate one to begin your journey.</p>
            </CardContent>
          </Card>
        ) : (
          activeArcs.map((arc) => {
            const Icon = getArcTypeIcon(arc.arc_type);
            const progress = (arc.current_chapter / arc.total_chapters) * 100;

            return (
              <Card key={arc.id} className="glass-panel border-purple-500/20">
                <CardHeader className="border-b border-purple-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6 text-purple-400" />
                      <div>
                        <CardTitle className="text-white">{arc.arc_title}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge className="bg-purple-600 capitalize">{arc.arc_type.replace(/_/g, ' ')}</Badge>
                          <Badge className={
                            arc.difficulty === 'extreme' ? 'bg-red-600' :
                            arc.difficulty === 'hard' ? 'bg-orange-600' :
                            arc.difficulty === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                          }>
                            {arc.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Chapter</p>
                      <p className="text-xl font-bold text-purple-400">
                        {arc.current_chapter}/{arc.total_chapters}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Progress value={progress} className="h-2 mb-2" />
                    <p className="text-xs text-gray-500">{progress.toFixed(0)}% Complete</p>
                  </div>

                  <div className="p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
                    <p className="text-gray-300 leading-relaxed">{arc.narrative_text}</p>
                  </div>

                  <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-blue-400 font-semibold mb-1">Current Objective</p>
                        <p className="text-sm text-gray-300">{arc.current_objective}</p>
                      </div>
                    </div>
                  </div>

                  {arc.integration_points && Object.keys(arc.integration_points).length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {arc.integration_points.territory_id && (
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          <Map className="w-3 h-3 mr-1" />
                          Territory Connected
                        </Badge>
                      )}
                      {arc.integration_points.enterprise_id && (
                        <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                          <Building2 className="w-3 h-3 mr-1" />
                          Enterprise Connected
                        </Badge>
                      )}
                      {arc.integration_points.faction_id && (
                        <Badge variant="outline" className="text-purple-400 border-purple-400">
                          <Users className="w-3 h-3 mr-1" />
                          Faction Connected
                        </Badge>
                      )}
                    </div>
                  )}

                  {arc.rewards && (
                    <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                      <div className="flex items-start gap-2">
                        <Gift className="w-4 h-4 text-yellow-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-yellow-400 font-semibold mb-1">Arc Completion Rewards</p>
                          <div className="text-xs text-gray-300 space-y-1">
                            {arc.rewards.crypto && <p>💰 ${arc.rewards.crypto.toLocaleString()}</p>}
                            {arc.rewards.reputation_boost && <p>⭐ {arc.rewards.reputation_boost} Reputation</p>}
                            {arc.rewards.unlocked_content?.length > 0 && (
                              <p>🔓 {arc.rewards.unlocked_content.length} Special Unlocks</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleChoice(arc, 'aggressive')}
                      disabled={advancing === arc.id}
                      className="bg-gradient-to-r from-red-600 to-orange-600"
                    >
                      {advancing === arc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Aggressive Approach</>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleChoice(arc, 'strategic')}
                      disabled={advancing === arc.id}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {advancing === arc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Strategic Approach</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="completed" className="space-y-3">
        {completedArcs.map((arc) => {
          const Icon = getArcTypeIcon(arc.arc_type);
          return (
            <Card key={arc.id} className="glass-panel border-green-500/20 bg-green-900/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{arc.arc_title}</h4>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{arc.arc_type.replace(/_/g, ' ')}</p>
                  </div>
                  {arc.rewards?.crypto && (
                    <Badge className="bg-green-600">+${arc.rewards.crypto.toLocaleString()}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>
    </Tabs>
  );
}