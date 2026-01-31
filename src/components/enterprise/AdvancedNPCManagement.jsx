import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, TrendingUp, Heart, Lock } from 'lucide-react';
import { toast } from 'sonner';

const trainingPrograms = [
  { id: 'leadership', name: 'Leadership Training', cost: 2000, skillGain: 1, moraleCost: 5 },
  { id: 'efficiency', name: 'Efficiency Course', cost: 1500, skillGain: 2, moraleCost: 3 },
  { id: 'loyalty', name: 'Loyalty Program', cost: 3000, skillGain: 0, moraleCost: 15 },
  { id: 'specialization', name: 'Specialization', cost: 4000, skillGain: 3, moraleCost: 10 }
];

export default function AdvancedNPCManagement({ enterpriseData, playerData }) {
  const queryClient = useQueryClient();
  const [expandedNPC, setExpandedNPC] = useState(null);

  const { data: enterpriseNPCs = [] } = useQuery({
    queryKey: ['enterpriseNPCs', enterpriseData?.id],
    queryFn: () => base44.entities.EnterpriseNPC.filter({ enterprise_id: enterpriseData.id }),
    enabled: !!enterpriseData?.id
  });

  const trainMutation = useMutation({
    mutationFn: async ({ npcId, trainingId }) => {
      const training = trainingPrograms.find(t => t.id === trainingId);
      const npc = enterpriseNPCs.find(n => n.id === npcId);

      if (playerData.crypto_balance < training.cost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.EnterpriseNPC.update(npcId, {
        skill_level: Math.min(10, npc.skill_level + training.skillGain),
        morale: Math.max(0, npc.morale - training.moraleCost)
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - training.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseNPCs']);
      queryClient.invalidateQueries(['player']);
      toast.success('Training completed!');
    },
    onError: (error) => toast.error(error.message)
  });

  const raiseWageMutation = useMutation({
    mutationFn: async (npcId) => {
      const npc = enterpriseNPCs.find(n => n.id === npcId);
      const newWage = npc.salary_cost_hourly * 1.15;

      if (playerData.crypto_balance < 5000) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.EnterpriseNPC.update(npcId, {
        salary_cost_hourly: newWage,
        loyalty: Math.min(100, npc.loyalty + 20),
        morale: Math.min(100, npc.morale + 15)
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - 5000
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseNPCs']);
      queryClient.invalidateQueries(['player']);
      toast.success('Wage increased!');
    },
    onError: (error) => toast.error(error.message)
  });

  const getMoraleColor = (morale) => {
    if (morale >= 80) return 'text-green-400';
    if (morale >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLoyaltyColor = (loyalty) => {
    if (loyalty >= 75) return 'text-purple-400';
    if (loyalty >= 50) return 'text-blue-400';
    return 'text-red-400';
  };

  const totalMoraleCost = enterpriseNPCs.reduce((sum, npc) => sum + (npc.salary_cost_hourly || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Team Management
            </span>
            <Badge className="bg-purple-600">{enterpriseNPCs.length} NPCs</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Avg Morale</p>
              <p className="text-lg font-bold text-green-400">
                {enterpriseNPCs.length > 0 
                  ? Math.round(enterpriseNPCs.reduce((sum, n) => sum + n.morale, 0) / enterpriseNPCs.length)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Avg Loyalty</p>
              <p className="text-lg font-bold text-purple-400">
                {enterpriseNPCs.length > 0
                  ? Math.round(enterpriseNPCs.reduce((sum, n) => sum + n.loyalty, 0) / enterpriseNPCs.length)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Hourly Cost</p>
              <p className="text-lg font-bold text-red-400">
                ${totalMoraleCost.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NPC Details */}
      <div className="space-y-3">
        {enterpriseNPCs.map((npc) => (
          <Card 
            key={npc.id}
            className={`glass-panel border cursor-pointer transition-all ${
              expandedNPC === npc.id ? 'border-cyan-500/50' : 'border-cyan-500/20'
            }`}
            onClick={() => setExpandedNPC(expandedNPC === npc.id ? null : npc.id)}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    {npc.npc_name}
                    <Badge className="text-xs bg-purple-600">{npc.rarity}</Badge>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">{npc.specialization} • Skill: {npc.skill_level}/10</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${getMoraleColor(npc.morale)}`}>
                    {npc.morale}% Morale
                  </p>
                  <p className={`text-sm font-semibold ${getLoyaltyColor(npc.loyalty)}`}>
                    {npc.loyalty}% Loyalty
                  </p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Morale</span>
                    <span>{npc.morale}%</span>
                  </div>
                  <Progress value={npc.morale} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Loyalty</span>
                    <span>{npc.loyalty}%</span>
                  </div>
                  <Progress value={npc.loyalty} className="h-2" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div className="p-2 bg-slate-800/50 rounded">
                  <p className="text-gray-400">Bonus</p>
                  <p className="text-green-400 font-semibold">+{npc.production_bonus}%</p>
                </div>
                <div className="p-2 bg-slate-800/50 rounded">
                  <p className="text-gray-400">Wage</p>
                  <p className="text-red-400 font-semibold">-${npc.salary_cost_hourly}/h</p>
                </div>
                <div className="p-2 bg-slate-800/50 rounded">
                  <p className="text-gray-400">Risk</p>
                  <p className={`font-semibold ${npc.risk_of_betrayal > 30 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {npc.risk_of_betrayal}%
                  </p>
                </div>
                <div className="p-2 bg-slate-800/50 rounded">
                  <p className="text-gray-400">Trait</p>
                  <p className="text-purple-400 font-semibold text-[10px]">{npc.trait}</p>
                </div>
              </div>

              {/* Expanded Actions */}
              {expandedNPC === npc.id && (
                <div className="space-y-3 border-t border-cyan-500/20 pt-3">
                  {/* Training Options */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white">Training Programs</p>
                    <div className="grid grid-cols-2 gap-2">
                      {trainingPrograms.map((training) => {
                        const canAfford = playerData.crypto_balance >= training.cost;
                        return (
                          <Button
                            key={training.id}
                            size="sm"
                            onClick={() => trainMutation.mutate({ npcId: npc.id, trainingId: training.id })}
                            disabled={!canAfford || trainMutation.isPending}
                            className="text-xs h-8 bg-blue-600 hover:bg-blue-700"
                            title={`Cost: $${training.cost}, Skill +${training.skillGain}, Morale -${training.moraleCost}`}
                          >
                            {training.name.split(' ')[0]}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wage Increase */}
                  <Button
                    size="sm"
                    onClick={() => raiseWageMutation.mutate(npc.id)}
                    disabled={playerData.crypto_balance < 5000 || raiseWageMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs"
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    Raise Wage (+15% Loyalty)
                  </Button>

                  {/* Status Warning */}
                  {npc.morale < 30 && (
                    <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300">
                      ⚠️ Low morale! Risk of betrayal: {npc.risk_of_betrayal}%
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}