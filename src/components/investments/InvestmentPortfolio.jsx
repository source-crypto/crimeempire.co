import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, DollarSign, PiggyBank, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const investmentTypes = [
  { value: 'crypto_staking', label: 'Crypto Staking', risk: 'low', return: 5 },
  { value: 'enterprise_shares', label: 'Enterprise Shares', risk: 'medium', return: 10 },
  { value: 'territory_bonds', label: 'Territory Bonds', risk: 'medium', return: 8 },
  { value: 'market_speculation', label: 'Market Speculation', risk: 'high', return: 20 },
  { value: 'crew_investment', label: 'Crew Investment', risk: 'extreme', return: 30 }
];

export default function InvestmentPortfolio({ playerData }) {
  const [investmentType, setInvestmentType] = useState('crypto_staking');
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: investments = [] } = useQuery({
    queryKey: ['investments', playerData?.id],
    queryFn: () => base44.entities.Investment.filter({ player_id: playerData.id }),
    enabled: !!playerData
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async () => {
      const investAmount = parseInt(amount);
      
      if (investAmount > playerData.crypto_balance) {
        throw new Error('Insufficient funds');
      }

      const type = investmentTypes.find(t => t.value === investmentType);
      const maturityDate = new Date();
      maturityDate.setDate(maturityDate.getDate() + 30);

      const investment = await base44.entities.Investment.create({
        player_id: playerData.id,
        investment_type: investmentType,
        asset_name: type.label,
        amount_invested: investAmount,
        current_value: investAmount,
        roi_percentage: 0,
        risk_level: type.risk,
        status: 'active',
        maturity_date: maturityDate.toISOString(),
        daily_return: investAmount * (type.return / 100) / 30,
        total_earned: 0
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - investAmount,
        stats: {
          ...playerData.stats,
          investments_made: (playerData.stats?.investments_made || 0) + 1
        }
      });

      return investment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investments']);
      queryClient.invalidateQueries(['player']);
      toast.success('Investment created!');
      setAmount('');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const liquidateInvestmentMutation = useMutation({
    mutationFn: async (investment) => {
      await base44.entities.Investment.update(investment.id, {
        status: 'liquidated'
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + investment.current_value,
        total_earnings: playerData.total_earnings + investment.total_earned
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investments']);
      queryClient.invalidateQueries(['player']);
      toast.success('Investment liquidated!');
    }
  });

  const totalInvested = investments
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + i.amount_invested, 0);
    
  const totalValue = investments
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + i.current_value, 0);

  const totalReturns = investments
    .reduce((sum, i) => sum + i.total_earned, 0);

  return (
    <Card className="glass-panel border-green-500/20">
      <CardHeader className="border-b border-green-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <PiggyBank className="w-5 h-5 text-green-400" />
          Investment Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30 text-center">
            <p className="text-xs text-gray-400">Total Invested</p>
            <p className="text-lg font-bold text-white">
              ${totalInvested.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/30 text-center">
            <p className="text-xs text-gray-400">Current Value</p>
            <p className="text-lg font-bold text-cyan-400">
              ${totalValue.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30 text-center">
            <p className="text-xs text-gray-400">Total Returns</p>
            <p className="text-lg font-bold text-green-400">
              +${totalReturns.toLocaleString()}
            </p>
          </div>
        </div>

        {/* New Investment */}
        <div className="p-4 rounded-lg bg-slate-900/50 border border-green-500/30">
          <h4 className="font-semibold text-white mb-3">Create Investment</h4>
          <div className="space-y-3">
            <Select value={investmentType} onValueChange={setInvestmentType}>
              <SelectTrigger className="bg-slate-900/50 border-green-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {investmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label} - {type.return}% return ({type.risk} risk)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              placeholder="Investment amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-900/50 border-green-500/20 text-white"
            />

            <Button
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
              onClick={() => createInvestmentMutation.mutate()}
              disabled={!amount || createInvestmentMutation.isPending}
            >
              {createInvestmentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              Invest
            </Button>
          </div>
        </div>

        {/* Active Investments */}
        <div>
          <h4 className="font-semibold text-white mb-2">Active Investments</h4>
          {investments.filter(i => i.status === 'active').length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active investments</p>
          ) : (
            <div className="space-y-2">
              {investments.filter(i => i.status === 'active').map((investment) => (
                <div key={investment.id} className="p-3 rounded-lg bg-slate-900/50 border border-green-500/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-semibold text-white text-sm">{investment.asset_name}</h5>
                      <p className="text-xs text-gray-400">
                        Invested: ${investment.amount_invested.toLocaleString()}
                      </p>
                    </div>
                    <Badge className={
                      investment.risk_level === 'low' ? 'bg-green-600' :
                      investment.risk_level === 'medium' ? 'bg-yellow-600' :
                      investment.risk_level === 'high' ? 'bg-orange-600' : 'bg-red-600'
                    }>
                      {investment.risk_level}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-400">Current Value</span>
                    <span className="text-cyan-400 font-semibold">
                      ${investment.current_value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-gray-400">Total Earned</span>
                    <span className="text-green-400 font-semibold">
                      +${investment.total_earned.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-red-500/30 text-red-400"
                    onClick={() => liquidateInvestmentMutation.mutate(investment)}
                    disabled={liquidateInvestmentMutation.isPending}
                  >
                    Liquidate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}