import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, 
  Building2, Map, PiggyBank, Zap, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';

export default function TransparentWallet({ playerData }) {
  const { data: transactions = [] } = useQuery({
    queryKey: ['recentTransactions', playerData?.id],
    queryFn: () => base44.entities.TransactionLog.filter({ 
      player_id: playerData.id 
    }, '-created_date', 50),
    enabled: !!playerData,
    staleTime: 10000
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['playerEnterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ 
      owner_id: playerData.id 
    }),
    enabled: !!playerData,
    staleTime: 30000
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['playerTerritories', playerData?.id],
    queryFn: async () => {
      const allTerritories = await base44.entities.Territory.list();
      return allTerritories.filter(t => t.owner_id === playerData.id);
    },
    enabled: !!playerData,
    staleTime: 30000
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['activeInvestments', playerData?.id],
    queryFn: () => base44.entities.Investment.filter({ 
      player_id: playerData.id,
      status: 'active'
    }),
    enabled: !!playerData,
    staleTime: 30000
  });

  const totalBalance = (playerData?.crypto_balance || 0) + (playerData?.buy_power || 0);

  // Calculate income sources
  const enterpriseIncome = enterprises.reduce((sum, e) => 
    sum + (e.production_rate * 10), 0); // rough hourly estimate
  
  const territoryIncome = territories.reduce((sum, t) => 
    sum + (t.tax_rate || 0) * 100, 0);
  
  const investmentIncome = investments.reduce((sum, i) => 
    sum + (i.daily_return || 0), 0);

  const totalDailyIncome = (enterpriseIncome * 24) + (territoryIncome * 24) + investmentIncome;

  // Categorize transactions
  const incomeTransactions = transactions.filter(t => t.amount > 0);
  const expenseTransactions = transactions.filter(t => t.amount < 0);
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = Math.abs(expenseTransactions.reduce((sum, t) => sum + t.amount, 0));

  // Income breakdown by source
  const incomeBreakdown = {
    enterprises: incomeTransactions.filter(t => 
      t.description?.includes('enterprise') || t.description?.includes('production')
    ).reduce((sum, t) => sum + t.amount, 0),
    territories: incomeTransactions.filter(t => 
      t.description?.includes('territory') || t.description?.includes('tax')
    ).reduce((sum, t) => sum + t.amount, 0),
    investments: incomeTransactions.filter(t => 
      t.description?.includes('investment') || t.description?.includes('return')
    ).reduce((sum, t) => sum + t.amount, 0),
    trading: incomeTransactions.filter(t => 
      t.description?.includes('trade') || t.description?.includes('sold')
    ).reduce((sum, t) => sum + t.amount, 0),
    other: incomeTransactions.filter(t => 
      !t.description?.includes('enterprise') && 
      !t.description?.includes('territory') && 
      !t.description?.includes('investment') &&
      !t.description?.includes('trade')
    ).reduce((sum, t) => sum + t.amount, 0)
  };

  const getTransactionIcon = (transaction) => {
    if (transaction.description?.includes('enterprise')) return Building2;
    if (transaction.description?.includes('territory')) return Map;
    if (transaction.description?.includes('investment')) return PiggyBank;
    if (transaction.description?.includes('trade')) return Zap;
    return transaction.amount > 0 ? ArrowUpCircle : ArrowDownCircle;
  };

  return (
    <Card className="glass-panel border-green-500/20">
      <CardHeader className="border-b border-green-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-400" />
            Transparent Wallet
          </CardTitle>
          <Badge className="bg-green-600">Live Balance</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Balance Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg border border-green-500/30">
            <p className="text-xs text-gray-400 mb-1">Crypto Balance</p>
            <p className="text-2xl font-bold text-green-400">
              ${playerData?.crypto_balance?.toLocaleString() || 0}
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-lg border border-cyan-500/30">
            <p className="text-xs text-gray-400 mb-1">Buy Power</p>
            <p className="text-2xl font-bold text-cyan-400">
              ${playerData?.buy_power?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Total Net Worth</p>
            <Badge className="bg-purple-600">${totalBalance.toLocaleString()}</Badge>
          </div>
          <div className="text-xs text-gray-500">
            Projected Daily Income: <span className="text-green-400 font-semibold">
              +${totalDailyIncome.toLocaleString()}
            </span>
          </div>
        </div>

        <Tabs defaultValue="income" className="space-y-3">
          <TabsList className="glass-panel w-full grid grid-cols-3">
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-3">
            <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Total Income (Last 50 tx)</span>
                <span className="text-xl font-bold text-green-400">
                  +${totalIncome.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg per transaction:</span>
                  <span className="text-green-400">
                    ${(totalIncome / Math.max(incomeTransactions.length, 1)).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Income transactions:</span>
                  <span className="text-white">{incomeTransactions.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeTransactions.slice(0, 15).map((tx) => {
                const Icon = getTransactionIcon(tx);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-green-500/10">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-green-400" />
                      <div>
                        <p className="text-sm text-white font-medium">+${tx.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{tx.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(tx.created_date).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-3">
            <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Total Expenses</span>
                <span className="text-xl font-bold text-red-400">
                  -${totalExpenses.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg per transaction:</span>
                  <span className="text-red-400">
                    ${(totalExpenses / Math.max(expenseTransactions.length, 1)).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Net profit margin:</span>
                  <span className={totalIncome > totalExpenses ? 'text-green-400' : 'text-red-400'}>
                    {((totalIncome - totalExpenses) / Math.max(totalIncome, 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expenseTransactions.slice(0, 15).map((tx) => {
                const Icon = getTransactionIcon(tx);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-red-500/10">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-red-400" />
                      <div>
                        <p className="text-sm text-white font-medium">${Math.abs(tx.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{tx.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(tx.created_date).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Income Sources Tab */}
          <TabsContent value="sources" className="space-y-3">
            <div className="space-y-2">
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white">Enterprises</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    ${incomeBreakdown.enterprises.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(incomeBreakdown.enterprises / Math.max(totalIncome, 1)) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {enterprises.length} active • ${(enterpriseIncome * 24).toLocaleString()}/day projected
                </p>
              </div>

              <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-white">Territories</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    ${incomeBreakdown.territories.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(incomeBreakdown.territories / Math.max(totalIncome, 1)) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {territories.length} controlled • ${(territoryIncome * 24).toLocaleString()}/day projected
                </p>
              </div>

              <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-white">Investments</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    ${incomeBreakdown.investments.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(incomeBreakdown.investments / Math.max(totalIncome, 1)) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {investments.length} active • ${investmentIncome.toLocaleString()}/day projected
                </p>
              </div>

              <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-white">Trading</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    ${incomeBreakdown.trading.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(incomeBreakdown.trading / Math.max(totalIncome, 1)) * 100} 
                  className="h-2"
                />
              </div>

              <div className="p-3 bg-gray-900/20 rounded-lg border border-gray-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-white">Other</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    ${incomeBreakdown.other.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(incomeBreakdown.other / Math.max(totalIncome, 1)) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}