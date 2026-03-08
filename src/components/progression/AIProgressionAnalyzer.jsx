import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, Target, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AILimitBanner, { isAILimitError } from '../shared/AILimitBanner';

function buildFallbackAnalysis(playerData) {
  const skills = playerData.skills || {};
  const maxSkill = Object.entries(skills).sort((a, b) => b[1] - a[1])[0];
  const minSkill = Object.entries(skills).sort((a, b) => a[1] - b[1])[0];
  const playstyle = playerData.playstyle || 'balanced';
  return {
    playstyle_analysis: `${playerData.username} operates as a ${playstyle} criminal, leveraging ${maxSkill ? maxSkill[0] : 'stealth'} as a primary strength. Continued diversification will improve success rates across all mission types.`,
    skill_allocation: {
      recommended_skills: [
        { skill_name: minSkill ? minSkill[0] : 'leadership', points_to_add: 2, reasoning: 'This is your weakest skill — investment here creates the most balanced growth.' },
        { skill_name: 'negotiation', points_to_add: 1, reasoning: 'Higher negotiation unlocks better trade margins and mission rewards.' }
      ]
    },
    investment_advice: [
      { type: 'Criminal Enterprise', amount: Math.floor((playerData.crypto_balance || 10000) * 0.3), reasoning: 'Passive income from enterprises compounds over time and reduces heat exposure.', priority: 'high' },
      { type: 'Crew Expansion', amount: Math.floor((playerData.crypto_balance || 10000) * 0.2), reasoning: 'Larger crews unlock harder missions with better rewards.', priority: 'medium' },
      { type: 'Territory Defense', amount: Math.floor((playerData.crypto_balance || 10000) * 0.1), reasoning: 'Protect existing territory income before expanding.', priority: 'low' }
    ],
    next_objectives: [
      { objective: 'Complete 3 missions this week to build XP momentum', priority: 'high', estimated_reward: 12000 },
      { objective: 'Join or create a crew to unlock crew missions', priority: 'high', estimated_reward: 20000 },
      { objective: 'Capture one territory to begin passive income', priority: 'medium', estimated_reward: 8000 }
    ],
    strengths: ['Active gameplay patterns', `${maxSkill ? maxSkill[0] : 'Combat'} skill development`],
    weaknesses: [`${minSkill ? minSkill[0] : 'Negotiation'} needs investment`, 'Limited territory control']
  };
}

export default function AIProgressionAnalyzer({ playerData }) {
  const queryClient = useQueryClient();

  const [aiLimitHit, setAiLimitHit] = useState(false);

  const analyzeProgressionMutation = useMutation({
    mutationFn: async () => {
      let analysis;
      try {
        const prompt = `Analyze this crime game player and return JSON with: playstyle_analysis (string), skill_allocation.recommended_skills (array of {skill_name, points_to_add, reasoning}), investment_advice (array of {type, amount, reasoning, priority}), next_objectives (array of {objective, priority, estimated_reward}), strengths (array), weaknesses (array).
Player: ${playerData.username}, Level ${playerData.level}, ${playerData.playstyle} playstyle, $${playerData.crypto_balance} balance, ${playerData.stats?.heists_completed || 0} heists, ${playerData.territory_count} territories, skills: ${JSON.stringify(playerData.skills || {})}.`;
        analysis = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              playstyle_analysis: { type: 'string' },
              skill_allocation: { type: 'object', properties: { recommended_skills: { type: 'array', items: { type: 'object', properties: { skill_name: { type: 'string' }, points_to_add: { type: 'number' }, reasoning: { type: 'string' } } } } } },
              investment_advice: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, amount: { type: 'number' }, reasoning: { type: 'string' }, priority: { type: 'string' } } } },
              next_objectives: { type: 'array', items: { type: 'object', properties: { objective: { type: 'string' }, priority: { type: 'string' }, estimated_reward: { type: 'number' } } } },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } }
            }
          }
        });
      } catch (err) {
        if (isAILimitError(err)) {
          setAiLimitHit(true);
          analysis = buildFallbackAnalysis(playerData);
        } else {
          throw err;
        }
      }

      await base44.entities.Player.update(playerData.id, {
        ai_recommendations: { ...analysis, last_updated: new Date().toISOString() }
      });

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
      toast.success('Analysis complete!');
    },
    onError: (err) => toast.error(err.message || 'Analysis failed')
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