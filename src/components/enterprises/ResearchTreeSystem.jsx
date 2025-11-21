import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Beaker, Lock, CheckCircle2, Clock, Loader2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const researchTrees = {
  marijuana_farm: [
    { node: 'hydro_1', name: 'Hydroponics Basic', tier: 1, category: 'production', prerequisites: [], cost: 10000, time: 2, benefits: { production_boost: 0.2 } },
    { node: 'strain_1', name: 'Premium Strains', tier: 1, category: 'production', prerequisites: [], cost: 15000, time: 3, benefits: { new_items: ['premium_weed'] } },
    { node: 'security_1', name: 'Basic Security', tier: 1, category: 'security', prerequisites: [], cost: 8000, time: 1, benefits: { security_bonus: 10 } },
    { node: 'hydro_2', name: 'Advanced Hydroponics', tier: 2, category: 'production', prerequisites: ['hydro_1'], cost: 25000, time: 4, benefits: { production_boost: 0.4 } },
    { node: 'efficiency_1', name: 'Automated Systems', tier: 2, category: 'efficiency', prerequisites: ['hydro_1'], cost: 20000, time: 3, benefits: { efficiency_bonus: 0.25 } },
    { node: 'concentrate_1', name: 'Extract Production', tier: 2, category: 'production', prerequisites: ['strain_1'], cost: 30000, time: 5, benefits: { new_items: ['weed_concentrates'] } },
    { node: 'special_1', name: 'Black Market Network', tier: 3, category: 'special', prerequisites: ['concentrate_1', 'efficiency_1'], cost: 50000, time: 6, benefits: { passive_income: 5000 } }
  ],
  chop_shop: [
    { node: 'dismantle_1', name: 'Fast Dismantling', tier: 1, category: 'efficiency', prerequisites: [], cost: 12000, time: 2, benefits: { efficiency_bonus: 0.3 } },
    { node: 'parts_1', name: 'Premium Parts', tier: 1, category: 'production', prerequisites: [], cost: 15000, time: 3, benefits: { new_items: ['premium_parts'] } },
    { node: 'vin_1', name: 'VIN Cloning', tier: 2, category: 'special', prerequisites: ['dismantle_1'], cost: 25000, time: 4, benefits: { security_bonus: 15 } },
    { node: 'exotic_1', name: 'Exotic Vehicle Line', tier: 2, category: 'production', prerequisites: ['parts_1'], cost: 35000, time: 5, benefits: { production_boost: 0.5 } },
    { node: 'warehouse_1', name: 'Automated Warehouse', tier: 3, category: 'efficiency', prerequisites: ['dismantle_1', 'parts_1'], cost: 45000, time: 6, benefits: { efficiency_bonus: 0.5 } },
    { node: 'network_1', name: 'Syndicate Network', tier: 3, category: 'special', prerequisites: ['exotic_1', 'vin_1'], cost: 60000, time: 8, benefits: { passive_income: 8000 } }
  ],
  money_laundering: [
    { node: 'wash_1', name: 'Basic Washing', tier: 1, category: 'efficiency', prerequisites: [], cost: 10000, time: 2, benefits: { efficiency_bonus: 0.2 } },
    { node: 'crypto_1', name: 'Cryptocurrency', tier: 1, category: 'production', prerequisites: [], cost: 20000, time: 3, benefits: { production_boost: 0.3 } },
    { node: 'offshore_1', name: 'Offshore Accounts', tier: 2, category: 'security', prerequisites: ['wash_1'], cost: 30000, time: 4, benefits: { security_bonus: 20 } },
    { node: 'shell_1', name: 'Shell Corporations', tier: 2, category: 'efficiency', prerequisites: ['wash_1', 'crypto_1'], cost: 40000, time: 5, benefits: { efficiency_bonus: 0.4 } },
    { node: 'network_2', name: 'Banking Network', tier: 3, category: 'special', prerequisites: ['offshore_1', 'shell_1'], cost: 70000, time: 8, benefits: { passive_income: 10000 } }
  ]
};

