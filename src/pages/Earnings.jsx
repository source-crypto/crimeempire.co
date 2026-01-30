import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import RewardSystem from "@/components/rewards/RewardSystem";
import GameEngine from "@/components/engine/GameEngine";
import { 
  TrendingUp, DollarSign, Coins, BarChart3, 
  Calendar, Activity, Target, Zap 
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function EarningsPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user,
    refetchInterval: 10000
  });

  const { data: allRewards = [] } = useQuery({
    queryKey: ['allRewards', playerData?.id],
    queryFn: () => base44.entities.Reward.filter(
      { player_id: playerData.id },
      '-created_date',
      100
    ),
    enabled: !!playerData?.id
  });

  const { data: gameSession } = useQuery({
    queryKey: ['gameSession', playerData?.id],
    queryFn: async () => {
      const sessions = await base44.entities.GameSession.filter({
        player_id: playerData.id,
        is_active: true
      });
      
      if (sessions.length === 0) {
        return await base44.entities.GameSession.create({
          player_id: playerData.id,
          session_start: new Date().toISOString(),
          is_active: true
        });
      }
      return sessions[0];
    },
    enabled: !!playerData?.id
  });

  const rewardsByType = allRewards.reduce((acc, reward) => {
    const type = reward.reward_type;
    if (!acc[type]) {
      acc[type] = { count: 0, total: 0 };
    }
    acc[type].count += 1;
    acc[type].total += (reward.crypto_amount || 0) + (reward.cash_amount || 0);
    return acc;
  }, {});

  const chartData = Object.entries(rewardsByType).map(([type, data]) => ({
    name: type.replace(/_/g, ' '),
    value: data.total,
    count: data.count
  }));

  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const earningsByDay = last7Days.map(date => {
    const dayRewards = allRewards.filter(r => 
      r.created_date && r.created_date.startsWith(date)
    );
    const total = dayRewards.reduce((sum, r) => 
      sum + (r.crypto_amount || 0) + (r.cash_amount || 0), 0
    );
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      earnings: total
    };
  });

  const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  const stats = [
    {
      title: "Total Earnings",
      value: `$${(playerData?.total_earnings || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-400",
      bg: "from-green-500/10 to-emerald-500/10"
    },
    {
      title: "Current Balance",
      value: `$${(playerData?.crypto_balance || 0).toLocaleString()}`,
      icon: Coins,
      color: "text-purple-400",
      bg: "from-purple-500/10 to-pink-500/10"
    },
    {
      title: "Total Rewards",
      value: allRewards.length,
      icon: Target,
      color: "text-blue-400",
      bg: "from-blue-500/10 to-cyan-500/10"
    },
    {
      title: "Session Earnings",
      value: `$${((gameSession?.earnings_this_session?.crypto || 0) + (gameSession?.earnings_this_session?.cash || 0)).toLocaleString()}`,
      icon: Zap,
      color: "text-amber-400",
      bg: "from-amber-500/10 to-orange-500/10"
    }
  ];

  if (!playerData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <GameEngine playerData={playerData} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Earnings Dashboard</h1>
          <p className="text-slate-400 mt-1">Track your income and rewards</p>
        </div>
        <Badge className="bg-green-600 text-white px-4 py-2">
          <Activity className="w-4 h-4 mr-2 inline" />
          Active Session
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={`bg-gradient-to-br ${stat.bg} border-slate-700`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RewardSystem playerData={playerData} />

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="glass-panel border border-slate-700">
          <TabsTrigger value="charts">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-panel border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Earnings by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-panel border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earningsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
                      labelStyle={{ color: '#E2E8F0' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-panel border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Reward Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
                    labelStyle={{ color: '#E2E8F0' }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass-panel border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Reward History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-white capitalize">
                        {reward.reward_type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {new Date(reward.created_date).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {reward.crypto_amount > 0 && (
                        <p className="text-purple-400 font-semibold">
                          +${reward.crypto_amount.toLocaleString()}
                        </p>
                      )}
                      <Badge className={
                        reward.status === 'claimed' ? 'bg-green-600' : 'bg-amber-600'
                      }>
                        {reward.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}