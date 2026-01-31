import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Zap, TrendingUp, AlertTriangle, Settings, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function AIEmployeeManagement({ enterprise, playerData }) {
  const queryClient = useQueryClient();
  const [aiConfig, setAiConfig] = useState(null);

  const { data: aiManager } = useQuery({
    queryKey: ['aiEmployeeManager', enterprise.id],
    queryFn: async () => {
      const managers = await base44.entities.AIEmployeeManager.filter({ enterprise_id: enterprise.id });
      return managers[0];
    },
    enabled: !!enterprise?.id
  });

  const { data: satisfaction } = useQuery({
    queryKey: ['employeeSatisfaction', enterprise.id],
    queryFn: async () => {
      const emp = await base44.entities.EmployeeSatisfaction.filter({ enterprise_id: enterprise.id });
      return emp[0];
    },
    enabled: !!enterprise?.id
  });

  const generateAIRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const context = {
        enterprise_type: enterprise.type,
        current_morale: satisfaction?.overall_morale || 75,
        current_workforce: aiManager?.current_workforce_size || 10,
        production_rate: enterprise.production_rate,
        labor_cost: aiManager?.total_labor_cost_hourly || 0,
        turnover_risk: satisfaction?.turnover_risk || 10
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI HR manager for a ${context.enterprise_type} criminal enterprise.
        
Current situation:
- Employee morale: ${context.current_morale}%
- Workforce size: ${context.current_workforce}
- Production rate: ${context.production_rate}/hr
- Labor cost: $${context.labor_cost}/hr
- Turnover risk: ${context.turnover_risk}%

Provide strategic HR recommendations to optimize productivity while managing costs and morale.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggested_wage: { type: 'number' },
            suggested_workforce: { type: 'number' },
            training_priority: { type: 'string' },
            morale_actions: { type: 'array', items: { type: 'string' } },
            productivity_forecast: { type: 'number' },
            cost_efficiency_score: { type: 'number' }
          }
        }
      });

      return response;
    },
    onSuccess: async (recommendations) => {
      if (aiManager) {
        await base44.entities.AIEmployeeManager.update(aiManager.id, {
          ai_recommendations: {
            ...recommendations,
            last_updated: new Date().toISOString()
          }
        });
      } else {
        await base44.entities.AIEmployeeManager.create({
          enterprise_id: enterprise.id,
          ai_recommendations: {
            ...recommendations,
            last_updated: new Date().toISOString()
          }
        });
      }
      queryClient.invalidateQueries(['aiEmployeeManager']);
      toast.success('AI recommendations updated');
    }
  });

  const toggleAIMutation = useMutation({
    mutationFn: async (enabled) => {
      if (aiManager) {
        return base44.entities.AIEmployeeManager.update(aiManager.id, {
          ai_enabled: enabled,
          auto_wage_adjustment: enabled,
          auto_training: enabled
        });
      } else {
        return base44.entities.AIEmployeeManager.create({
          enterprise_id: enterprise.id,
          ai_enabled: enabled,
          auto_wage_adjustment: enabled,
          auto_training: enabled,
          management_strategy: 'balanced'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiEmployeeManager']);
      toast.success('AI management settings updated');
    }
  });

  const handleUnionDemandMutation = useMutation({
    mutationFn: async (action) => {
      const cost = action === 'accept' ? 10000 : 5000;
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      const updates = {
        unionization_risk: action === 'accept' ? 0 : Math.max(0, (aiManager.unionization_risk || 0) - 20),
        union_demands: []
      };

      if (action === 'accept') {
        updates.avg_wage_per_employee = (aiManager.avg_wage_per_employee || 500) * 1.2;
      }

      await base44.entities.AIEmployeeManager.update(aiManager.id, updates);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      if (satisfaction) {
        await base44.entities.EmployeeSatisfaction.update(satisfaction.id, {
          overall_morale: Math.min(100, (satisfaction.overall_morale || 75) + 15),
          wage_satisfaction: action === 'accept' ? 90 : (satisfaction.wage_satisfaction || 70)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiEmployeeManager']);
      queryClient.invalidateQueries(['employeeSatisfaction']);
      queryClient.invalidateQueries(['player']);
      toast.success('Union demand handled');
    }
  });

  const unionRisk = aiManager?.unionization_risk || 0;
  const hasUnionDemands = aiManager?.union_demands?.length > 0;

  return (
    <Card className="glass-panel border-blue-500/30">
      <CardHeader className="border-b border-blue-500/20">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            AI Employee Management
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">AI Autopilot</span>
            <Switch
              checked={aiManager?.ai_enabled || false}
              onCheckedChange={(checked) => toggleAIMutation.mutate(checked)}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {hasUnionDemands && (
          <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-500/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">Union Demands</h4>
                <p className="text-sm text-gray-300 mb-3">
                  Workers are demanding better conditions and wages
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUnionDemandMutation.mutate('accept')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accept ($10k)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnionDemandMutation.mutate('negotiate')}
                  >
                    Negotiate ($5k)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <p className="text-xs text-gray-400">Workforce Size</p>
            <p className="text-xl font-bold text-blue-400">
              {aiManager?.current_workforce_size || 10}
            </p>
            {aiManager?.ai_recommendations?.suggested_workforce && (
              <p className="text-xs text-gray-400 mt-1">
                AI suggests: {aiManager.ai_recommendations.suggested_workforce}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
            <p className="text-xs text-gray-400">Avg Wage</p>
            <p className="text-xl font-bold text-green-400">
              ${aiManager?.avg_wage_per_employee || 500}
            </p>
            {aiManager?.ai_recommendations?.suggested_wage && (
              <p className="text-xs text-gray-400 mt-1">
                AI suggests: ${aiManager.ai_recommendations.suggested_wage}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Unionization Risk
            </span>
            <span className={`font-semibold ${unionRisk > 70 ? 'text-red-400' : unionRisk > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
              {unionRisk}%
            </span>
          </div>
          <Progress value={unionRisk} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-gray-400">Productivity</p>
            <p className="text-white font-semibold">
              {aiManager?.performance_metrics?.avg_productivity || 75}%
            </p>
          </div>
          <div>
            <p className="text-gray-400">Turnover</p>
            <p className="text-white font-semibold">
              {aiManager?.performance_metrics?.turnover_rate || 15}%
            </p>
          </div>
          <div>
            <p className="text-gray-400">Training</p>
            <p className="text-white font-semibold">
              {aiManager?.performance_metrics?.training_level || 50}%
            </p>
          </div>
        </div>

        {aiManager?.ai_enabled && aiManager?.ai_recommendations && (
          <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              AI Recommendations
            </h4>
            <div className="space-y-2 text-sm">
              {aiManager.ai_recommendations.morale_actions?.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => generateAIRecommendationsMutation.mutate()}
          disabled={generateAIRecommendationsMutation.isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Zap className="w-4 h-4 mr-2" />
          {generateAIRecommendationsMutation.isPending ? 'Analyzing...' : 'Generate AI Recommendations'}
        </Button>

        <div className="pt-3 border-t border-blue-500/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Labor Cost</span>
            <span className="text-red-400 font-semibold">
              ${(aiManager?.total_labor_cost_hourly || 0).toLocaleString()}/hr
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}