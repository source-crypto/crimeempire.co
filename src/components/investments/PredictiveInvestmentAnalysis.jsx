import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function PredictiveInvestmentAnalysis({ playerData }) {
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: predictions = [] } = useQuery({
    queryKey: ['investmentPredictions', playerData?.id],
    queryFn: () => base44.entities.InvestmentPrediction.filter({ 
      player_id: playerData.id 
    }, '-created_date', 10),
    enabled: !!playerData,
    staleTime: 60000
  });

  const { data: macroData = [] } = useQuery({
    queryKey: ['macroData'],
    queryFn: () => base44.entities.MacroEconomicData.list('-updated_date', 5),
    staleTime: 60000
  });

  const generatePredictionsMutation = useMutation({
    mutationFn: async () => {
      const investmentTypes = [
        'crypto_trading', 
        'real_estate', 
        'enterprise_expansion',
        'territory_development',
        'black_market_goods'
      ];

      const macroContext = macroData.map(m => 
        `${m.indicator_name}: ${m.current_value}`
      ).join(', ');

      for (const invType of investmentTypes) {
        const prompt = `
As an AI investment advisor, analyze ${invType} investment opportunity considering:
- Current macro conditions: ${macroContext}
- Player wealth: $${playerData.crypto_balance}
- Risk tolerance: moderate
- Time horizon: medium-term

Provide predicted return, confidence score, risk factors, and recommended allocation.
        `;

        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              predicted_return: { type: "number" },
              confidence_score: { type: "number" },
              risk_factors: { type: "array", items: { type: "string" } },
              recommended_allocation: { type: "number" },
              rate_environment: { type: "string" },
              inflation_outlook: { type: "string" },
              time_horizon: { type: "string" }
            }
          }
        });

        await base44.entities.InvestmentPrediction.create({
          investment_type: invType,
          player_id: playerData.id,
          predicted_return: analysis.predicted_return,
          confidence_score: analysis.confidence_score,
          macro_analysis: {
            rate_environment: analysis.rate_environment,
            inflation_outlook: analysis.inflation_outlook,
            liquidity_conditions: "moderate"
          },
          risk_factors: analysis.risk_factors,
          recommended_allocation: analysis.recommended_allocation,
          time_horizon: analysis.time_horizon,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investmentPredictions']);
      toast.success('AI investment analysis complete');
    }
  });

  const handleAnalyze = () => {
    setAnalyzing(true);
    generatePredictionsMutation.mutate();
    setTimeout(() => setAnalyzing(false), 4000);
  };

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            AI Investment Predictions
          </CardTitle>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${analyzing ? 'animate-pulse' : ''}`} />
            Analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {predictions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-3 text-purple-400 opacity-50" />
            <p>Generate AI predictions to see investment opportunities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {predictions.map((pred) => (
              <div 
                key={pred.id}
                className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-white capitalize">
                      {pred.investment_type.replace(/_/g, ' ')}
                    </h4>
                    <Badge className={
                      pred.predicted_return > 15 ? 'bg-green-600' :
                      pred.predicted_return > 8 ? 'bg-yellow-600' :
                      'bg-orange-600'
                    }>
                      {pred.predicted_return > 0 ? '+' : ''}{pred.predicted_return}% Return
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Confidence</p>
                    <p className="text-lg font-bold text-purple-400">
                      {pred.confidence_score}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">
                      Recommended: ${pred.recommended_allocation?.toLocaleString()}
                    </span>
                  </div>

                  {pred.risk_factors && pred.risk_factors.length > 0 && (
                    <div className="pt-2 border-t border-purple-500/20">
                      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Risk Factors:
                      </p>
                      <div className="space-y-1">
                        {pred.risk_factors.slice(0, 3).map((risk, idx) => (
                          <p key={idx} className="text-xs text-gray-500">• {risk}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {pred.macro_analysis && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-500/20 text-xs">
                      <div>
                        <span className="text-gray-500">Rates:</span>
                        <span className="text-gray-300 ml-1">
                          {pred.macro_analysis.rate_environment}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Inflation:</span>
                        <span className="text-gray-300 ml-1">
                          {pred.macro_analysis.inflation_outlook}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}