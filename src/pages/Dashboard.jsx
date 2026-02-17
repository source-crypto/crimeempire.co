import React, { useState, useEffect, lazy } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import LazyLoadWrapper from '../components/performance/LazyLoadWrapper';
import GameEngine from '../components/engine/GameEngine';
import StatCard from '../components/dashboard/StatCard';
import ActiveBattles from '../components/dashboard/ActiveBattles';
import ActiveHeists from '../components/dashboard/ActiveHeists';
import QuickActions from '../components/dashboard/QuickActions';
import SystemStatus from '../components/dashboard/SystemStatus';

// Lazy load heavy components
const TransparentWallet = lazy(() => import('../components/economy/TransparentWallet'));
const AutomatedIncomeWorkflows = lazy(() => import('../components/economy/AutomatedIncomeWorkflows'));
const AIProgressionAnalyzer = lazy(() => import('../components/progression/AIProgressionAnalyzer'));
const PlayerMarketplace = lazy(() => import('../components/trading/PlayerMarketplace'));
const InvestmentPortfolio = lazy(() => import('../components/investments/InvestmentPortfolio'));
const AIContractBoard = lazy(() => import('../components/contracts/AIContractBoard'));
const EventBroadcastSystem = lazy(() => import('../components/events/EventBroadcastSystem'));
const LiveMarketTracker = lazy(() => import('../components/marketplace/LiveMarketTracker'));
const TransparentInvestmentSystem = lazy(() => import('../components/economy/TransparentInvestmentSystem'));
const EconomyDashboard = lazy(() => import('../components/economy/EconomyDashboard'));
const PlayerActionEventSystem = lazy(() => import('../components/economy/PlayerActionEventSystem'));
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

  const { data: playerData, refetch: refetchPlayer, isLoading: isLoadingPlayer } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      if (players.length === 0) {
        const newPlayer = await base44.entities.Player.create({
          username: currentUser.full_name || currentUser.email.split('@')[0],
          crypto_balance: 50000,
          buy_power: 50000,
          endgame_points: 50000,
          level: 1,
          strength_score: 10,
          wanted_level: 0,
          experience: 0,
          skill_points: 5,
          skills: { combat: 0, stealth: 0, driving: 0, hacking: 0, leadership: 0, negotiation: 0 },
          stats: {
            heists_completed: 0, heists_failed: 0, battles_won: 0, battles_lost: 0,
            territories_captured: 0, total_loot: 0, contracts_completed: 0,
            items_traded: 0, investments_made: 0
          },
          playstyle: 'balanced'
        });
        return newPlayer;
      }
      return players[0];
    },
    enabled: !!currentUser,
    staleTime: 30000,
    gcTime: 60000,
    refetchOnWindowFocus: true,
    retry: 1
  });

  const { data: crewData } = useQuery({
    queryKey: ['crew', playerData?.crew_id],
    queryFn: () => base44.entities.Crew.filter({ id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
    staleTime: 30000,
    gcTime: 60000,
    retry: 1
  });

  const { data: battles = [] } = useQuery({
    queryKey: ['battles'],
    queryFn: () => base44.entities.Battle.filter({ status: 'active' }, '-created_date', 3),
    staleTime: 30000,
    gcTime: 60000,
    retry: 1
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }, '-created_date', 5),
    enabled: !!playerData?.id,
    staleTime: 30000,
    gcTime: 60000,
    retry: 1
  });

  const { data: activeHeists = [] } = useQuery({
    queryKey: ['activeHeists', playerData?.crew_id],
    queryFn: () => base44.entities.Heist.filter({ 
      crew_id: playerData.crew_id,
      status: 'in_progress'
    }, '-created_date', 3),
    enabled: !!playerData?.crew_id,
    staleTime: 30000,
    gcTime: 60000,
    retry: 1
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['crewActivity', playerData?.crew_id],
    queryFn: () => base44.entities.CrewActivity.filter(
      { crew_id: playerData.crew_id },
      '-created_date',
      3
    ),
    enabled: !!playerData?.crew_id,
    staleTime: 30000,
    gcTime: 60000,
    retry: 1
  });

  const crew = crewData?.[0];

  const handleJoinBattle = (battleId) => {
    window.location.href = createPageUrl('Territories');
  };

  const wantedStars = playerData?.wanted_level || 0;
  const levelProgress = ((playerData?.endgame_points || 0) % 1000) / 10;

  if (isLoadingPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your criminal empire...</p>
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-white text-lg">Unable to load player data. Please refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GameEngine playerData={playerData} />
      {/* Welcome Section */}
      <div className="glass-panel border border-purple-500/20 p-4 md:p-6 rounded-xl">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white mb-2">
              Welcome back, <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {playerData?.username || 'Rookie'}
              </span>
            </h1>
            <p className="text-sm md:text-base text-gray-400">Your criminal empire awaits</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Level {playerData?.level || 1}</p>
              <div className="flex gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 md:w-4 md:h-4 ${
                      i < wantedStars ? 'text-red-500 fill-red-500' : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs md:text-sm text-gray-400">{levelProgress.toFixed(0)}%</p>
              <p className="text-xs text-gray-500">to next level</p>
            </div>
          </div>
          <Progress value={levelProgress} className="h-2" />
        </div>
      </div>

      {/* Transparent Finance Section */}
      <LazyLoadWrapper fallbackText="Loading wallet...">
        <div className="grid grid-cols-1 gap-4">
          <TransparentWallet playerData={playerData} />
          <AutomatedIncomeWorkflows playerData={playerData} />
        </div>
      </LazyLoadWrapper>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
            <div className="grid grid-cols-2 gap-3 md:gap-4">
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
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-1 gap-3">
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
        <TabsList className="glass-panel border border-purple-500/20 w-full flex-wrap h-auto p-1">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="progression" className="text-xs md:text-sm">Progression</TabsTrigger>
          <TabsTrigger value="marketplace" className="text-xs md:text-sm">Market</TabsTrigger>
          <TabsTrigger value="investments" className="text-xs md:text-sm">Invest</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs md:text-sm">Contracts</TabsTrigger>
          <TabsTrigger value="broadcasts" className="text-xs md:text-sm">Events</TabsTrigger>
          <TabsTrigger value="economy" className="text-xs md:text-sm">Economy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            <div className="space-y-4 md:space-y-6">
              <ActiveBattles battles={battles} onJoinBattle={handleJoinBattle} />
              <ActiveHeists heists={activeHeists} />
            </div>
            <div className="space-y-4 md:space-y-6">
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
          <LazyLoadWrapper fallbackText="Loading AI Progression...">
            <AIProgressionAnalyzer 
              playerData={playerData} 
              onUpdate={refetchPlayer}
            />
          </LazyLoadWrapper>
        </TabsContent>

        <TabsContent value="marketplace">
          <LazyLoadWrapper fallbackText="Loading Marketplace...">
            <div className="space-y-4">
              <LiveMarketTracker playerData={playerData} />
              <PlayerMarketplace playerData={playerData} />
            </div>
          </LazyLoadWrapper>
        </TabsContent>

        <TabsContent value="investments">
          <LazyLoadWrapper fallbackText="Loading Investments...">
            <div className="space-y-4">
              <TransparentInvestmentSystem playerData={playerData} />
              <InvestmentPortfolio playerData={playerData} />
            </div>
          </LazyLoadWrapper>
        </TabsContent>

        <TabsContent value="contracts">
          <LazyLoadWrapper fallbackText="Loading Contracts...">
            <AIContractBoard playerData={playerData} />
          </LazyLoadWrapper>
        </TabsContent>

        <TabsContent value="broadcasts">
          <LazyLoadWrapper fallbackText="Loading Events...">
            <EventBroadcastSystem playerData={playerData} />
          </LazyLoadWrapper>
        </TabsContent>

        <TabsContent value="economy">
          <LazyLoadWrapper fallbackText="Loading Economy Dashboard...">
            <div className="space-y-4">
              <PlayerActionEventSystem playerData={playerData} />
              <EconomyDashboard playerData={playerData} />
            </div>
          </LazyLoadWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
}