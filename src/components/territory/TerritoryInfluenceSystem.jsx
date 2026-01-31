import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, TrendingUp, Gift, Lightbulb, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const influenceActions = [
  {
    type: 'economic_sabotage',
    name: 'Economic Sabotage',
    icon: TrendingDown,
    description: 'Disrupt supply chains and trade routes',
    cost: 5000,
    influence: 20,
    duration: 48,
    color: 'red'
  },
  {
    type: 'political_campaign',
    name: 'Political Campaign',
    icon: Lightbulb,
    description: 'Influence local politicians and officials',
    cost: 8000,
    influence: 25,
    duration: 72,
    color: 'blue'
  },
  {
    type: 'diplomatic_gift',
    name: 'Diplomatic Gift',
    icon: Gift,
    description: 'Offer gifts to local power brokers',
    cost: 3000,
    influence: 15,
    duration: 24,
    color: 'purple'
  },
  {
    type: 'cultural_influence',
    name: 'Cultural Influence',
    icon: Zap,
    description: 'Sponsor local events and organizations',
    cost: 4000,
    influence: 18,
    duration: 60,
    color: 'cyan'
  },
  {
    type: 'economic_investment',
    name: 'Economic Investment',
    icon: TrendingUp,
    description: 'Invest in local businesses',
    cost: 10000,
    influence: 30,
    duration: 96,
    color: 'green'
  }
];

export default function TerritoryInfluenceSystem({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const { data: activeInfluenceActions = [] } = useQuery({
    queryKey: ['influenceActions', playerData?.id],
    queryFn: () => base44.entities.TerritoryInfluenceAction.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id,
    refetchInterval: 10000
  });

  const executeActionMutation = useMutation({
    mutationFn: async (action) => {
      if (!playerData || playerData.crypto_balance < action.cost) {
        throw new Error('Insufficient funds');
      }

      const successChance = Math.random() * 100;
      const actionConfig = influenceActions.find(a => a.type === action.type);

      await base44.entities.TerritoryInfluenceAction.create({
        territory_id: selectedTerritory,
        player_id: playerData.id,
        action_type: action.type,
        cost: action.cost,
        influence_gained: actionConfig.influence,
        duration_hours: actionConfig.duration,
        success_rate: successChance > 25 ? 75 : 50,
        status: 'active',
        started_at: new Date().toISOString()
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - action.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['influenceActions']);
      queryClient.invalidateQueries(['player']);
      toast.success('Influence action started!');
      setSelectedAction(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const totalInfluenceGained = activeInfluenceActions.reduce((sum, action) => sum + (action.influence_gained || 0), 0);

  return (
    <div className="space-y-6">
      {/* Influence Summary */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span>Territory Influence Network</span>
            <Badge className="bg-purple-600">Level {Math.floor(totalInfluenceGained / 100)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Active Campaigns</p>
              <p className="text-lg font-bold text-cyan-400">{activeInfluenceActions.length}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Total Influence</p>
              <p className="text-lg font-bold text-purple-400">{totalInfluenceGained}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Territories Affected</p>
              <p className="text-lg font-bold text-green-400">{new Set(activeInfluenceActions.map(a => a.territory_id)).size}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Territory Selection */}
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Select Territory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {territories.map((territory) => {
              const activeOnTerritory = activeInfluenceActions.filter(a => a.territory_id === territory.id);
              const isSelected = selectedTerritory === territory.id;

              return (
                <div
                  key={territory.id}
                  onClick={() => setSelectedTerritory(isSelected ? null : territory.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-900/30 border-cyan-500/50'
                      : 'bg-slate-900/30 border-cyan-500/20 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-semibold">{territory.name}</h4>
                    {activeOnTerritory.length > 0 && (
                      <Badge className="bg-purple-600">{activeOnTerritory.length}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Owner: <span className="text-cyan-400">{territory.owner_faction_id || 'Neutral'}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Influence Actions */}
      {selectedTerritory && (
        <Card className="glass-panel border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white">Influence Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {influenceActions.map((action) => {
                const Icon = action.icon;
                const canAfford = playerData && playerData.crypto_balance >= action.cost;

                return (
                  <div
                    key={action.type}
                    onClick={() => setSelectedAction(selectedAction === action.type ? null : action.type)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedAction === action.type
                        ? 'bg-slate-900/50 border-green-500/50'
                        : 'bg-slate-900/30 border-green-500/20 hover:border-green-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-green-400" />
                        <div>
                          <h4 className="text-white font-semibold">{action.name}</h4>
                          <p className="text-xs text-gray-400">{action.description}</p>
                        </div>
                      </div>
                      <Badge className={`bg-${action.color}-600`}>+{action.influence}</Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Cost</p>
                        <p className="text-cyan-400 font-semibold">${action.cost}</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Duration</p>
                        <p className="text-purple-400 font-semibold">{action.duration}h</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Success</p>
                        <p className="text-green-400 font-semibold">75%</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Status</p>
                        <p className={`font-semibold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                          {canAfford ? 'Ready' : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {selectedAction === action.type && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeActionMutation.mutate(action);
                        }}
                        disabled={!canAfford || executeActionMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-sm h-9"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Execute Action
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Influence Campaigns */}
      {activeInfluenceActions.length > 0 && (
        <Card className="glass-panel border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-white">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeInfluenceActions.map((action) => {
              const territory = territories.find(t => t.id === action.territory_id);
              const actionConfig = influenceActions.find(a => a.type === action.action_type);
              const progressPercent = Math.min(100, (action.current_progress || 0));

              return (
                <div key={action.id} className="p-3 bg-slate-900/50 rounded-lg border border-yellow-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold">{actionConfig?.name} - {territory?.name}</h4>
                      <p className="text-xs text-gray-400">+{action.influence_gained} influence</p>
                    </div>
                    <Badge className="bg-yellow-600">{action.status}</Badge>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}