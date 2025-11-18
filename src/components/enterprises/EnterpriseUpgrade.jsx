import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, Shield, Package, Zap, Lock, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const upgradeTypes = {
  production: {
    icon: TrendingUp,
    label: 'Production Rate',
    description: 'Increase output per hour',
    color: 'from-green-600 to-emerald-600'
  },
  storage: {
    icon: Package,
    label: 'Storage Capacity',
    description: 'Store more inventory',
    color: 'from-blue-600 to-cyan-600'
  },
  security: {
    icon: Shield,
    label: 'Security Level',
    description: 'Reduce heat and raid risk',
    color: 'from-purple-600 to-pink-600'
  },
  efficiency: {
    icon: Zap,
    label: 'Efficiency',
    description: 'Lower costs, higher margins',
    color: 'from-yellow-600 to-orange-600'
  }
};

export default function EnterpriseUpgrade({ enterprise, playerData, onUpdate }) {
  const queryClient = useQueryClient();
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const analyzeEnterpriseMutation = useMutation({
    mutationFn: async () => {
      const prompt = `
You are an AI business consultant for a criminal enterprise. Analyze this operation and provide recommendations:

Enterprise Details:
- Name: ${enterprise.name}
- Type: ${enterprise.type}
- Level: ${enterprise.level}
- Production Rate: ${enterprise.production_rate}/hour
- Storage Capacity: ${enterprise.storage_capacity}
- Current Stock: ${enterprise.current_stock}
- Security Level: ${enterprise.security_level}
- Heat Level: ${enterprise.heat_level}%
- Total Revenue: $${enterprise.total_revenue}
- Active: ${enterprise.is_active}

Player Resources:
- Crypto Balance: $${playerData.crypto_balance}
- Buy Power: $${playerData.buy_power}

Provide comprehensive analysis:
1. Performance score (0-100)
2. Priority upgrades (which stat to upgrade first and why)
3. Optimal upgrade path (sequence of upgrades)
4. Heat management strategy
5. Revenue optimization tips
6. Risk assessment
7. ROI projections for each upgrade type
8. Recommended next steps

Return JSON format.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            performance_score: { type: 'number' },
            priority_upgrades: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  upgrade_type: { type: 'string' },
                  priority: { type: 'string' },
                  reasoning: { type: 'string' },
                  estimated_cost: { type: 'number' },
                  expected_benefit: { type: 'string' }
                }
              }
            },
            upgrade_path: { type: 'array', items: { type: 'string' } },
            heat_management: { type: 'array', items: { type: 'string' } },
            revenue_tips: { type: 'array', items: { type: 'string' } },
            risk_level: { type: 'string' },
            roi_projections: { type: 'object' },
            next_steps: { type: 'array', items: { type: 'string' } }
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

  const upgradeEnterpriseMutation = useMutation({
    mutationFn: async (upgradeType) => {
      const baseCost = enterprise.level * 5000;
      let upgradeCost = baseCost;
      let updateData = {};

      switch(upgradeType) {
        case 'production':
          upgradeCost = baseCost * 1.5;
          updateData = {
            production_rate: enterprise.production_rate * 1.25,
            level: enterprise.level + 1
          };
          break;
        case 'storage':
          upgradeCost = baseCost;
          updateData = {
            storage_capacity: enterprise.storage_capacity * 1.5,
            level: enterprise.level + 1
          };
          break;
        case 'security':
          upgradeCost = baseCost * 1.3;
          updateData = {
            security_level: Math.min(10, enterprise.security_level + 1),
            heat_level: Math.max(0, enterprise.heat_level - 10),
            level: enterprise.level + 1
          };
          break;
        case 'efficiency':
          upgradeCost = baseCost * 1.2;
          updateData = {
            production_rate: enterprise.production_rate * 1.15,
            level: enterprise.level + 1
          };
          break;
      }

      if (playerData.crypto_balance < upgradeCost) {
        throw new Error('Insufficient funds');
      }

      // Deduct cost
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - upgradeCost
      });

      // Upgrade enterprise
      await base44.entities.CriminalEnterprise.update(enterprise.id, updateData);

      return { upgradeType, cost: upgradeCost };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['enterprises']);
      queryClient.invalidateQueries(['currentPlayer']);
      toast.success(`${data.upgradeType} upgraded for $${data.cost.toLocaleString()}`);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-4">
      {/* AI Analysis */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Business Analysis
            </span>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => analyzeEnterpriseMutation.mutate()}
              disabled={analyzeEnterpriseMutation.isPending}
            >
              {analyzeEnterpriseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!aiAnalysis ? (
            <div className="text-center py-8 text-gray-400">
              <p>Get AI-powered recommendations for your enterprise</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Performance Score */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/30 to-cyan-900/30">
                <p className="text-sm text-gray-400 mb-2">Performance Score</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white">{aiAnalysis.performance_score}/100</div>
                  <Progress value={aiAnalysis.performance_score} className="flex-1 h-2" />
                </div>
              </div>

              {/* Priority Upgrades */}
              <div>
                <h4 className="font-semibold text-white mb-3">Recommended Upgrades</h4>
                <div className="space-y-2">
                  {aiAnalysis.priority_upgrades?.map((upgrade, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-white capitalize">{upgrade.upgrade_type}</span>
                          <Badge className={`ml-2 ${
                            upgrade.priority === 'high' ? 'bg-red-600' :
                            upgrade.priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                          }`}>
                            {upgrade.priority} priority
                          </Badge>
                        </div>
                        <span className="text-green-400">${upgrade.estimated_cost.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{upgrade.reasoning}</p>
                      <p className="text-sm text-cyan-400">ROI: {upgrade.expected_benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/20">
                  <h5 className="font-semibold text-white mb-2 text-sm">Heat Management</h5>
                  <ul className="space-y-1">
                    {aiAnalysis.heat_management?.slice(0, 3).map((tip, idx) => (
                      <li key={idx} className="text-xs text-gray-300">• {tip}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/20">
                  <h5 className="font-semibold text-white mb-2 text-sm">Revenue Tips</h5>
                  <ul className="space-y-1">
                    {aiAnalysis.revenue_tips?.slice(0, 3).map((tip, idx) => (
                      <li key={idx} className="text-xs text-gray-300">• {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">Upgrade Enterprise</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(upgradeTypes).map(([type, config]) => {
              const Icon = config.icon;
              const cost = enterprise.level * 5000 * (type === 'production' ? 1.5 : type === 'security' ? 1.3 : type === 'efficiency' ? 1.2 : 1);
              
              return (
                <div key={type} className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-white text-sm">{config.label}</h5>
                      <p className="text-xs text-gray-400">{config.description}</p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Current Level</span>
                      <span>{enterprise.level}</span>
                    </div>
                    <Progress value={(enterprise.level / 10) * 100} className="h-1" />
                  </div>

                  <Button
                    size="sm"
                    className={`w-full bg-gradient-to-r ${config.color}`}
                    onClick={() => upgradeEnterpriseMutation.mutate(type)}
                    disabled={upgradeEnterpriseMutation.isPending || playerData.crypto_balance < cost}
                  >
                    Upgrade - ${cost.toLocaleString()}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}