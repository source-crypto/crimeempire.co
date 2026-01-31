import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, Shield, Map, Users, Building2, Truck, 
  Brain, Swords, TrendingUp, Crown, Package, Target,
  Zap, Gift
} from 'lucide-react';

export default function Tutorial() {
  const sections = [
    {
      icon: Gift,
      title: 'Welcome Bonus',
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30',
      content: [
        { label: 'Crypto Balance', value: '$50,000', description: 'Use for purchases, investments, and operations' },
        { label: 'Buy Power', value: '$50,000', description: 'Additional spending power for quick transactions' },
        { label: 'Endgame Points', value: '50,000', description: 'Reputation and influence in the underworld' }
      ]
    },
    {
      icon: Map,
      title: 'Crime Map',
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-500/30',
      content: [
        { label: 'Territories', description: 'Control zones that generate passive income and resources' },
        { label: 'Contraband Caches', description: 'Claim illegal goods scattered across the map for quick profits' },
        { label: 'Material Deposits', description: 'Extract resources needed for production and manufacturing' },
        { label: 'Law Enforcement', description: 'Avoid police patrols to minimize risk and wanted level' },
        { label: 'AI Route Optimizer', description: 'Get AI-suggested safest and most profitable smuggling routes' }
      ]
    },
    {
      icon: Users,
      title: 'Factions & Crews',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/30',
      content: [
        { label: 'Create or Join', description: 'Form factions with other players for shared power and territory' },
        { label: 'AI Diplomacy', description: 'AI negotiates alliances, rivalries, and trade agreements automatically' },
        { label: 'Ranks & Roles', description: 'Rise from Associate to Leader, unlock permissions and benefits' },
        { label: 'Shared Treasury', description: 'Pool resources with faction members for bigger operations' }
      ]
    },
    {
      icon: Building2,
      title: 'Enterprises & Outposts',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/20',
      borderColor: 'border-cyan-500/30',
      content: [
        { label: 'Criminal Enterprises', description: 'Build drug labs, weapon factories, and chop shops' },
        { label: 'Production Chains', description: 'Customize resource processing for maximum efficiency' },
        { label: 'AI Employee Management', description: 'Let AI handle wages, hiring, and workforce optimization' },
        { label: 'Territory Outposts', description: 'Fortify positions in your territories with specialized units' }
      ]
    },
    {
      icon: Truck,
      title: 'Smuggling & Supply Lines',
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      borderColor: 'border-orange-500/30',
      content: [
        { label: 'Supply Routes', description: 'Establish routes between territories to move resources' },
        { label: 'Smuggling Operations', description: 'Transport contraband for high profits with calculated risk' },
        { label: 'Route Efficiency', description: 'Optimize paths to avoid law enforcement and maximize profits' },
        { label: 'AI Contraband Manager', description: 'AI suggests best distribution and pricing strategies' }
      ]
    },
    {
      icon: Swords,
      title: 'Combat & Battles',
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-500/30',
      content: [
        { label: 'PvP Arena', description: 'Challenge other players to duels and prove your dominance' },
        { label: 'Territory Wars', description: 'Attack rival territories or defend your own in 24-hour battles' },
        { label: 'Combat Power', description: 'Build strength through skills, equipment, and crew support' },
        { label: 'Rewards', description: 'Win crypto, reputation, and territories from successful battles' }
      ]
    },
    {
      icon: Brain,
      title: 'AI Systems',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30',
      content: [
        { label: 'Mission Generator', description: 'AI creates dynamic missions based on current game state' },
        { label: 'Progression Analyzer', description: 'Get AI recommendations for skills, investments, and strategy' },
        { label: 'Diplomatic Advisor', description: 'AI suggests faction relationships and trade deals' },
        { label: 'Economic Simulation', description: 'Market prices and demand adjust dynamically via AI' }
      ]
    },
    {
      icon: TrendingUp,
      title: 'Earnings & Passive Income',
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30',
      content: [
        { label: 'Territory Revenue', description: 'Earn hourly income from controlled territories' },
        { label: 'Enterprise Production', description: 'Generate resources and products automatically' },
        { label: 'Daily Rewards', description: 'Claim increasing rewards for consecutive login streaks' },
        { label: 'Investments', description: 'Invest in ventures for long-term passive returns' }
      ]
    },
    {
      icon: Crown,
      title: 'Governance & Politics',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-500/30',
      content: [
        { label: 'Leadership Positions', description: 'Become President, Mayor, or Governor of territories' },
        { label: 'Policy Creation', description: 'Enact laws and policies that affect gameplay mechanics' },
        { label: 'Taxation & Laws', description: 'Control economic policies in your jurisdiction' },
        { label: 'Unlock Requirements', description: 'Achieve power, territory, and reputation milestones' }
      ]
    },
    {
      icon: Target,
      title: 'Progression & Skills',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/30',
      content: [
        { label: 'Level Up', description: 'Gain experience from missions, heists, and combat' },
        { label: 'Skill Points', description: 'Allocate points to Combat, Stealth, Driving, Hacking, and more' },
        { label: 'Playstyle Detection', description: 'AI analyzes your choices and suggests optimal builds' },
        { label: 'Reputation', description: 'Build endgame points for influence and special features' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel border-purple-500/30 p-6 rounded-xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          How Crime Empire Works
        </h1>
        <p className="text-gray-400">Complete guide to building your criminal empire</p>
      </div>

      {/* Welcome Bonus Highlight */}
      <Card className="glass-panel border-green-500/30 bg-green-900/10">
        <CardHeader className="border-b border-green-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Gift className="w-6 h-6 text-green-400" />
            Your Welcome Bonus
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-900/50 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Crypto Balance</span>
              </div>
              <p className="text-2xl font-bold text-green-400">$50,000</p>
              <p className="text-xs text-gray-400 mt-1">For purchases and investments</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900/50 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-gray-400">Buy Power</span>
              </div>
              <p className="text-2xl font-bold text-cyan-400">$50,000</p>
              <p className="text-xs text-gray-400 mt-1">Quick spending power</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900/50 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Endgame Points</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">50,000</p>
              <p className="text-xs text-gray-400 mt-1">Reputation & influence</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <Card key={idx} className={`glass-panel ${section.borderColor}`}>
              <CardHeader className={`border-b ${section.borderColor}`}>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Icon className={`w-5 h-5 ${section.color}`} />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {section.content.map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg ${section.bgColor} border ${section.borderColor}`}>
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-white text-sm">{item.label}</h4>
                        {item.value && (
                          <Badge className={section.bgColor}>
                            {item.value}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Start Tips */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">Quick Start Tips</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-xs">1</span>
              </div>
              <p className="text-gray-300">Visit the <strong className="text-purple-400">Crime Map</strong> to claim contraband caches and extract materials for quick profits</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-xs">2</span>
              </div>
              <p className="text-gray-300">Join or create a <strong className="text-cyan-400">Faction</strong> to access territories and collective power</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-xs">3</span>
              </div>
              <p className="text-gray-300">Build your first <strong className="text-green-400">Enterprise</strong> or <strong className="text-orange-400">Outpost</strong> to start generating passive income</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-xs">4</span>
              </div>
              <p className="text-gray-300">Use <strong className="text-blue-400">AI Systems</strong> to optimize your operations, routes, and strategy</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-xs">5</span>
              </div>
              <p className="text-gray-300">Allocate <strong className="text-yellow-400">Skill Points</strong> in the Dashboard to customize your playstyle</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}