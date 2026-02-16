import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, TrendingUp, Building2, Map, Users, Zap, 
  CheckCircle2, ChevronRight, Target, Sparkles, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function GettingStarted() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const totalWealth = (playerData?.crypto_balance || 0) + (playerData?.buy_power || 0);
  const progressToMillion = Math.min((totalWealth / 1000000) * 100, 100);
  const wealthTier = totalWealth >= 1000000 ? 'millionaire' : 
                     totalWealth >= 500000 ? 'high_roller' :
                     totalWealth >= 100000 ? 'established' :
                     totalWealth >= 10000 ? 'rising' : 'beginner';

  const methods = [
    {
      id: 'enterprises',
      title: 'Criminal Enterprises',
      description: 'Build illegal businesses that generate passive income 24/7',
      potential: '$50K - $200K/week',
      difficulty: 'Medium',
      time: '2-4 hours setup',
      icon: Building2,
      page: 'Enterprises',
      steps: [
        'Navigate to Enterprises page',
        'Create your first enterprise (marijuana farm recommended)',
        'Upgrade production and security',
        'Collect and sell produced goods',
        'Expand with multiple enterprises'
      ],
      tips: [
        'Start with low-heat enterprises',
        'Invest in security early',
        'Balance production vs storage capacity',
        'Hire NPCs to boost efficiency'
      ]
    },
    {
      id: 'trading',
      title: 'Black Market Trading',
      description: 'Buy low, sell high on the dark web marketplace',
      potential: '$10K - $100K/trade',
      difficulty: 'Easy',
      time: '15-30 minutes',
      icon: Zap,
      page: 'BlackMarket',
      steps: [
        'Check AI Dynamic Pricing for market trends',
        'Buy items when prices are low',
        'Monitor demand scores (>70% = good sell time)',
        'Sell when volatility creates price spikes',
        'Reinvest profits for compound growth'
      ],
      tips: [
        'Watch for AI-predicted bullish trends',
        'High volatility = high profit potential',
        'Diversify your inventory',
        'Use market intelligence reports'
      ]
    },
    {
      id: 'territories',
      title: 'Territory Control',
      description: 'Capture and tax territories for recurring income',
      potential: '$20K - $150K/week',
      difficulty: 'Hard',
      time: '1-3 hours',
      icon: Map,
      page: 'Territories',
      steps: [
        'Join or create a crew for backup',
        'Scout weak territories with low defense',
        'Challenge territory owners to battles',
        'Win battles using combat skills',
        'Collect taxes and develop territories'
      ],
      tips: [
        'Upgrade combat skills first',
        'Form alliances before major battles',
        'Defend your territories actively',
        'Invest tax income back into defense'
      ]
    },
    {
      id: 'investments',
      title: 'Strategic Investments',
      description: 'Use AI predictions to make smart financial moves',
      potential: '$5K - $80K/month',
      difficulty: 'Easy',
      time: '10 minutes',
      icon: TrendingUp,
      page: 'Dashboard',
      steps: [
        'Open Dashboard → Investments tab',
        'Check AI Investment Predictions',
        'Review macro economic trends',
        'Invest based on high-confidence predictions',
        'Wait for returns and reinvest'
      ],
      tips: [
        'Diversify investment types',
        'Follow macro economic events',
        'Higher risk = higher returns',
        'Compound your returns'
      ]
    },
    {
      id: 'heists',
      title: 'High-Stakes Heists',
      description: 'Plan and execute elaborate criminal operations',
      potential: '$100K - $500K/heist',
      difficulty: 'Very Hard',
      time: '2-6 hours',
      icon: Target,
      page: 'Heists',
      steps: [
        'Recruit skilled crew members',
        'Scout targets for vulnerabilities',
        'Plan heist strategy and roles',
        'Execute with precision timing',
        'Launder the stolen money'
      ],
      tips: [
        'Success rate depends on crew skills',
        'Better planning = higher success',
        'Manage wanted level carefully',
        'Split loot fairly to keep crew loyal'
      ]
    },
    {
      id: 'laundering',
      title: 'Money Laundering',
      description: 'Convert dirty money into clean legitimate funds',
      potential: '$15K - $100K/operation',
      difficulty: 'Medium',
      time: '30 minutes - 2 hours',
      icon: DollarSign,
      page: 'MoneyLaundering',
      steps: [
        'Create legitimate business fronts',
        'Run laundering missions',
        'Manage risk vs reward',
        'Trade accessories for efficiency boosts',
        'Expand your laundering network'
      ],
      tips: [
        'Lower risk = slower but safer',
        'Upgrade your businesses regularly',
        'Use currency marketplace wisely',
        'Track analytics to optimize'
      ]
    },
    {
      id: 'factions',
      title: 'Faction Alliances',
      description: 'Join powerful factions for exclusive benefits and missions',
      potential: '$30K - $120K/week',
      difficulty: 'Medium',
      time: 'Ongoing',
      icon: Users,
      page: 'Factions',
      steps: [
        'Build reputation with factions',
        'Complete faction quests',
        'Rise through faction ranks',
        'Access exclusive faction resources',
        'Participate in faction wars'
      ],
      tips: [
        'Choose faction that matches your playstyle',
        'Complete daily quests for rep',
        'Faction wars offer huge rewards',
        'Higher rank = better benefits'
      ]
    }
  ];

  const quickWins = [
    { action: 'Complete starter missions', reward: '$5,000', time: '10 min' },
    { action: 'Sell starting inventory', reward: '$2,500', time: '5 min' },
    { action: 'First investment (low risk)', reward: '$500/day', time: '5 min' },
    { action: 'Create first enterprise', reward: '$1,000/hour', time: '20 min' },
    { action: 'Join a crew', reward: '$3,000 bonus', time: '15 min' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-slate-900/50 via-cyan-900/20 to-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 mb-2 flex items-center gap-2">
              <Target className="w-8 h-8" />
              Path to Your First Million
            </h1>
            <p className="text-gray-400">Master these methods to build your criminal empire</p>
          </div>
          <Badge className={
            wealthTier === 'millionaire' ? 'bg-yellow-600 text-lg px-4 py-2' :
            wealthTier === 'high_roller' ? 'bg-purple-600 text-lg px-4 py-2' :
            wealthTier === 'established' ? 'bg-blue-600 text-lg px-4 py-2' :
            wealthTier === 'rising' ? 'bg-green-600 px-3 py-1' :
            'bg-gray-600 px-3 py-1'
          }>
            {wealthTier === 'millionaire' ? '🏆 Millionaire' :
             wealthTier === 'high_roller' ? '💎 High Roller' :
             wealthTier === 'established' ? '⭐ Established' :
             wealthTier === 'rising' ? '📈 Rising' : '🎯 Beginner'}
          </Badge>
        </div>
      </Card>

      {/* Progress */}
      {playerData && totalWealth < 1000000 && (
        <Card className="glass-panel border-yellow-500/20">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Progress to $1M</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    ${totalWealth.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Remaining</p>
                  <p className="text-xl font-bold text-white">
                    ${(1000000 - totalWealth).toLocaleString()}
                  </p>
                </div>
              </div>
              <Progress value={progressToMillion} className="h-3" />
              <p className="text-xs text-gray-500 text-center">
                {progressToMillion.toFixed(1)}% complete
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Wins */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-400" />
            Quick Wins (Day 1)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {quickWins.map((win, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">{win.action}</p>
                    <p className="text-xs text-gray-400">{win.time}</p>
                  </div>
                </div>
                <Badge className="bg-green-600">{win.reward}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <Card key={method.id} className="glass-panel border-purple-500/20 hover:border-purple-500/40 transition-all">
              <CardHeader className="border-b border-purple-500/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 rounded-lg">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{method.title}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1">{method.description}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-900/50 rounded">
                    <p className="text-xs text-gray-400">Potential</p>
                    <p className="text-sm font-bold text-green-400">{method.potential}</p>
                  </div>
                  <div className="p-2 bg-slate-900/50 rounded">
                    <p className="text-xs text-gray-400">Difficulty</p>
                    <Badge className={
                      method.difficulty === 'Easy' ? 'bg-green-600' :
                      method.difficulty === 'Medium' ? 'bg-yellow-600' :
                      method.difficulty === 'Hard' ? 'bg-orange-600' : 'bg-red-600'
                    }>
                      {method.difficulty}
                    </Badge>
                  </div>
                  <div className="p-2 bg-slate-900/50 rounded">
                    <p className="text-xs text-gray-400">Time</p>
                    <p className="text-sm font-semibold text-cyan-400">{method.time}</p>
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <p className="text-sm font-semibold text-white mb-2">How to Start:</p>
                  <div className="space-y-1">
                    {method.steps.slice(0, 3).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-purple-400 font-bold">{idx + 1}.</span>
                        <span className="text-gray-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">💡 Pro Tips:</p>
                  <ul className="space-y-1">
                    {method.tips.slice(0, 2).map((tip, idx) => (
                      <li key={idx} className="text-xs text-gray-400">• {tip}</li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <Link to={createPageUrl(method.page)}>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                    Start Now
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Strategy Tips */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader className="border-b border-cyan-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Optimal Strategy Path
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600">Week 1</Badge>
              <div>
                <p className="text-white font-medium">Foundation ($0 → $50K)</p>
                <p className="text-sm text-gray-400">Focus: Quick wins + First enterprise + Start investing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-600">Week 2-3</Badge>
              <div>
                <p className="text-white font-medium">Growth ($50K → $250K)</p>
                <p className="text-sm text-gray-400">Focus: Multiple enterprises + Black market trading + Join faction</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-orange-600">Week 4-6</Badge>
              <div>
                <p className="text-white font-medium">Expansion ($250K → $750K)</p>
                <p className="text-sm text-gray-400">Focus: Territory control + Heists + Advanced investments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-yellow-600">Week 7+</Badge>
              <div>
                <p className="text-white font-medium">Millionaire ($750K → $1M+)</p>
                <p className="text-sm text-gray-400">Focus: Empire consolidation + Faction wars + Money laundering network</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}