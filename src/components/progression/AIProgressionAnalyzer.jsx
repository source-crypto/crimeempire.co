import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, Sparkles, Target, Award, Zap, Shield,
  Eye, Users, Loader2, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const skillIcons = {
  combat: Shield,
  stealth: Eye,
  driving: Zap,
  hacking: Target,
  leadership: Users,
  negotiation: Award
};

export default function AIProgressionAnalyzer({ playerData, onUpdate }) {
  const [analysis, setAnalysis] = useState(null);

  const analyzeProgressionMutation = useMutation({
    mutationFn: async () => {
      const stats = playerData.stats || {};
      const skills = playerData.skills || {};
      
      const prompt = `
You are an AI progression advisor for a crime game. Analyze this player's performance and provide personalized recommendations:

Player Profile:
- Username: ${playerData.username}
- Level: ${playerData.level}
- Strength Score: ${playerData.strength_score}
- Crypto Balance: $${playerData.crypto_balance}
- Buy Power: $${playerData.buy_power}
- Crew Role: ${playerData.crew_role}
- Territories: ${playerData.territory_count}
- Current Playstyle: ${playerData.playstyle || 'unknown'}

Performance Stats:
- Heists Completed: ${stats.heists_completed || 0}
- Heists Failed: ${stats.heists_failed || 0}
- Battles Won: ${stats.battles_won || 0}
- Battles Lost: ${stats.battles_lost || 0}
- Territories Captured: ${stats.territories_captured || 0}
- Total Loot: $${stats.total_loot || 0}

Current Skills (out of 10):
- Combat: ${skills.combat || 0}
- Stealth: ${skills.stealth || 0}
- Driving: ${skills.driving || 0}
- Hacking: ${skills.hacking || 0}
- Leadership: ${skills.leadership || 0}
- Negotiation: ${skills.negotiation || 0}

Available Skill Points: ${playerData.skill_points || 0}

Provide comprehensive analysis:

1. Detected playstyle (aggressive, strategic, stealthy, balanced) - based on their stats
2. Overall performance score (0-100)
3. Skill allocation recommendations (which skills to upgrade and why)
4. Buy power investment suggestions (what to spend money on - enterprises, vehicles, territory upgrades)
5. Recommended crew role progression (should they aim for promotion?)
6. Criminal enterprise recommendations (what type of business suits their playstyle)
7. Strengths (what they're good at)
8. Weaknesses (what needs improvement)
9. Next milestones (specific goals to achieve)
10. Personalized tips (3-5 actionable tips)

Return JSON format.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            detected_playstyle: { type: 'string' },
            performance_score: { type: 'number' },
            skill_recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill_name: { type: 'string' },
                  current_level: { type: 'number' },
                  recommended_points: { type: 'number' },
                  reasoning: { type: 'string' }
                }
              }
            },
            buy_power_investments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  investment_type: { type: 'string' },
                  estimated_cost: { type: 'number' },
                  expected_roi: { type: 'string' },
                  priority: { type: 'string' }
                }
              }
            },
            role_recommendation: {
              type: 'object',
              properties: {
                current_role: { type: 'string' },
                target_role: { type: 'string' },
                readiness: { type: 'string' },
                requirements: { type: 'array', items: { type: 'string' } }
              }
            },
            enterprise_recommendations: {
              type: 'array',
              items: { type: 'string' }
            },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            next_milestones: { type: 'array', items: { type: 'string' } },
            personalized_tips: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      
      // Update player playstyle if changed
      if (data.detected_playstyle !== playerData.playstyle) {
        base44.entities.Player.update(playerData.id, {
          playstyle: data.detected_playstyle
        });
      }
      
      toast.success('AI analysis complete!');
    },
    onError: () => {
      toast.error('Failed to analyze progression');
    }
  });

  const allocateSkillPointMutation = useMutation({
    mutationFn: async (skillName) => {
      if (playerData.skill_points <= 0) {
        throw new Error('No skill points available');
      }

      const currentSkills = playerData.skills || {};
      const currentLevel = currentSkills[skillName] || 0;

      if (currentLevel >= 10) {
        throw new Error('Skill already maxed out');
      }

      await base44.entities.Player.update(playerData.id, {
        skills: {
          ...currentSkills,
          [skillName]: currentLevel + 1
        },
        skill_points: playerData.skill_points - 1
      });

      onUpdate();
    },
    onSuccess: () => {
      toast.success('Skill upgraded!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Progression Advisor
            </span>
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
                  Analyze Performance
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!analysis ? (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Get personalized recommendations from AI</p>
              <p className="text-sm mt-2">Based on your performance and playstyle</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Performance Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/20">
                  <p className="text-sm text-gray-400 mb-1">Performance Score</p>
                  <p className="text-3xl font-bold text-white mb-2">{analysis.performance_score}/100</p>
                  <Progress value={analysis.performance_score} className="h-2" />
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-500/20">
                  <p className="text-sm text-gray-400 mb-1">Detected Playstyle</p>
                  <p className="text-2xl font-bold text-white capitalize">{analysis.detected_playstyle}</p>
                  <Badge className="mt-2 bg-orange-600">
                    AI Classified
                  </Badge>
                </div>
              </div>

              {/* Skill Recommendations */}
              <Card className="glass-panel border-purple-500/20">
                <CardHeader className="border-b border-purple-500/20 p-4">
                  <CardTitle className="text-white text-base flex items-center justify-between">
                    Skill Allocation
                    <Badge className="bg-cyan-600">
                      {playerData.skill_points} points available
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {analysis.skill_recommendations?.map((rec) => {
                    const Icon = skillIcons[rec.skill_name.toLowerCase()] || Target;
                    return (
                      <div key={rec.skill_name} className="p-3 rounded-lg bg-slate-900/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-purple-400" />
                            <span className="font-semibold text-white capitalize">{rec.skill_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {rec.current_level}/10
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => allocateSkillPointMutation.mutate(rec.skill_name.toLowerCase())}
                              disabled={playerData.skill_points <= 0 || allocateSkillPointMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              +{rec.recommended_points}
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">{rec.reasoning}</p>
                        <Progress value={rec.current_level * 10} className="h-1 mt-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Investment Recommendations */}
              <Card className="glass-panel border-purple-500/20">
                <CardHeader className="border-b border-purple-500/20 p-4">
                  <CardTitle className="text-white text-base">Investment Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {analysis.buy_power_investments?.map((inv, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900/30 border border-green-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-semibold text-white">{inv.investment_type}</h5>
                        <Badge className={
                          inv.priority === 'high' ? 'bg-red-600' :
                          inv.priority === 'medium' ? 'bg-yellow-600' :
                          'bg-green-600'
                        }>
                          {inv.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">Cost: ${inv.estimated_cost.toLocaleString()}</p>
                      <p className="text-sm text-green-400">ROI: {inv.expected_roi}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Role Progression */}
              {analysis.role_recommendation && (
                <Card className="glass-panel border-purple-500/20">
                  <CardHeader className="border-b border-purple-500/20 p-4">
                    <CardTitle className="text-white text-base">Career Path</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-gray-600 capitalize">
                        {analysis.role_recommendation.current_role}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <Badge className="bg-purple-600 capitalize">
                        {analysis.role_recommendation.target_role}
                      </Badge>
                      <Badge variant="outline" className="ml-auto">
                        {analysis.role_recommendation.readiness}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400">Requirements:</p>
                      {analysis.role_recommendation.requirements?.map((req, idx) => (
                        <p key={idx} className="text-sm text-white">• {req}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-panel border-green-500/20">
                  <CardHeader className="border-b border-green-500/20 p-4">
                    <CardTitle className="text-white text-base">Strengths</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-1">
                    {analysis.strengths?.map((strength, idx) => (
                      <p key={idx} className="text-sm text-gray-300">✓ {strength}</p>
                    ))}
                  </CardContent>
                </Card>

                <Card className="glass-panel border-red-500/20">
                  <CardHeader className="border-b border-red-500/20 p-4">
                    <CardTitle className="text-white text-base">Areas to Improve</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-1">
                    {analysis.weaknesses?.map((weakness, idx) => (
                      <p key={idx} className="text-sm text-gray-300">→ {weakness}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Tips */}
              <Card className="glass-panel border-cyan-500/20">
                <CardHeader className="border-b border-cyan-500/20 p-4">
                  <CardTitle className="text-white text-base">Personalized Tips</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {analysis.personalized_tips?.map((tip, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/20">
                      <p className="text-sm text-gray-300">{tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}