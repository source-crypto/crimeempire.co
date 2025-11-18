import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, Shield, Zap, Package, ChevronUp, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const upgradeTypes = {
  production: {
    icon: TrendingUp,
    name: 'Production Rate',
    description: 'Increase output per hour',
    color: 'text-green-400'
  },
  storage: {
    icon: Package,
    name: 'Storage Capacity',
    description: 'Store more inventory',
    color: 'text-cyan-400'
  },
  security: {
    icon: Shield,
    name: 'Security Level',
    description: 'Reduce heat generation',
    color: 'text-purple-400'
  },
  efficiency: {
    icon: Zap,
    name: 'Efficiency',
    description: 'Reduce operational costs',
    color: 'text-yellow-400'
  }
};

export default function EnterpriseUpgradePanel({ enterprise, playerData, onUpdate }) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const analyzeEnterpriseMutation = useMutation({
    mutationFn: async () => {
      const prompt = `
You are an AI business advisor for criminal enterprises. Analyze this operation and provide recommendations:

Enterprise Details:
- Name: ${enterprise.name}
- Type: ${enterprise.type}
- Level: ${enterprise.level}
- Production Rate: ${enterprise.production_rate}/hr
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
2. Recommended upgrades (priority order with costs and benefits)
3. Heat management strategy
4. Revenue optimization tips
5. Risk assessment
6. Estimated ROI for each upgrade
7. Next milestone goals
8. Warning signs (if any)

Return JSON format.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            performance_score: { type: 'number' },
            recommended_upgrades: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  upgrade_type: { type: 'string' },
                  priority: { type: 'string' },
                  estimated_cost: { type: 'number' },
                  expected_benefit: { type: 'string' },
                  roi_estimate: { type: 'string' }
                }
              }
            },
            heat_strategy: { type: 'array', items: { type: 'string' } },
            revenue_tips: { type: 'array', items: { type: 'string' } },
            risk_level: { type: 'string' },
            warnings: { type: 'array', items: { type: 'string' } }
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
    mutationFn: async ({ upgradeType, cost }) => {
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient crypto balance');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      const updates = {};
      switch (upgradeType) {
        case 'production':
          updates.production_rate = enterprise.production_rate * 1.25;
          updates.level = enterprise.level + 1;
          break;
        case 'storage':
          updates.storage_capacity = Math.floor(enterprise.storage_capacity * 1.5);
          updates.level = enterprise.level + 1;
          break;
        case 'security':
          updates.security_level = Math.min(10, enterprise.security_level + 1);
          updates.heat_level = Math.max(0, enterprise.heat_level - 10);
          break;
        case 'efficiency':
          updates.level = enterprise.level + 1;
          break;
      }

      await base44.entities.CriminalEnterprise.update(enterprise.id, updates);

      await base44.entities.CrewActivity.create({
        crew_id: enterprise.crew_id,
        activity_type: 'heist_completed',
        title: 'Enterprise Upgraded',
        description: `${enterprise.name} - ${upgradeTypes[upgradeType].name} upgraded`,
        player_id: playerData.id,
        player_username: playerData.username
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterprises']);
      queryClient.invalidateQueries(['player']);
      onUpdate();
      toast.success('Enterprise upgraded successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const calculateUpgradeCost = (type) => {
    const baseCosts = {
      production: 15000,
      storage: 10000,
      security: 12000,
      efficiency: 18000
    };
    return Math.floor(baseCosts[type] * Math.pow(1.5, enterprise.level));
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center justify-between text-white">
            <span>AI Business Analysis</span>
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
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {aiAnalysis ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/30 to-cyan-900/30">
                <p className="text-sm text-gray-400 mb-1">Performance Score</p>
                <p className="text-3xl font-bold text-white mb-2">{aiAnalysis.performance_score}/100</p>
                <Progress value={aiAnalysis.performance_score} className="h-2" />
              </div>

              {aiAnalysis.warnings?.length > 0 && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                  <p className="text-sm font-semibold text-red-400 mb-2">⚠️ Warnings</p>
                  {aiAnalysis.warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm text-gray-300">• {warning}</p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Revenue Tips:</p>
                {aiAnalysis.revenue_tips?.map((tip, idx) => (
                  <p key={idx} className="text-sm text-gray-300">💡 {tip}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Get AI recommendations for optimal management</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">Available Upgrades</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {Object.entries(upgradeTypes).map(([type, config]) => {
            const Icon = config.icon;
            const cost = calculateUpgradeCost(type);
            const canAfford = playerData.crypto_balance >= cost;
            const recommendation = aiAnalysis?.recommended_upgrades?.find(
              u => u.upgrade_type.toLowerCase() === type
            );

            return (
              <div
                key={type}
                className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-900/30">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{config.name}</h4>
                      <p className="text-sm text-gray-400">{config.description}</p>
                    </div>
                  </div>
                  {recommendation && (
                    <Badge className={
                      recommendation.priority === 'high' ? 'bg-red-600' :
                      recommendation.priority === 'medium' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }>
                      {recommendation.priority} priority
                    </Badge>
                  )}
                </div>

                {recommendation && (
                  <div className="mb-2 p-2 rounded bg-cyan-900/20 border border-cyan-500/20">
                    <p className="text-xs text-cyan-300">
                      AI: {recommendation.expected_benefit} (ROI: {recommendation.roi_estimate})
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    Cost: <span className="text-white font-semibold">${cost.toLocaleString()}</span>
                  </span>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => upgradeEnterpriseMutation.mutate({ upgradeType: type, cost })}
                    disabled={!canAfford || upgradeEnterpriseMutation.isPending}
                  >
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Upgrade
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}