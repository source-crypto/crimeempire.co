import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { base44 } from '@/api/base44Client';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, DollarSign, Swords, Target, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function StrategicAdvisor({ playerData }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: adviceList = [] } = useQuery({
    queryKey: ['strategicAdvice', playerData?.id],
    queryFn: async () => {
      const advice = await base44.entities.AIStrategicAdvice.filter({ 
        player_id: playerData.id 
      }, '-created_date', 10);
      return advice;
    },
    enabled: !!playerData?.id
  });

  const generateAdviceMutation = useMutation({
    mutationFn: async (adviceType) => {
      setIsGenerating(true);

      const context = {
        level: playerData.level,
        crypto_balance: playerData.crypto_balance,
        buy_power: playerData.buy_power,
        wanted_level: playerData.wanted_level,
        skills: playerData.skills,
        playstyle: playerData.playstyle
      };

      let prompt = '';
      let title = '';

      switch (adviceType) {
        case 'investment':
          prompt = `You are a criminal financial advisor. Analyze this player profile: ${JSON.stringify(context)}. Provide 3 investment opportunities ranked by risk/reward. Be specific about expected returns and risks.`;
          title = 'Investment Opportunities';
          break;
        case 'combat':
          prompt = `You are a tactical combat advisor. Analyze this player's combat readiness: ${JSON.stringify(context)}. Provide tactical recommendations for upcoming battles based on their skill levels.`;
          title = 'Combat Tactics';
          break;
        case 'heist':
          prompt = `You are a heist planner. Based on this player profile: ${JSON.stringify(context)}, recommend the best heist targets and strategies. Consider their skill set and resources.`;
          title = 'Heist Recommendations';
          break;
        case 'market':
          prompt = `You are a market analyst in the criminal underworld. Analyze this player: ${JSON.stringify(context)}. Identify market trends they should capitalize on and risks to avoid.`;
          title = 'Market Analysis';
          break;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            advice: { type: 'string' },
            recommended_actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  reason: { type: 'string' },
                  expected_outcome: { type: 'string' }
                }
              }
            },
            risk_level: { type: 'number' },
            reward_potential: { type: 'number' },
            confidence: { type: 'number' }
          }
        }
      });

      return await base44.entities.AIStrategicAdvice.create({
        player_id: playerData.id,
        advice_type: adviceType,
        priority: response.risk_level > 70 ? 'high' : 'medium',
        title,
        advice_text: response.advice,
        recommended_actions: response.recommended_actions,
        risk_assessment: {
          risk_level: response.risk_level,
          reward_potential: response.reward_potential,
          confidence: response.confidence
        },
        context_data: context,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['strategicAdvice']);
      setIsGenerating(false);
      toast.success('Strategic advice generated');
    },
    onError: () => {
      setIsGenerating(false);
      toast.error('Failed to generate advice');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (adviceId) => base44.entities.AIStrategicAdvice.update(adviceId, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries(['strategicAdvice'])
  });

  const priorityColors = {
    low: 'bg-blue-600',
    medium: 'bg-yellow-600',
    high: 'bg-orange-600',
    critical: 'bg-red-600'
  };

  const adviceIcons = {
    investment: DollarSign,
    combat: Swords,
    heist: Target,
    market: TrendingUp,
    risk_warning: AlertTriangle
  };

  return (
    <div className="space-y-6">
      {/* Generate Advice */}
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            AI Strategic Advisor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => generateAdviceMutation.mutate('investment')}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Investments
            </Button>
            <Button
              onClick={() => generateAdviceMutation.mutate('combat')}
              disabled={isGenerating}
              className="bg-red-600 hover:bg-red-700"
            >
              <Swords className="w-4 h-4 mr-2" />
              Combat
            </Button>
            <Button
              onClick={() => generateAdviceMutation.mutate('heist')}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Target className="w-4 h-4 mr-2" />
              Heists
            </Button>
            <Button
              onClick={() => generateAdviceMutation.mutate('market')}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Markets
            </Button>
          </div>
          {isGenerating && (
            <div className="mt-4 text-center text-cyan-400 text-sm">
              AI analyzing your situation...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advice List */}
      <div className="space-y-3">
        {adviceList.map((advice) => {
          const Icon = adviceIcons[advice.advice_type] || Lightbulb;
          
          return (
            <Card key={advice.id} className={`glass-panel ${
              advice.is_read ? 'border-purple-500/10' : 'border-cyan-500/30'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{advice.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={priorityColors[advice.priority]}>{advice.priority}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{advice.advice_type}</Badge>
                      </div>
                    </div>
                  </div>
                  {!advice.is_read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsReadMutation.mutate(advice.id)}
                      className="text-cyan-400"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="mb-3 p-3 rounded-lg bg-slate-900/50 text-sm text-gray-300">
                  {advice.advice_text}
                </div>

                {advice.risk_assessment && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-2 rounded bg-red-900/20 border border-red-500/20">
                      <div className="text-xs text-gray-400">Risk</div>
                      <div className="text-sm font-bold text-red-400">{advice.risk_assessment.risk_level}%</div>
                    </div>
                    <div className="text-center p-2 rounded bg-green-900/20 border border-green-500/20">
                      <div className="text-xs text-gray-400">Reward</div>
                      <div className="text-sm font-bold text-green-400">{advice.risk_assessment.reward_potential}%</div>
                    </div>
                    <div className="text-center p-2 rounded bg-blue-900/20 border border-blue-500/20">
                      <div className="text-xs text-gray-400">Confidence</div>
                      <div className="text-sm font-bold text-blue-400">{advice.risk_assessment.confidence}%</div>
                    </div>
                  </div>
                )}

                {advice.recommended_actions && advice.recommended_actions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-400">Recommended Actions:</div>
                    {advice.recommended_actions.map((action, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-900/30 border border-purple-500/10">
                        <div className="text-sm text-white font-semibold">{action.action}</div>
                        <div className="text-xs text-gray-400 mt-1">{action.reason}</div>
                        <div className="text-xs text-green-400 mt-1">→ {action.expected_outcome}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {adviceList.length === 0 && (
          <Card className="glass-panel border-purple-500/20">
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No strategic advice yet. Generate some using the buttons above.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}