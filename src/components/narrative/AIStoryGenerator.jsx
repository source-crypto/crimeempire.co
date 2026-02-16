import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIStoryGenerator({ playerData }) {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: playerStats } = useQuery({
    queryKey: ['playerStats', playerData?.id],
    queryFn: async () => ({
      enterprises: await base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }),
      territories: await base44.entities.Territory.list().then(t => t.filter(x => x.owner_id === playerData.id)),
      battles: await base44.entities.Battle.filter({ $or: [{ attacker_id: playerData.id }, { defender_id: playerData.id }] }),
      heists: await base44.entities.Heist.filter({ crew_id: playerData.crew_id }),
      factionMemberships: await base44.entities.FactionMember.filter({ player_id: playerData.id })
    }),
    enabled: !!playerData,
    staleTime: 60000
  });

  const generateArcMutation = useMutation({
    mutationFn: async () => {
      const stats = playerStats || {};
      const playstyle = playerData.playstyle || 'balanced';
      const achievements = playerData.stats || {};

      const prompt = `
Create a compelling narrative arc for a crime game player with this profile:

Playstyle: ${playstyle}
Level: ${playerData.level}
Territories: ${stats.territories?.length || 0}
Enterprises: ${stats.enterprises?.length || 0}
Battles Won: ${achievements.battles_won || 0}
Heists Completed: ${achievements.heists_completed || 0}
Wealth: $${playerData.crypto_balance}

Recent Context:
- Active in ${stats.territories?.length > 5 ? 'expansion' : stats.enterprises?.length > 3 ? 'business building' : 'early growth'}
- Combat style: ${achievements.battles_won > achievements.heists_completed ? 'aggressive' : 'strategic'}
- ${stats.factionMemberships?.length > 0 ? 'Has faction connections' : 'Independent operator'}

Generate a 5-chapter narrative arc that:
1. Feels personal and reactive to their actions
2. Offers meaningful choices that affect outcomes
3. Integrates with their existing assets (enterprises, territories)
4. Provides unique rewards matching their playstyle
5. Creates dramatic tension and memorable moments

Include: arc title, type, current objective, narrative description for chapter 1, and reward structure.
`;

      const story = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            arc_title: { type: "string" },
            arc_type: { type: "string" },
            narrative_text: { type: "string" },
            current_objective: { type: "string" },
            difficulty: { type: "string" },
            crypto_reward: { type: "number" },
            unlocked_content: { type: "array", items: { type: "string" } },
            reputation_boost: { type: "number" }
          }
        }
      });

      // Determine integration points
      const integrationPoints = {};
      if (stats.enterprises?.length > 0) {
        integrationPoints.enterprise_id = stats.enterprises[0].id;
      }
      if (stats.territories?.length > 0) {
        integrationPoints.territory_id = stats.territories[0].id;
      }
      if (stats.factionMemberships?.length > 0) {
        integrationPoints.faction_id = stats.factionMemberships[0].faction_id;
      }

      const arc = await base44.entities.NarrativeArc.create({
        player_id: playerData.id,
        arc_title: story.arc_title,
        arc_type: story.arc_type,
        current_chapter: 1,
        total_chapters: 5,
        narrative_text: story.narrative_text,
        current_objective: story.current_objective,
        trigger_context: {
          playstyle: playstyle,
          recent_actions: [`${achievements.battles_won} battles`, `${achievements.heists_completed} heists`],
          key_achievement: stats.territories?.length > 3 ? 'Territory Control' : stats.enterprises?.length > 2 ? 'Business Mogul' : 'Rising Power'
        },
        status: 'active',
        difficulty: story.difficulty || 'medium',
        rewards: {
          crypto: story.crypto_reward || 100000,
          unlocked_content: story.unlocked_content || [],
          reputation_boost: story.reputation_boost || 500
        },
        integration_points: integrationPoints,
        choices_made: [],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Create notification
      await base44.entities.Notification.create({
        player_id: playerData.id,
        notification_type: 'heist_opportunity',
        title: `New Story Arc: ${story.arc_title}`,
        message: story.narrative_text.substring(0, 200) + '...',
        priority: 'high',
        action_url: 'Dashboard'
      });

      return arc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['narrativeArcs']);
      toast.success('New narrative arc generated!');
    }
  });

  const handleGenerate = () => {
    setGenerating(true);
    generateArcMutation.mutate();
    setTimeout(() => setGenerating(false), 5000);
  };

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-purple-400" />
          AI Story Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-400">
          AI analyzes your playstyle, achievements, and decisions to generate personalized narrative experiences.
        </p>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600">Playstyle: {playerData?.playstyle}</Badge>
          <Badge className="bg-green-600">Level: {playerData?.level}</Badge>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Story...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Personal Story Arc
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}