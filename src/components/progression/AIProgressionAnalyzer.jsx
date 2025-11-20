import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, Target, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIProgressionAnalyzer({ playerData }) {
  const queryClient = useQueryClient();

  const analyzeProgressionMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze this player's performance and provide personalized recommendations:

**Player Profile:**
- Username: ${playerData.username}
- Level: ${playerData.level}
- Playstyle: ${playerData.playstyle}
- Total Earnings: $${playerData.total_earnings}

**Skills:**
${Object.entries(playerData.skills || {}).map(([skill, points]) => `- ${skill}: ${points}`).join('\n')}

**Statistics:**
- Heists: ${playerData.stats?.heists_completed || 0} completed, ${playerData.stats?.heists_failed || 0} failed
- Battles: ${playerData.stats?.battles_won || 0} won, ${playerData.stats?.battles_lost || 0} lost
- Territories: ${playerData.territory_count}
- Contracts: ${playerData.stats?.contracts_completed || 0}
- Trades: ${playerData.stats?.items_traded || 0}

**Available Resources:**
- Crypto: $${playerData.crypto_balance}
- Buy Power: $${playerData.buy_power}
- Skill Points: ${playerData.skill_points}

Provide analysis with:
1. Playstyle analysis (2-3 sentences about their play patterns)
2. Skill allocation recommendations (which skills to upgrade and why)
3. Investment advice (3 specific recommendations with reasoning)
4. Next objectives (3 clear action items to progress)
5. Strengths and weaknesses

Return detailed JSON.`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            playstyle_analysis: { type: 'string' },
            skill_allocation: {
              type: 'object',
              properties: {
                recommended_skills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      skill_name: { type: 'string' },
                      points_to_add: { type: 'number' },
                      reasoning: { type: 'string' }
                    }
                  }
                }
              }
            },
            investment_advice: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  amount: { type: 'number' },
                  reasoning: { type: 'string' },
                  priority: { type: 'string' }
                }
              }
            },
            next_objectives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  objective: { type: 'string' },
                  priority: { type: 'string' },
                  estimated_reward: { type: 'number' }
                }
              }
            },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      await base44.entities.Player.update(playerData.id, {
        ai_recommendations: {
          ...analysis,
          last_updated: new Date().toISOString()
        }
      });

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
      toast.success('AI analysis complete!');
    }
  });

  const recommendations = playerData.ai_recommendations;

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Progression Advisor
          </CardTitle>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-cyan-600"
            onClick={() => analyzeProgressionMutation.mutate()}
            disabled={analyzeProgressionMutation.isPending}
          >
            {analyzeProgressionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!recommendations ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">Click "Analyze" to get personalized AI recommendations</p>
          </div>
        ) : (
          <>
            {/* Playstyle Analysis */}
            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Playstyle Analysis
              </h4>
              <p className="text-sm text-gray-300">{recommendations.playstyle_analysis}</p>
            </div>

            {/* Skill Recommendations */}
            {recommendations.skill_allocation?.recommended_skills?.length > 0 && (
              <div>
                <h4 className="font-semibold text-white mb-2">Recommended Skills</h4>
                <div className="space-y-2">
                  {recommendations.skill_allocation.recommended_skills.map((skill, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-900/30 border border-purple-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white capitalize">
                          {skill.skill_name}
                        </span>
                        <Badge className="bg-purple-600">+{skill.points_to_add} points</Badge>
                      </div>
                      <p className="text-xs text-gray-400">{skill.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investment Advice */}
            {recommendations.investment_advice?.length > 0 && (
              <div>
                <h4 className="font-semibold text-white mb-2">Investment Opportunities</h4>
                <div className="space-y-2">
                  {recommendations.investment_advice.map((advice, idx) => (
                    <div key={idx} className="p-2 rounded bg-green-900/20 border border-green-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{advice.type}</span>
                        <Badge className={
                          advice.priority === 'high' ? 'bg-red-600' : 
                          advice.priority === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                        }>
                          {advice.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-green-300 mb-1">
                        Recommended: ${advice.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{advice.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Objectives */}
            {recommendations.next_objectives?.length > 0 && (
              <div>
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Recommended Actions
                </h4>
                <div className="space-y-2">
                  {recommendations.next_objectives.map((obj, idx) => (
                    <div key={idx} className="p-2 rounded bg-cyan-900/20 border border-cyan-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">{obj.objective}</span>
                        <span className="text-xs text-cyan-400">
                          +${obj.estimated_reward?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-3">
              {recommendations.strengths?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-green-400 mb-1">Strengths</h4>
                  {recommendations.strengths.map((strength, idx) => (
                    <p key={idx} className="text-xs text-gray-300">• {strength}</p>
                  ))}
                </div>
              )}
              {recommendations.weaknesses?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-400 mb-1">Weaknesses</h4>
                  {recommendations.weaknesses.map((weakness, idx) => (
                    <p key={idx} className="text-xs text-gray-300">• {weakness}</p>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}