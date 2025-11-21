import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, Lock, CheckCircle, Clock, TrendingUp, 
  Shield, Package, Cpu, Loader2, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInHours } from 'date-fns';

const categoryIcons = {
  production_method: TrendingUp,
  item_unlock: Package,
  efficiency: Zap,
  security: Shield,
  automation: Cpu,
  expansion: Sparkles
};

const researchTemplates = {
  marijuana_farm: [
    { name: 'Hydroponic Systems', category: 'production_method', tier: 1, cost: 25000, bonuses: { production_rate_increase: 0.3 } },
    { name: 'Premium Strains', category: 'item_unlock', tier: 1, cost: 30000, bonuses: { revenue_multiplier: 1.2 } },
    { name: 'Climate Control', category: 'efficiency', tier: 2, cost: 50000, bonuses: { production_rate_increase: 0.5 } },
    { name: 'Security Cameras', category: 'security', tier: 1, cost: 20000, bonuses: { heat_reduction: 15 } },
    { name: 'Automated Harvesting', category: 'automation', tier: 3, cost: 75000, bonuses: { production_rate_increase: 0.8 } }
  ],
  chop_shop: [
    { name: 'Advanced Tools', category: 'production_method', tier: 1, cost: 30000, bonuses: { production_rate_increase: 0.4 } },
    { name: 'Exotic Parts Market', category: 'item_unlock', tier: 2, cost: 60000, bonuses: { revenue_multiplier: 1.5 } },
    { name: 'VIN Cloning Tech', category: 'efficiency', tier: 2, cost: 45000, bonuses: { heat_reduction: 20 } },
    { name: 'Police Scanner', category: 'security', tier: 1, cost: 25000, bonuses: { heat_reduction: 10 } }
  ],
  money_laundering: [
    { name: 'Crypto Integration', category: 'production_method', tier: 1, cost: 40000, bonuses: { revenue_multiplier: 1.3 } },
    { name: 'Shell Companies', category: 'efficiency', tier: 2, cost: 70000, bonuses: { heat_reduction: 25 } },
    { name: 'Offshore Accounts', category: 'expansion', tier: 3, cost: 100000, bonuses: { storage_increase: 50000 } }
  ],
  material_production: [
    { name: 'Assembly Line', category: 'automation', tier: 2, cost: 55000, bonuses: { production_rate_increase: 0.6 } },
    { name: 'Quality Materials', category: 'item_unlock', tier: 1, cost: 35000, bonuses: { revenue_multiplier: 1.25 } }
  ],
  weapons_cache: [
    { name: 'Military Contacts', category: 'item_unlock', tier: 2, cost: 80000, bonuses: { revenue_multiplier: 1.6 } },
    { name: 'Hidden Compartments', category: 'security', tier: 1, cost: 30000, bonuses: { heat_reduction: 15 } }
  ]
};

