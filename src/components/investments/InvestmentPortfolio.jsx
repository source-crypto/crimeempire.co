import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, DollarSign, PiggyBank, Loader2, Sparkles, TrendingDown, BarChart3, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  const { data: transactionLogs = [] } = useQuery({
    queryKey: ['investmentTransactions', playerData?.id],
    queryFn: () => base44.entities.TransactionLog.filter({ 
      player_id: playerData.id,
      transaction_type: 'investment_return'
    }),
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

  const activeInvestments = investments.filter(i => i.status === 'active');
  const totalROI = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested * 100) : 0;
  
  // Calculate daily returns history
  const returnsHistory = React.useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      
      const dayReturns = transactionLogs
        .filter(log => log.created_date?.startsWith(dayStr))
        .reduce((sum, log) => sum + (log.amount || 0), 0);
      
      last7Days.push({
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        returns: dayReturns
      });
    }
    return last7Days;
  }, [transactionLogs]);

  // Calculate investment performance metrics
  const investmentPerformance = activeInvestments.map(inv => {
    const daysActive = Math.floor((Date.now() - new Date(inv.created_date).getTime()) / (1000 * 60 * 60 * 24));
    const expectedReturns = inv.daily_return * daysActive;
    const actualROI = inv.amount_invested > 0 ? ((inv.current_value - inv.amount_invested) / inv.amount_invested * 100) : 0;
    const performanceRating = actualROI >= expectedReturns / inv.amount_invested * 100 ? 'outperforming' : 'underperforming';
    
    return {
      ...inv,
      daysActive,
      expectedReturns,
      actualROI,
      performanceRating
    };
  });

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30 text-center">
            <p className="text-xs text-gray-400">Overall ROI</p>
            <p className={`text-lg font-bold ${totalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Returns History Chart */}
        {returnsHistory.some(d => d.returns > 0) && (
          <div className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/30">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              7-Day Returns History
            </h4>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={returnsHistory}>
                <defs>
                  <linearGradient id="returnsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Returns']}
                />
                <Area 
                  type="monotone" 
                  dataKey="returns" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#returnsGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

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

        {/* Active Investments with Transparency */}
        <div>
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            Active Investments ({activeInvestments.length})
          </h4>
          {activeInvestments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active investments</p>
          ) : (
            <div className="space-y-3">
              {investmentPerformance.map((investment) => {
                const profit = investment.current_value - investment.amount_invested;
                const isProfitable = profit > 0;
                
                return (
                  <div key={investment.id} className="p-4 rounded-lg bg-slate-900/50 border border-green-500/30 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-semibold text-white text-sm flex items-center gap-2">
                          {investment.asset_name}
                          {investment.performanceRating === 'outperforming' ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-orange-400" />
                          )}
                        </h5>
                        <p className="text-xs text-gray-400 mt-1">
                          Active for {investment.daysActive} days
                        </p>
                      </div>
                      <Badge className={
                        investment.risk_level === 'low' ? 'bg-green-600' :
                        investment.risk_level === 'medium' ? 'bg-yellow-600' :
                        investment.risk_level === 'high' ? 'bg-orange-600' : 'bg-red-600'
                      }>
                        {investment.risk_level} risk
                      </Badge>
                    </div>

                    {/* Transparent Metrics */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-gray-400">Invested</p>
                        <p className="text-white font-semibold">
                          ${investment.amount_invested.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-gray-400">Current Value</p>
                        <p className="text-cyan-400 font-semibold">
                          ${investment.current_value.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-gray-400">Total Returns</p>
                        <p className="text-green-400 font-semibold">
                          +${investment.total_earned.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-gray-400">ROI</p>
                        <p className={`font-semibold ${investment.actualROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {investment.actualROI >= 0 ? '+' : ''}{investment.actualROI.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Performance Details */}
                    <div className="p-2 rounded-lg bg-purple-900/20 border border-purple-500/30 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Daily Return Rate:</span>
                        <span className="text-white">${investment.daily_return.toFixed(2)}/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Expected Returns:</span>
                        <span className="text-yellow-400">
                          ${investment.expectedReturns.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Actual vs Expected:</span>
                        <span className={investment.performanceRating === 'outperforming' ? 'text-green-400' : 'text-orange-400'}>
                          {investment.performanceRating}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Net Profit/Loss:</span>
                        <span className={isProfitable ? 'text-green-400' : 'text-red-400'}>
                          {isProfitable ? '+' : ''}${profit.toLocaleString()}
                        </span>
                      </div>
                      {investment.maturity_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Matures:</span>
                          <span className="text-cyan-400">
                            {new Date(investment.maturity_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-900/20"
                      onClick={() => liquidateInvestmentMutation.mutate(investment)}
                      disabled={liquidateInvestmentMutation.isPending}
                    >
                      Liquidate Investment (Get ${investment.current_value.toLocaleString()})
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}