import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, DollarSign, Package, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AIContractBoard({ playerData }) {
  const queryClient = useQueryClient();

  const { data: contracts = [] } = useQuery({
    queryKey: ['aiContracts'],
    queryFn: () => base44.entities.AIContract.filter({ status: 'available' }),
    refetchInterval: 60000
  });

  const generateContractMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate an AI contract for trading/transport:

Player Level: ${playerData.level}
Available Items: Random
Territory: AI-controlled neutral zone

Create contract with:
1. Item type needed (weapon/material/contraband/intel)
2. Quantity (50-500 units)
3. Offered price (1000-10000)
4. Bonus payment (0-2000)
5. Difficulty (easy/medium/hard based on player level)
6. Risk level (30-80)
7. Requirements

Return JSON.`;

      const contractData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            requested_item_type: { type: 'string' },
            requested_quantity: { type: 'number' },
            offered_price: { type: 'number' },
            bonus_payment: { type: 'number' },
            difficulty: { type: 'string' },
            risk_level: { type: 'number' },
            requirements: {
              type: 'object',
              properties: {
                min_level: { type: 'number' },
                required_vehicle: { type: 'boolean' },
                crew_support: { type: 'boolean' }
              }
            }
          }
        }
      });

      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 24);

      return await base44.entities.AIContract.create({
        contract_type: 'buy',
        territory_id: 'ai-territory-001',
        territory_name: 'Neutral Zone',
        ...contractData,
        status: 'available',
        deadline: deadline.toISOString(),
        rewards: {
          crypto: contractData.offered_price,
          reputation: Math.floor(contractData.offered_price / 100),
          experience: Math.floor(contractData.offered_price / 50)
        },
        ai_generated: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiContracts']);
      toast.success('New contract generated!');
    }
  });

  const acceptContractMutation = useMutation({
    mutationFn: async (contract) => {
      await base44.entities.AIContract.update(contract.id, {
        status: 'accepted',
        accepted_by_player: playerData.id
      });

      if (playerData.crew_id) {
        await base44.entities.CrewActivity.create({
          crew_id: playerData.crew_id,
          activity_type: 'heist_completed',
          title: 'Contract Accepted',
          description: `${playerData.username} accepted: ${contract.requested_item_type} delivery`,
          player_id: playerData.id,
          player_username: playerData.username
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiContracts']);
      toast.success('Contract accepted!');
    }
  });

  const completeContractMutation = useMutation({
    mutationFn: async (contract) => {
      await base44.entities.AIContract.update(contract.id, {
        status: 'completed'
      });

      const totalPayout = contract.offered_price + contract.bonus_payment;

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + totalPayout,
        experience: playerData.experience + contract.rewards.experience,
        total_earnings: playerData.total_earnings + totalPayout,
        stats: {
          ...playerData.stats,
          contracts_completed: (playerData.stats?.contracts_completed || 0) + 1
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiContracts']);
      queryClient.invalidateQueries(['player']);
      toast.success('Contract completed! Payment received.');
    }
  });

  return (
    <Card className="glass-panel border-orange-500/20">
      <CardHeader className="border-b border-orange-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-orange-400" />
            AI Territory Contracts
          </CardTitle>
          <Button
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-red-600"
            onClick={() => generateContractMutation.mutate()}
            disabled={generateContractMutation.isPending}
          >
            {generateContractMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {contracts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No contracts available</p>
          </div>
        ) : (
          contracts.map((contract) => {
            const isAcceptedByMe = contract.accepted_by_player === playerData?.id;
            
            return (
              <div key={contract.id} className="p-3 rounded-lg bg-orange-900/20 border border-orange-500/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {contract.territory_name}
                    </h4>
                    <p className="text-xs text-gray-400 capitalize">
                      Needs: {contract.requested_quantity} x {contract.requested_item_type}
                    </p>
                  </div>
                  <Badge className={
                    contract.difficulty === 'easy' ? 'bg-green-600' :
                    contract.difficulty === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                  }>
                    {contract.difficulty}
                  </Badge>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Payment
                    </span>
                    <span className="text-green-400 font-semibold">
                      ${contract.offered_price.toLocaleString()}
                    </span>
                  </div>
                  {contract.bonus_payment > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Bonus</span>
                      <span className="text-cyan-400">
                        +${contract.bonus_payment.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Risk</span>
                    <span className="text-red-400">{contract.risk_level}%</span>
                  </div>
                </div>

                {isAcceptedByMe ? (
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => completeContractMutation.mutate(contract)}
                    disabled={completeContractMutation.isPending}
                  >
                    Complete Contract
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-orange-500/30"
                    onClick={() => acceptContractMutation.mutate(contract)}
                    disabled={acceptContractMutation.isPending}
                  >
                    Accept Contract
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}