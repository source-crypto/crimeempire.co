import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users, Target, AlertTriangle, CheckCircle, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function HeistPlanner({ selectedTarget, playerData, crewId, onBack }) {
  const [selectedMembers, setSelectedMembers] = useState([playerData.id]);
  const [heistName, setHeistName] = useState(selectedTarget.target_name);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: () => base44.entities.Player.filter({ crew_id: crewId }),
    enabled: !!crewId
  });

  const getAIRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const prompt = `
You are an AI heist planner. Analyze this heist and provide recommendations:

Heist Details:
- Target: ${selectedTarget.target_name}
- Type: ${selectedTarget.target_type}
- Difficulty: ${selectedTarget.difficulty}
- Estimated Payout: $${selectedTarget.estimated_payout}
- Challenges: ${selectedTarget.challenges.join(', ')}

Crew Members Available (${crewMembers.length}):
${crewMembers.map(m => `- ${m.username}: Level ${m.level}, Strength ${m.strength_score}, Role: ${m.crew_role}`).join('\n')}

Selected Members (${selectedMembers.length}):
${crewMembers.filter(m => selectedMembers.includes(m.id)).map(m => `- ${m.username}: Level ${m.level}, Strength ${m.strength_score}`).join('\n')}

Provide:
1. Overall assessment of the crew composition
2. Recommended roles for each selected member
3. Suggestions for improving success chances
4. Estimated success probability (0-100)
5. Risk mitigation strategies
6. Optimal loot distribution percentages

Return JSON format.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            assessment: { type: 'string' },
            recommended_roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  player_id: { type: 'string' },
                  role: { type: 'string' },
                  reasoning: { type: 'string' }
                }
              }
            },
            suggestions: { type: 'array', items: { type: 'string' } },
            success_probability: { type: 'number' },
            risk_strategies: { type: 'array', items: { type: 'string' } },
            loot_distribution: {
              type: 'object',
              additionalProperties: { type: 'number' }
            }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
      toast.success('AI analysis complete');
    }
  });

  const startHeistMutation = useMutation({
    mutationFn: async () => {
      const participants = crewMembers
        .filter(m => selectedMembers.includes(m.id))
        .map(m => ({
          player_id: m.id,
          username: m.username,
          role: aiAnalysis?.recommended_roles?.find(r => r.player_id === m.id)?.role || 'crew',
          contribution_score: 0
        }));

      const heist = await base44.entities.Heist.create({
        heist_name: heistName,
        target_type: selectedTarget.target_type,
        target_name: selectedTarget.target_name,
        difficulty: selectedTarget.difficulty,
        crew_id: crewId,
        organizer_id: playerData.id,
        participants,
        status: 'planning',
        estimated_payout: selectedTarget.estimated_payout,
        risk_level: selectedTarget.risk_level,
        success_probability: aiAnalysis?.success_probability || selectedTarget.success_probability,
        challenges: selectedTarget.challenges,
        ai_analysis: aiAnalysis
      });

      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'heist_completed',
        title: 'Heist Planned',
        description: `${heistName} - Planning phase initiated`,
        player_id: playerData.id,
        player_username: playerData.username
      });

      return heist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['heists']);
      toast.success('Heist planning initiated!');
      onBack();
    }
  });

  const toggleMember = (memberId) => {
    if (memberId === playerData.id) return; // Can't deselect organizer
    
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Plan Heist</CardTitle>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Heist Name */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Heist Name</label>
            <Input
              value={heistName}
              onChange={(e) => setHeistName(e.target.value)}
              className="bg-slate-900/50 border-purple-500/20 text-white"
            />
          </div>

          {/* Target Summary */}
          <div className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-400" />
              <h4 className="font-semibold text-white">{selectedTarget.target_name}</h4>
            </div>
            <p className="text-sm text-gray-400 mb-2">{selectedTarget.description}</p>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-green-900/30 text-green-400">
                ${selectedTarget.estimated_payout.toLocaleString()}
              </Badge>
              <Badge className="bg-yellow-900/30 text-yellow-400">
                {selectedTarget.success_probability}% success
              </Badge>
              <Badge className="bg-orange-900/30 text-orange-400">
                {selectedTarget.risk_level}% risk
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crew Selection */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-purple-400" />
            Select Crew Members
            <Badge className="ml-auto bg-cyan-600">
              {selectedMembers.length}/{selectedTarget.required_crew_size} required
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {crewMembers.map(member => {
            const isSelected = selectedMembers.includes(member.id);
            const isOrganizer = member.id === playerData.id;

            return (
              <div
                key={member.id}
                className={`p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-purple-900/30 border-purple-500/50'
                    : 'bg-slate-900/30 border-purple-500/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMember(member.id)}
                    disabled={isOrganizer}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-white">{member.username}</h5>
                      {isOrganizer && <Badge className="bg-yellow-600">Organizer</Badge>}
                    </div>
                    <p className="text-sm text-gray-400">
                      Level {member.level} • Strength {member.strength_score}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!aiAnalysis ? (
            <div className="text-center py-8">
              <Button
                className="bg-gradient-to-r from-purple-600 to-cyan-600"
                onClick={() => getAIRecommendationsMutation.mutate()}
                disabled={getAIRecommendationsMutation.isPending || selectedMembers.length < selectedTarget.required_crew_size}
              >
                {getAIRecommendationsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get AI Recommendations
                  </>
                )}
              </Button>
              {selectedMembers.length < selectedTarget.required_crew_size && (
                <p className="text-sm text-gray-400 mt-2">
                  Select at least {selectedTarget.required_crew_size} members
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-900/30">
                <h4 className="font-semibold text-white mb-2">Assessment</h4>
                <p className="text-sm text-gray-300">{aiAnalysis.assessment}</p>
              </div>

              <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h4 className="font-semibold text-white">Success Probability</h4>
                </div>
                <p className="text-3xl font-bold text-green-400">
                  {aiAnalysis.success_probability}%
                </p>
              </div>

              {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-2">Suggestions</h4>
                  <ul className="space-y-1">
                    {aiAnalysis.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={() => startHeistMutation.mutate()}
                disabled={startHeistMutation.isPending}
              >
                {startHeistMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Execute Heist
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}