export default function ResearchTreeSystem({ enterprise, playerData }) {
  const [selectedResearch, setSelectedResearch] = useState(null);
  const queryClient = useQueryClient();

  if (!enterprise || !playerData) {
    return null;
  }

  const availableResearch = researchTrees[enterprise.type] || [];

  const { data: completedResearch = [], isLoading } = useQuery({
    queryKey: ['enterpriseResearch', enterprise.id],
    queryFn: () => base44.entities.EnterpriseResearch.filter({ 
      enterprise_id: enterprise.id, 
      status: 'completed' 
    })
  });

  const { data: activeResearch } = useQuery({
    queryKey: ['activeResearch', enterprise.id],
    queryFn: async () => {
      const research = await base44.entities.EnterpriseResearch.filter({ 
        enterprise_id: enterprise.id, 
        status: 'researching' 
      });
      return research[0] || null;
    }
  });

  const getAISuggestionMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Analyze research options for ${enterprise.name} (${enterprise.type}).

Current Status:
- Level: ${enterprise.level}
- Production: ${enterprise.production_rate}/hr
- Completed Research: ${completedResearch.map(r => r.research_name).join(', ') || 'None'}
- Player Balance: $${playerData.crypto_balance}
- Player Level: ${playerData.level}

Available Research:
${availableResearch.filter(r => !completedResearch.find(cr => cr.research_node === r.node)).map(r => 
  `- ${r.name} (${r.category}, Tier ${r.tier}): $${r.cost}`
).join('\n')}

Recommend the TOP 3 research priorities based on ROI, synergies, and player progression. Explain why each is recommended.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  research_node: { type: "string" },
                  priority: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            overall_strategy: { type: "string" }
          }
        }
      });

      return result;
    },
    onSuccess: (result) => {
      toast.success('AI recommendations generated');
      setSelectedResearch({ type: 'ai', data: result });
    }
  });

  const startResearchMutation = useMutation({
    mutationFn: async (researchNode) => {
      const research = availableResearch.find(r => r.node === researchNode);
      
      if (research.cost > playerData.crypto_balance) {
        throw new Error('Insufficient funds');
      }

      if (activeResearch) {
        throw new Error('Already researching something');
      }

      const prereqsMet = research.prerequisites.every(prereq => 
        completedResearch.find(cr => cr.research_node === prereq)
      );

      if (!prereqsMet) {
        throw new Error('Prerequisites not met');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - research.cost
      });

      const completionTime = new Date();
      completionTime.setHours(completionTime.getHours() + research.time);

      await base44.entities.EnterpriseResearch.create({
        enterprise_id: enterprise.id,
        enterprise_type: enterprise.type,
        research_node: research.node,
        research_name: research.name,
        research_description: `${research.category} research - Tier ${research.tier}`,
        category: research.category,
        tier: research.tier,
        status: 'researching',
        prerequisites: research.prerequisites,
        cost: research.cost,
        research_time: research.time,
        benefits: research.benefits,
        started_at: new Date().toISOString(),
        completed_at: completionTime.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseResearch']);
      queryClient.invalidateQueries(['activeResearch']);
      queryClient.invalidateQueries(['player']);
      toast.success('Research started');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const completeResearchMutation = useMutation({
    mutationFn: async (researchId) => {
      const research = await base44.entities.EnterpriseResearch.filter({ id: researchId });
      const researchData = research[0];

      await base44.entities.EnterpriseResearch.update(researchId, {
        status: 'completed'
      });

      const updates = {};
      if (researchData.benefits.production_boost) {
        updates.production_rate = enterprise.production_rate * (1 + researchData.benefits.production_boost);
      }
      if (researchData.benefits.efficiency_bonus) {
        updates.storage_capacity = enterprise.storage_capacity * (1 + researchData.benefits.efficiency_bonus);
      }
      if (researchData.benefits.security_bonus) {
        updates.security_level = enterprise.security_level + Math.floor(researchData.benefits.security_bonus / 10);
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.CriminalEnterprise.update(enterprise.id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseResearch']);
      queryClient.invalidateQueries(['activeResearch']);
      queryClient.invalidateQueries(['enterprises']);
      toast.success('Research completed!');
    }
  });

  const getResearchStatus = (research) => {
    if (activeResearch?.research_node === research.node) return 'active';
    if (completedResearch.find(cr => cr.research_node === research.node)) return 'completed';
    
    const prereqsMet = research.prerequisites.every(prereq => 
      completedResearch.find(cr => cr.research_node === prereq)
    );
    
    return prereqsMet ? 'available' : 'locked';
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Beaker className="w-5 h-5 text-purple-400" />
              Research Tree
            </CardTitle>
            <Button
              size="sm"
              onClick={() => getAISuggestionMutation.mutate()}
              disabled={getAISuggestionMutation.isPending}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              {getAISuggestionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4 mr-2" />
              )}
              AI Suggestions
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {activeResearch && (
            <div className="mb-4 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
                  <span className="text-white font-semibold">Researching: {activeResearch.research_name}</span>
                </div>
                <Badge className="bg-blue-600">In Progress</Badge>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                Completes: {new Date(activeResearch.completed_at).toLocaleString()}
              </p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => completeResearchMutation.mutate(activeResearch.id)}
              >
                Complete Now (Debug)
              </Button>
            </div>
          )}

          {selectedResearch?.type === 'ai' && (
            <div className="mb-4 p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-cyan-400" />
                AI Recommendations
              </h4>
              <p className="text-sm text-gray-300 mb-3">{selectedResearch.data.overall_strategy}</p>
              <div className="space-y-2">
                {selectedResearch.data.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-900/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-cyan-600">{rec.priority}</Badge>
                      <span className="text-white text-sm font-semibold">
                        {availableResearch.find(r => r.node === rec.research_node)?.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{rec.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-400" />
              <p className="text-gray-400">Loading research tree...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3].map(tier => (
                <div key={tier}>
                  <h4 className="text-sm text-gray-400 uppercase mb-2">Tier {tier}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableResearch.filter(r => r.tier === tier).map((research) => {
                      const status = getResearchStatus(research);
                      const isActive = activeResearch?.research_node === research.node;
                      
                      return (
                        <div
                          key={research.node}
                          className={`p-3 rounded-lg border transition-all ${
                            status === 'completed' ? 'bg-green-900/20 border-green-500/30' :
                            status === 'active' ? 'bg-blue-900/20 border-blue-500/30' :
                            status === 'available' ? 'bg-slate-900/30 border-purple-500/20 hover:border-purple-500/40 cursor-pointer' :
                            'bg-slate-900/20 border-gray-500/20 opacity-50'
                          }`}
                          onClick={() => status === 'available' && !isActive && setSelectedResearch({ type: 'node', data: research })}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                              {status === 'active' && <Clock className="w-4 h-4 text-blue-400" />}
                              {status === 'locked' && <Lock className="w-4 h-4 text-gray-400" />}
                              <h5 className="text-white font-semibold text-sm">{research.name}</h5>
                            </div>
                            <Badge className={`text-xs ${
                              research.category === 'production' ? 'bg-green-600' :
                              research.category === 'efficiency' ? 'bg-blue-600' :
                              research.category === 'security' ? 'bg-orange-600' :
                              'bg-purple-600'
                            }`}>
                              {research.category}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Cost:</span>
                              <span className="text-cyan-400">${research.cost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time:</span>
                              <span className="text-white">{research.time}h</span>
                            </div>
                          </div>

                          {status === 'available' && !isActive && (
                            <Button
                              size="sm"
                              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-cyan-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                startResearchMutation.mutate(research.node);
                              }}
                              disabled={startResearchMutation.isPending || research.cost > playerData.crypto_balance}
                            >
                              <Beaker className="w-3 h-3 mr-1" />
                              Start Research
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}