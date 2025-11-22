import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../components/dashboard/StatCard';
import ActiveBattles from '../components/dashboard/ActiveBattles';
import ActiveHeists from '../components/dashboard/ActiveHeists';
import QuickActions from '../components/dashboard/QuickActions';
import SystemStatus from '../components/dashboard/SystemStatus';
import AIProgressionAnalyzer from '../components/progression/AIProgressionAnalyzer';
import PlayerMarketplace from '../components/trading/PlayerMarketplace';
import InvestmentPortfolio from '../components/investments/InvestmentPortfolio';
import AIContractBoard from '../components/contracts/AIContractBoard';
import EventBroadcastSystem from '../components/events/EventBroadcastSystem';
import LiveMarketTracker from '../components/marketplace/LiveMarketTracker';
import TransparentInvestmentSystem from '../components/economy/TransparentInvestmentSystem';
import EconomyDashboard from '../components/economy/EconomyDashboard';
import PlayerActionEventSystem from '../components/economy/PlayerActionEventSystem';
import { 
  Wallet, TrendingUp, MapPin, Users, Star, AlertTriangle, Building2, Target, Zap, ShoppingCart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '../utils';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      if (players.length === 0) {
        // Create initial player
        const newPlayer = await base44.entities.Player.create({
          username: currentUser.full_name || currentUser.email.split('@')[0],
          crypto_balance: 10000,
          buy_power: 5000,
          level: 1,
          strength_score: 10,
          wanted_level: 0,
          skill_points: 5,
          skills: {
            combat: 1,
            stealth: 1,
            driving: 1,
            hacking: 1,
            leadership: 1,
            negotiation: 1
          },
          stats: {
            heists_completed: 0,
            heists_failed: 0,
            battles_won: 0,
            battles_lost: 0,
            territories_captured: 0,
            total_loot: 0
          },
          playstyle: 'balanced'
        });
        return newPlayer;
      }
      return players[0];
    },
    enabled: !!currentUser,
  });

  const { data: crewData } = useQuery({
    queryKey: ['crew', playerData?.crew_id],
    queryFn: () => base44.entities.Crew.filter({ id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
  });

  const { data: battles = [] } = useQuery({
    queryKey: ['battles'],
    queryFn: () => base44.entities.Battle.filter({ status: 'active' }),
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  const { data: activeHeists = [] } = useQuery({
    queryKey: ['activeHeists', playerData?.crew_id],
    queryFn: () => base44.entities.Heist.filter({ 
      crew_id: playerData.crew_id,
      status: 'in_progress'
    }),
    enabled: !!playerData?.crew_id,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['crewActivity', playerData?.crew_id],
    queryFn: () => base44.entities.CrewActivity.filter(
      { crew_id: playerData.crew_id },
      '-created_date',
      10
    ),
    enabled: !!playerData?.crew_id,
    refetchInterval: 5000
  });

  const crew = crewData?.[0];

  const handleJoinBattle = (battleId) => {
    window.location.href = createPageUrl('Territories');
  };

  const wantedStars = playerData?.wanted_level || 0;
  const levelProgress = ((playerData?.endgame_points || 0) % 1000) / 10;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {playerData?.username || 'Rookie'}
              </span>
            </h1>
            <p className="text-gray-400">Your criminal empire awaits</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-400">Level {playerData?.level || 1}</p>
              <div className="flex gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < wantedStars ? 'text-red-500 fill-red-500' : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress to Level {(playerData?.level || 1) + 1}</span>
            <span>{levelProgress.toFixed(0)}%</span>
          </div>
          <Progress value={levelProgress} className="h-2" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Crypto Balance"
          value={`$${(playerData?.crypto_balance || 0).toLocaleString()}`}
          icon={Wallet}
          trend="up"
          trendValue="+12.5%"
          color="purple"
        />
        <StatCard
          title="Total Earnings"
          value={`$${(playerData?.total_earnings || 0).toLocaleString()}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+8.2%"
          color="cyan"
        />
        <StatCard
          title="Territories"
          value={playerData?.territory_count || 0}
          icon={MapPin}
          color="green"
        />
        <StatCard
          title="Strength Score"
          value={playerData?.strength_score || 10}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Crew Info */}
      {crew && (
        <Card className="glass-panel border border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-purple-400" />
              Your Crew: {crew.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="text-lg font-semibold text-white capitalize">{playerData?.crew_role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Members</p>
                <p className="text-lg font-semibold text-white">{crew.member_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Territories</p>
                <p className="text-lg font-semibold text-white">{crew.territory_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Reputation</p>
                <p className="text-lg font-semibold text-white">{crew.reputation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enterprises Overview */}
      {enterprises.length > 0 && (
        <Card className="glass-panel border border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Building2 className="w-5 h-5 text-purple-400" />
              Your Operations
              <Badge className="ml-auto bg-purple-600">{enterprises.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {enterprises.slice(0, 4).map((enterprise) => (
                <div
                  key={enterprise.id}
                  className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-white">{enterprise.name}</h4>
                      <p className="text-sm text-gray-400 capitalize">{enterprise.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge className={enterprise.is_active ? 'bg-green-600' : 'bg-red-600'}>
                      {enterprise.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className={`w-4 h-4 ${enterprise.heat_level > 50 ? 'text-red-400' : 'text-yellow-400'}`} />
                    <span className="text-gray-400">Heat: {enterprise.heat_level}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progression">AI Progression</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="broadcasts">Event Broadcasts</TabsTrigger>
          <TabsTrigger value="economy">Economy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ActiveBattles battles={battles} onJoinBattle={handleJoinBattle} />
              <ActiveHeists heists={activeHeists} />
            </div>
            <div className="space-y-6">
              <QuickActions />
              <SystemStatus 
                playerData={playerData} 
                crew={crew} 
                enterprises={enterprises}
              />
            </div>
          </div>

          {/* Recent Activity Feed */}
          {recentActivity.length > 0 && (
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-white text-sm">{activity.title}</h4>
                          <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
                        </div>
                        {activity.value && (
                          <Badge className="bg-green-600 text-xs">
                            +${activity.value.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      {activity.player_username && (
                        <p className="text-xs text-purple-400 mt-2">
                          by {activity.player_username}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progression">
          <AIProgressionAnalyzer 
            playerData={playerData} 
            onUpdate={refetchPlayer}
          />
        </TabsContent>

        <TabsContent value="marketplace">
          <div className="space-y-4">
            <LiveMarketTracker playerData={playerData} />
            <PlayerMarketplace playerData={playerData} />
          </div>
        </TabsContent>

        <TabsContent value="investments">
          <div className="space-y-4">
            <TransparentInvestmentSystem playerData={playerData} />
            <InvestmentPortfolio playerData={playerData} />
          </div>
        </TabsContent>

        <TabsContent value="contracts">
          <AIContractBoard playerData={playerData} />
        </TabsContent>

        <TabsContent value="broadcasts">
          <EventBroadcastSystem playerData={playerData} />
        </TabsContent>

        <TabsContent value="economy">
          <div className="space-y-4">
            <PlayerActionEventSystem playerData={playerData} />
            <EconomyDashboard playerData={playerData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}