export default function EnterpriseResearchTree({ enterprise, playerData }) {
  const [selectedResearch, setSelectedResearch] = useState(null);
  const queryClient = useQueryClient();

  if (!enterprise || !playerData) {
    return null;
  }

  const { data: research = [] } = useQuery({
    queryKey: ['enterpriseResearch', enterprise.id],
    queryFn: () => base44.entities.EnterpriseResearch.filter({ enterprise_id: enterprise.id }),
    refetchInterval: 30000
  });

  const initializeResearchMutation = useMutation({
    mutationFn: async () => {
      const templates = researchTemplates[enterprise.type] || [];
      const created = [];
      
      for (const template of templates) {
        const existing = research.find(r => r.research_name === template.name);
        if (!existing) {
          const newResearch = await base44.entities.EnterpriseResearch.create({
            enterprise_id: enterprise.id,
            enterprise_type: enterprise.type,
            research_name: template.name,
            research_category: template.category,
            description: `Unlock ${template.name} for enhanced operations`,
            tier: template.tier,
            cost: template.cost,
            research_time_hours: template.tier * 12,
            bonuses: template.bonuses,
            status: template.tier === 1 ? 'available' : 'locked',
            prerequisites: template.tier > 1 ? [] : []
          });
          created.push(newResearch);
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseResearch']);
      toast.success('Research tree initialized');
    }
  });

  const getAIRecommendationMutation = useMutation({
    mutationFn: async () => {
      const worldEvents = await base44.entities.WorldEvent.filter({ status: 'active' }, '-created_date', 5);
      const marketData = await base44.entities.MarketData.list('', 10);

      const prompt = `You are an AI advisor for a criminal enterprise management game.

Enterprise Type: ${enterprise.type}
Current Level: ${enterprise.level}
Production Rate: ${enterprise.production_rate}/hour
Security: ${enterprise.security_level}/5
Heat Level: ${enterprise.heat_level}/100

Available Research:
${research.filter(r => r.status === 'available').map(r => 
  `- ${r.research_name} (${r.research_category}, Tier ${r.tier}, $${r.cost})`
).join('\n')}

Active World Events: ${worldEvents.map(e => e.event_name).join(', ')}
Market Trends: ${marketData.map(m => `${m.item_name}: ${m.trend}`).join(', ')}

Player Stats:
- Balance: $${playerData.crypto_balance}
- Crew Role: ${playerData.crew_role}
- Total Earnings: $${playerData.total_earnings}

Analyze the current game state and recommend the BEST research path. Consider:
1. Current world events (e.g., law crackdown = prioritize security)
2. Market trends (e.g., rising prices = boost production)
3. Enterprise vulnerabilities (high heat = security, low production = efficiency)
4. ROI and strategic value

Provide 3 ranked recommendations with clear reasoning.`;

      return await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  research_name: { type: 'string' },
                  priority: { type: 'string' },
                  reasoning: { type: 'string' },
                  expected_impact: { type: 'string' },
                  roi_estimate: { type: 'string' }
                }
              }
            },
            overall_strategy: { type: 'string' }
          }
        }
      });
    },
    onSuccess: (data) => {
      setSelectedResearch(data);
      toast.success('AI recommendations generated');
    }
  });

  const startResearchMutation = useMutation({
    mutationFn: async (researchId) => {
      const researchItem = research.find(r => r.id === researchId);
      
      if (playerData.crypto_balance < researchItem.cost) {
        throw new Error('Insufficient funds');
      }

      const completionTime = new Date();
      completionTime.setHours(completionTime.getHours() + researchItem.research_time_hours);

      await base44.entities.EnterpriseResearch.update(researchId, {
        status: 'researching',
        started_at: new Date().toISOString()
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - researchItem.cost
      });

      setTimeout(async () => {
        await completeResearch(researchId, researchItem);
      }, 100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseResearch']);
      queryClient.invalidateQueries(['player']);
      toast.success('Research started!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const completeResearch = async (researchId, researchItem) => {
    await base44.entities.EnterpriseResearch.update(researchId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    const updates = {};
    if (researchItem.bonuses.production_rate_increase) {
      updates.production_rate = enterprise.production_rate * (1 + researchItem.bonuses.production_rate_increase);
    }
    if (researchItem.bonuses.storage_increase) {
      updates.storage_capacity = enterprise.storage_capacity + researchItem.bonuses.storage_increase;
    }
    if (researchItem.bonuses.security_increase) {
      updates.security_level = Math.min(5, enterprise.security_level + researchItem.bonuses.security_increase);
    }
    if (researchItem.bonuses.heat_reduction) {
      updates.heat_level = Math.max(0, enterprise.heat_level - researchItem.bonuses.heat_reduction);
    }

    if (Object.keys(updates).length > 0) {
      await base44.entities.CriminalEnterprise.update(enterprise.id, updates);
    }

    const nextTierResearch = research.filter(r => 
      r.tier === researchItem.tier + 1 && r.status === 'locked'
    );
    for (const next of nextTierResearch) {
      await base44.entities.EnterpriseResearch.update(next.id, { status: 'available' });
    }

    queryClient.invalidateQueries(['enterpriseResearch']);
    queryClient.invalidateQueries(['enterprises']);
  };

  if (research.length === 0) {
    return (
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <p className="text-gray-400 mb-4">Initialize research tree for this enterprise</p>
          <Button
            onClick={() => initializeResearchMutation.mutate()}
            disabled={initializeResearchMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-cyan-600"
          >
            {initializeResearchMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Initialize Research
          </Button>
        </CardContent>
      </Card>
    );
  }

  const availableResearch = research.filter(r => r.status === 'available');
  const activeResearch = research.filter(r => r.status === 'researching');
  const completedResearch = research.filter(r => r.status === 'completed');

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Research Tree
            </CardTitle>
            <Button
              size="sm"
              onClick={() => getAIRecommendationMutation.mutate()}
              disabled={getAIRecommendationMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
            >
              {getAIRecommendationMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Recommendations
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/20 text-center">
              <p className="text-sm text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-400">{completedResearch.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/20 text-center">
              <p className="text-sm text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-400">{activeResearch.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/20 text-center">
              <p className="text-sm text-gray-400">Available</p>
              <p className="text-2xl font-bold text-purple-400">{availableResearch.length}</p>
            </div>
          </div>

          {selectedResearch && (
            <div className="mb-4 p-4 rounded-lg bg-slate-900/50 border border-cyan-500/30">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                AI Strategic Analysis
              </h4>
              <p className="text-sm text-gray-400 mb-3">{selectedResearch.overall_strategy}</p>
              <div className="space-y-2">
                {selectedResearch.recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-950/50 border border-purple-500/10">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-white">{rec.research_name}</p>
                      <Badge className="bg-cyan-600">{rec.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-400">{rec.reasoning}</p>
                    <p className="text-xs text-green-400 mt-1">ROI: {rec.roi_estimate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {[...activeResearch, ...availableResearch, ...research.filter(r => r.status === 'locked')].map((item) => {
              const Icon = categoryIcons[item.research_category] || Zap;
              const StatusIcon = item.status === 'completed' ? CheckCircle : 
                               item.status === 'researching' ? Clock : Lock;
              
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${
                    item.status === 'completed' ? 'bg-green-900/10 border-green-500/20' :
                    item.status === 'researching' ? 'bg-blue-900/10 border-blue-500/20' :
                    item.status === 'available' ? 'bg-purple-900/10 border-purple-500/20' :
                    'bg-slate-900/20 border-slate-700/20 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-purple-400 mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{item.research_name}</h4>
                          <Badge variant="outline" className="text-xs">Tier {item.tier}</Badge>
                        </div>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                    </div>
                    <StatusIcon className={`w-5 h-5 ${
                      item.status === 'completed' ? 'text-green-400' :
                      item.status === 'researching' ? 'text-blue-400' :
                      item.status === 'available' ? 'text-purple-400' :
                      'text-gray-600'
                    }`} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="text-gray-400">
                      Cost: <span className="text-cyan-400">${item.cost.toLocaleString()}</span>
                    </div>
                    <div className="text-gray-400">
                      Time: <span className="text-white">{item.research_time_hours}h</span>
                    </div>
                  </div>

                  {item.bonuses && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.bonuses.production_rate_increase && (
                        <Badge variant="outline" className="text-green-400">
                          +{(item.bonuses.production_rate_increase * 100).toFixed(0)}% Production
                        </Badge>
                      )}
                      {item.bonuses.heat_reduction && (
                        <Badge variant="outline" className="text-blue-400">
                          -{item.bonuses.heat_reduction} Heat
                        </Badge>
                      )}
                      {item.bonuses.revenue_multiplier && (
                        <Badge variant="outline" className="text-yellow-400">
                          {item.bonuses.revenue_multiplier}x Revenue
                        </Badge>
                      )}
                    </div>
                  )}

                  {item.status === 'available' && (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
                      onClick={() => startResearchMutation.mutate(item.id)}
                      disabled={startResearchMutation.isPending || playerData.crypto_balance < item.cost}
                    >
                      {startResearchMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : null}
                      Start Research
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}