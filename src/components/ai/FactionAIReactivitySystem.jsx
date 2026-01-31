import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Target, TrendingUp, AlertTriangle } from 'lucide-react';

export default function FactionAIReactivitySystem({ factions = [] }) {
  const queryClient = useQueryClient();
  const [expandedFaction, setExpandedFaction] = useState(null);

  const { data: factionAI = [] } = useQuery({
    queryKey: ['factionAIBehavior', factions.map(f => f.id).join(',')],
    queryFn: async () => {
      if (factions.length === 0) return [];
      const aiData = [];
      for (const faction of factions) {
        const ai = await base44.entities.FactionAIBehavior.filter({ faction_id: faction.id });
        if (ai.length === 0) {
          await base44.entities.FactionAIBehavior.create({
            faction_id: faction.id,
            decision_strategy: ['aggressive', 'defensive', 'diplomatic', 'opportunistic'][Math.floor(Math.random() * 4)],
            current_goals: generateGoals(),
            player_assessment: { threat_level: 50, opportunity_level: 50, alliance_potential: 50 },
            resource_allocation: { military: 25, economic: 25, intelligence: 25, diplomacy: 25 },
            recent_actions: []
          });
          aiData.push((await base44.entities.FactionAIBehavior.filter({ faction_id: faction.id }))[0]);
        } else {
          aiData.push(ai[0]);
        }
      }
      return aiData;
    },
    enabled: factions.length > 0
  });

  const evaluatePlayerMutation = useMutation({
    mutationFn: async (factionData) => {
      const threatLevel = Math.min(100, Math.max(0, factionData.player_assessment.threat_level + (Math.random() * 20 - 10)));
      const opportunityLevel = Math.min(100, Math.max(0, factionData.player_assessment.opportunity_level + (Math.random() * 20 - 10)));
      const alliancePotential = Math.min(100, Math.max(0, factionData.player_assessment.alliance_potential + (Math.random() * 15 - 7)));

      let newStrategy = factionData.decision_strategy;
      if (threatLevel > 70) newStrategy = 'aggressive';
      else if (threatLevel > 50) newStrategy = 'defensive';
      else if (opportunityLevel > 70) newStrategy = 'opportunistic';
      else if (alliancePotential > 60) newStrategy = 'diplomatic';

      await base44.entities.FactionAIBehavior.update(factionData.id, {
        player_assessment: {
          threat_level: threatLevel,
          opportunity_level: opportunityLevel,
          alliance_potential: alliancePotential
        },
        decision_strategy: newStrategy,
        last_decision: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['factionAIBehavior']);
    }
  });

  const generateGoals = () => {
    return [
      { goal: 'Expand Territory', priority: 80, progress: Math.random() * 100, deadline: new Date(Date.now() + 604800000).toISOString() },
      { goal: 'Increase Treasury', priority: 70, progress: Math.random() * 100, deadline: new Date(Date.now() + 1209600000).toISOString() },
      { goal: 'Recruit Members', priority: 60, progress: Math.random() * 100, deadline: new Date(Date.now() + 864000000).toISOString() }
    ];
  };

  const strategyColors = {
    aggressive: 'bg-red-600',
    defensive: 'bg-blue-600',
    diplomatic: 'bg-green-600',
    opportunistic: 'bg-yellow-600',
    isolationist: 'bg-purple-600'
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Brain className="w-4 h-4 text-red-400" />
            Faction AI Decision System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {factionAI.map((ai) => {
              const faction = factions.find(f => f.id === ai.faction_id);
              if (!faction) return null;

              const isExpanded = expandedFaction === ai.id;

              return (
                <div
                  key={ai.id}
                  onClick={() => setExpandedFaction(isExpanded ? null : ai.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isExpanded ? 'border-red-500/50 bg-slate-900/50' : 'border-red-500/20 hover:border-red-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-sm">{faction.name}</h4>
                      <p className="text-xs text-gray-400">{faction.faction_type}</p>
                    </div>
                    <Badge className={strategyColors[ai.decision_strategy]}>
                      {ai.decision_strategy}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Threat View</p>
                      <p className={`font-semibold ${ai.player_assessment.threat_level > 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {Math.round(ai.player_assessment.threat_level)}%
                      </p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Opportunity</p>
                      <p className="text-cyan-400 font-semibold">{Math.round(ai.player_assessment.opportunity_level)}%</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Alliance</p>
                      <p className="text-green-400 font-semibold">{Math.round(ai.player_assessment.alliance_potential)}%</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-red-500/20 space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Current Goals:</p>
                        <div className="space-y-1">
                          {ai.current_goals.slice(0, 3).map((goal, idx) => (
                            <div key={idx} className="p-1.5 bg-slate-800/50 rounded text-xs">
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-300">{goal.goal}</span>
                                <span className="text-yellow-400">{Math.round(goal.progress)}%</span>
                              </div>
                              <div className="h-1 bg-slate-700 rounded overflow-hidden">
                                <div className="h-full bg-yellow-600" style={{width: `${goal.progress}%`}} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 mb-1">Resource Allocation:</p>
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          {Object.entries(ai.resource_allocation).map(([key, value]) => (
                            <div key={key} className="p-1 bg-slate-800/50 rounded text-center">
                              <p className="text-gray-300 capitalize">{key}</p>
                              <p className="text-blue-400 font-semibold">{value}%</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => evaluatePlayerMutation.mutate(ai)}
                        className="w-full mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                      >
                        Re-evaluate Strategy
                      </button>
                    </div>
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