import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Target, AlertTriangle, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedFactionAI({ playerData }) {
  const queryClient = useQueryClient();

  const { data: factions = [] } = useQuery({
    queryKey: ['rivalFactions'],
    queryFn: () => base44.entities.RivalFaction.filter({ is_active: true })
  });

  const { data: factionActivities = [] } = useQuery({
    queryKey: ['factionActivities'],
    queryFn: () => base44.entities.FactionActivity.list('-created_date', 20),
    refetchInterval: 15000
  });

  const { data: playerInvestments = [] } = useQuery({
    queryKey: ['playerInvestments', playerData?.id],
    queryFn: () => base44.entities.PlayerInvestment.filter({ 
      player_id: playerData.id,
      status: 'active'
    }),
    enabled: !!playerData
  });

  const { data: supplyLines = [] } = useQuery({
    queryKey: ['supplyLines', playerData?.crew_id],
    queryFn: () => base44.entities.SupplyLine.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id
  });

  const simulateFactionAIMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Simulate strategic faction AI behavior.

Factions:
${factions.slice(0, 5).map(f => `- ${f.name} (${f.faction_type}): Power ${f.power_level}, Aggression ${f.aggression}, Strategy: ${f.strategy}`).join('\n')}

Player State:
- Active Investments: ${playerInvestments.length}
- Supply Lines: ${supplyLines.length}
- Crew: ${playerData.crew_id ? 'Yes' : 'No'}

For EACH faction, generate strategic action:
1. Analyze player weaknesses
2. Choose activity type (supply disruption, alliance, embargo, counter-investment, etc.)
3. Select target
4. Calculate success probability
5. Define counter-strategy reasoning
6. Assess risk and impact

Make factions SMART and REACTIVE to player actions.`;

      const strategies = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            faction_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  faction_name: { type: "string" },
                  activity_type: { type: "string" },
                  target_type: { type: "string" },
                  target_name: { type: "string" },
                  motivation: { type: "string" },
                  expected_outcome: { type: "string" },
                  counter_strategy: { type: "string" },
                  success_probability: { type: "number" },
                  economic_damage: { type: "number" },
                  diplomatic_shift: { type: "number" }
                }
              }
            }
          }
        }
      });

      const activities = [];
      for (const action of strategies.faction_actions) {
        const activity = await base44.entities.FactionActivity.create({
          faction_name: action.faction_name,
          activity_type: action.activity_type,
          target_type: action.target_type,
          target_name: action.target_name,
          ai_strategy: {
            motivation: action.motivation,
            expected_outcome: action.expected_outcome,
            counter_to_player_action: action.counter_strategy,
            risk_assessment: 100 - action.success_probability
          },
          success_probability: action.success_probability,
          impact_metrics: {
            economic_damage: action.economic_damage,
            diplomatic_shift: action.diplomatic_shift,
            market_disruption: Math.random() * 50
          },
          status: 'executing',
          player_awareness: Math.random() > 0.5
        });
        activities.push(activity);
      }

      // Execute supply disruptions
      if (supplyLines.length > 0) {
        const disruptionActions = activities.filter(a => a.activity_type === 'supply_disruption');
        for (const disruption of disruptionActions) {
          const targetLine = supplyLines[Math.floor(Math.random() * supplyLines.length)];
          if (targetLine) {
            await base44.entities.SupplyLine.update(targetLine.id, {
              risk_score: Math.min(100, (targetLine.risk_score || 50) + 25),
              success_rate: Math.max(0, (targetLine.success_rate || 100) - 15)
            });
          }
        }
      }

      return activities;
    },
    onSuccess: (activities) => {
      queryClient.invalidateQueries(['factionActivities']);
      queryClient.invalidateQueries(['supplyLines']);
      toast.success(`${activities.length} faction strategies executed`);
    }
  });

  if (!playerData) return null;

  return (
    <Card className="glass-panel border-red-500/20">
      <CardHeader className="border-b border-red-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Faction AI Strategic Behavior
            <Badge className="ml-2 bg-red-600">{factionActivities.length} Active</Badge>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => simulateFactionAIMutation.mutate()}
            disabled={simulateFactionAIMutation.isPending}
            className="bg-gradient-to-r from-red-600 to-orange-600"
          >
            {simulateFactionAIMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /></>
            ) : (
              <>🧠 Simulate AI</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {factionActivities.map((activity) => (
            <div key={activity.id} className="p-3 rounded-lg bg-slate-900/30 border border-red-500/10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-semibold text-sm">{activity.faction_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{activity.activity_type.replace('_', ' ')}</p>
                </div>
                <Badge className={
                  activity.status === 'executing' ? 'bg-orange-600' :
                  activity.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'
                }>
                  {activity.status}
                </Badge>
              </div>

              {activity.ai_strategy && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-red-900/20 border border-red-500/20">
                    <p className="text-xs text-red-400 font-semibold">🎯 Target:</p>
                    <p className="text-xs text-gray-300">{activity.target_name} ({activity.target_type})</p>
                  </div>
                  
                  <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                    <p className="text-xs text-blue-400 font-semibold">Motivation:</p>
                    <p className="text-xs text-gray-300">{activity.ai_strategy.motivation}</p>
                  </div>

                  {activity.ai_strategy.counter_to_player_action && (
                    <div className="p-2 rounded bg-orange-900/20 border border-orange-500/20">
                      <p className="text-xs text-orange-400 font-semibold">Counter-Strategy:</p>
                      <p className="text-xs text-gray-300">{activity.ai_strategy.counter_to_player_action}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs">
                    <Target className="w-3 h-3 text-green-400" />
                    <span className="text-gray-400">Success: {activity.success_probability}%</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}