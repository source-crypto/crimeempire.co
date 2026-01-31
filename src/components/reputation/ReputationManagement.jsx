import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Target, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const reputationActions = [
  {
    id: 'underworld_quest',
    name: 'Underworld Contract',
    type: 'faction_quest',
    target: 'underworld',
    description: 'Complete a criminal favor for underworld bosses',
    cost: 0,
    repChange: 20,
    difficulty: 'medium',
    successRate: 75
  },
  {
    id: 'hacker_heist',
    name: 'Hacker Network Job',
    type: 'faction_quest',
    target: 'hackers',
    description: 'Execute a cyber operation for the network',
    cost: 5000,
    repChange: 25,
    difficulty: 'hard',
    successRate: 60
  },
  {
    id: 'police_intel',
    name: 'Feed Police Intel',
    type: 'intel_sharing',
    target: 'law_enforcement',
    description: 'Provide information to authorities (reduces wanted level)',
    cost: 10000,
    repChange: -50,
    difficulty: 'easy',
    successRate: 90
  },
  {
    id: 'undercover_op',
    name: 'Undercover Operation',
    type: 'undercover_op',
    target: 'government',
    description: 'Infiltrate a government facility for information',
    cost: 15000,
    repChange: 30,
    difficulty: 'extreme',
    successRate: 40
  },
  {
    id: 'street_donation',
    name: 'Street Charity',
    type: 'donation',
    target: 'street',
    description: 'Fund local community projects (build street credibility)',
    cost: 8000,
    repChange: 15,
    difficulty: 'easy',
    successRate: 100
  },
  {
    id: 'corporate_theft',
    name: 'Corporate Sabotage',
    type: 'sabotage',
    target: 'corporate',
    description: 'Steal corporate secrets for rivals',
    cost: 12000,
    repChange: -20,
    difficulty: 'hard',
    successRate: 55
  },
  {
    id: 'scandal_creation',
    name: 'Expose Corruption',
    type: 'scandal_creation',
    target: 'government',
    description: 'Release damaging information to media',
    cost: 20000,
    repChange: 40,
    difficulty: 'extreme',
    successRate: 50
  }
];

export default function ReputationManagement({ playerData }) {
  const queryClient = useQueryClient();
  const [expandedAction, setExpandedAction] = useState(null);

  const { data: playerReputation } = useQuery({
    queryKey: ['playerReputation', playerData?.id],
    queryFn: async () => {
      const reps = await base44.entities.PlayerReputation.filter({ player_id: playerData.id });
      return reps[0] || {};
    },
    enabled: !!playerData?.id
  });

  const { data: activeActions = [] } = useQuery({
    queryKey: ['reputationActions', playerData?.id],
    queryFn: () => base44.entities.ReputationAction.filter({
      player_id: playerData.id,
      status: 'in_progress'
    }),
    enabled: !!playerData?.id
  });

  const executeMutation = useMutation({
    mutationFn: async (action) => {
      if (playerData.crypto_balance < action.cost) {
        throw new Error('Insufficient funds');
      }

      const success = Math.random() * 100 < action.successRate;
      const actualRepChange = success ? action.repChange : Math.floor(action.repChange * 0.3);

      // Create reputation action record
      await base44.entities.ReputationAction.create({
        player_id: playerData.id,
        action_type: action.type,
        target_group: action.target,
        description: action.description,
        cost: action.cost,
        reputation_change: actualRepChange,
        difficulty: action.difficulty,
        success_rate: action.successRate,
        status: success ? 'completed' : 'failed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

      // Update player reputation
      const repKey = {
        'underworld': 'underworld_respect',
        'law_enforcement': 'law_enforcement_heat',
        'street': 'street_credibility',
        'hackers': 'hacker_network_status',
        'corporate': 'corporate_standing',
        'government': 'government_infiltration'
      }[action.target];

      const newValue = Math.max(-100, Math.min(100, (playerReputation[repKey] || 0) + actualRepChange));
      
      await base44.entities.PlayerReputation.update(playerReputation.id, {
        [repKey]: newValue,
        reputation_events: [
          ...(playerReputation.reputation_events || []),
          {
            event_type: action.type,
            group: action.target,
            change: actualRepChange,
            reason: action.description,
            timestamp: new Date().toISOString()
          }
        ]
      });

      // Deduct cost
      if (action.cost > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance - action.cost
        });
      }

      if (!success) {
        toast.warning(`${action.name} partially failed!`);
      } else {
        toast.success(`${action.name} successful! +${actualRepChange} with ${action.target}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerReputation']);
      queryClient.invalidateQueries(['reputationActions']);
      queryClient.invalidateQueries(['player']);
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="space-y-6">
      {/* Active Actions */}
      {activeActions.length > 0 && (
        <Card className="glass-panel border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              ⏳ In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeActions.map((action) => (
                <div key={action.id} className="p-2 bg-slate-900/50 rounded border border-blue-500/20">
                  <p className="text-sm text-white font-semibold">{action.description}</p>
                  <Progress value={50} className="h-1 mt-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Actions */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="w-5 h-5 text-purple-400" />
            Reputation Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reputationActions.map((action) => {
              const canAfford = playerData.crypto_balance >= action.cost;
              const isExpanded = expandedAction === action.id;

              return (
                <div
                  key={action.id}
                  onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isExpanded
                      ? 'border-purple-500/50 bg-slate-900/50'
                      : 'border-purple-500/20 bg-slate-900/30 hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-sm">{action.name}</h4>
                      <p className="text-xs text-gray-400">{action.description}</p>
                    </div>
                    <Badge className={
                      action.difficulty === 'easy' ? 'bg-green-600' :
                      action.difficulty === 'medium' ? 'bg-yellow-600' :
                      action.difficulty === 'hard' ? 'bg-orange-600' : 'bg-red-600'
                    }>
                      {action.difficulty}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Cost</p>
                      <p className="text-cyan-400 font-semibold">${action.cost}</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Rep Change</p>
                      <p className={`font-semibold ${action.repChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {action.repChange > 0 ? '+' : ''}{action.repChange}
                      </p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Success</p>
                      <p className="text-purple-400 font-semibold">{action.successRate}%</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Target</p>
                      <p className="text-blue-400 font-semibold capitalize text-[10px]">{action.target}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                      <Button
                        size="sm"
                        onClick={() => executeMutation.mutate(action)}
                        disabled={!canAfford || executeMutation.isPending}
                        className="w-full bg-purple-600 hover:bg-purple-700 h-8 text-xs"
                      >
                        {canAfford ? (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            Execute Action
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Insufficient Funds
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">💡 Reputation Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-gray-400">
          <p>• Reputation ranges from -100 (enemy) to +100 (ally)</p>
          <p>• High reputation unlocks exclusive missions and goods</p>
          <p>• Law enforcement heat affects prices and risks</p>
          <p>• Failed actions result in reduced reputation gain</p>
          <p>• Different factions have competing interests</p>
        </CardContent>
      </Card>
    </div>
  );
}