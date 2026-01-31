import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Zap, Building2, MapPin, DollarSign, Clock, Gift } from 'lucide-react';
import RewardSystem from '../components/rewards/RewardSystem';

export default function Earnings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: passiveIncomes = [] } = useQuery({
    queryKey: ['passiveIncomes', playerData?.id],
    queryFn: () => base44.entities.PassiveIncome.filter({ player_id: playerData.id, is_active: true }),
    enabled: !!playerData?.id,
    refetchInterval: 30000
  });

  const { data: recentSessions = [] } = useQuery({
    queryKey: ['gameSessions', playerData?.id],
    queryFn: () => base44.entities.GameSession.filter({ player_id: playerData.id }, '-created_date', 10),
    enabled: !!playerData?.id
  });

  const collectIncome = useMutation({
    mutationFn: async (incomeId) => {
      const income = passiveIncomes.find(i => i.id === incomeId);
      if (!income) return;

      const amount = income.accumulated_amount || 0;
      
      await base44.entities.PassiveIncome.update(incomeId, {
        accumulated_amount: 0,
        last_collected: new Date().toISOString()
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + amount,
        total_earnings: (playerData.total_earnings || 0) + amount
      });

      return amount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['passiveIncomes']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const totalHourlyIncome = passiveIncomes.reduce((sum, income) => sum + (income.hourly_rate || 0), 0);
  const totalAccumulated = passiveIncomes.reduce((sum, income) => sum + (income.accumulated_amount || 0), 0);

  if (!playerData) {
    return <div className="text-white">Loading...</div>;
  }

  const getSourceIcon = (type) => {
    switch (type) {
      case 'territory': return <MapPin className="w-4 h-4" />;
      case 'enterprise': return <Building2 className="w-4 h-4" />;
      case 'investment': return <TrendingUp className="w-4 h-4" />;
      case 'crew_share': return <Zap className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Earnings Dashboard</h1>
        <p className="text-gray-400">Track your passive income and rewards</p>
      </div>

      <RewardSystem playerData={playerData} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Hourly Income</p>
                <p className="text-2xl font-bold text-cyan-400">${totalHourlyIncome.toLocaleString()}/hr</p>
              </div>
              <Clock className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Accumulated</p>
                <p className="text-2xl font-bold text-green-400">${totalAccumulated.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Earned</p>
                <p className="text-2xl font-bold text-purple-400">${(playerData.total_earnings || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-yellow-400" />
            Active Income Sources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {passiveIncomes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No passive income sources yet</p>
              <p className="text-sm mt-1">Capture territories and build enterprises to earn passive income</p>
            </div>
          ) : (
            passiveIncomes.map((income) => (
              <div
                key={income.id}
                className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-600/30">
                    {getSourceIcon(income.source_type)}
                  </div>
                  <div>
                    <div className="font-semibold text-white capitalize">{income.source_type.replace('_', ' ')}</div>
                    <div className="text-sm text-gray-400">
                      ${income.hourly_rate}/hr • {income.efficiency}% efficiency
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">
                    ${(income.accumulated_amount || 0).toFixed(2)}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => collectIncome.mutate(income.id)}
                    disabled={income.accumulated_amount < 1}
                    className="mt-2 bg-green-600 hover:bg-green-700"
                  >
                    Collect
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentSessions.map((session) => (
            <div
              key={session.id}
              className="p-3 rounded-lg bg-slate-900/50 border border-blue-500/20 flex items-center justify-between"
            >
              <div>
                <div className="text-white font-medium">
                  {session.duration_minutes || 0} minutes played
                </div>
                <div className="text-sm text-gray-400">
                  {session.actions_taken || 0} actions • ${(session.crypto_earned || 0).toLocaleString()} earned
                </div>
              </div>
              <Badge className={session.session_type === 'completed' ? 'bg-green-600' : 'bg-orange-600'}>
                {session.session_type}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}