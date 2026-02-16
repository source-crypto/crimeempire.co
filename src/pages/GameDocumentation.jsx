import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  BookOpen, Search, Building2, Map, Users, Zap, Shield, 
  DollarSign, TrendingUp, Brain, Package, Gavel, Target,
  AlertCircle, CheckCircle, Info
} from 'lucide-react';

export default function GameDocumentation() {
  const [searchQuery, setSearchQuery] = useState('');

  const systems = [
    {
      id: 'enterprises',
      name: 'Criminal Enterprises',
      icon: Building2,
      category: 'economy',
      description: 'Build and manage illegal businesses for passive income generation',
      intent: 'Provide players with sustainable income streams through business management',
      purpose: 'Create strategic depth through resource management, risk assessment, and growth planning',
      features: [
        'Multiple enterprise types (farms, chop shops, counterfeiting)',
        'Production chains and inventory management',
        'NPC hiring and management',
        'Security and heat level mechanics',
        'Research and upgrade systems',
        'Supply chain optimization'
      ],
      howItWorks: [
        'Create an enterprise by choosing a type and location',
        'Enterprises produce goods passively over time',
        'Higher production = higher heat from law enforcement',
        'Hire NPCs to boost efficiency and reduce risk',
        'Sell produced goods on black market or trade with players',
        'Upgrade facilities to increase capacity and speed'
      ],
      tips: [
        'Balance production rate with security level',
        'Diversify enterprise types to spread risk',
        'Invest in NPCs early for compound growth',
        'Monitor heat levels to avoid raids'
      ]
    },
    {
      id: 'territories',
      name: 'Territory Control',
      icon: Map,
      category: 'pvp',
      description: 'Capture, defend, and develop territories for strategic advantage',
      intent: 'Enable competitive gameplay through territorial conquest and defense',
      purpose: 'Create dynamic PvP interactions, resource control, and crew coordination challenges',
      features: [
        'Territory capture through battles',
        'Tax collection from controlled areas',
        'Territory development and upgrades',
        'Supply lines between territories',
        'Outpost construction',
        'Influence actions and diplomacy'
      ],
      howItWorks: [
        'Challenge territory owners to initiate battles',
        'Win battles using combat skills and crew support',
        'Collect taxes periodically from owned territories',
        'Develop territories to increase income',
        'Defend against challenges from other players',
        'Form alliances to protect territory networks'
      ],
      tips: [
        'Join a strong crew before capturing territories',
        'Develop territories immediately after capture',
        'Place supply lines strategically',
        'Respond quickly to defense challenges'
      ]
    },
    {
      id: 'blackmarket',
      name: 'Black Market Trading',
      icon: Zap,
      category: 'economy',
      description: 'Dark web marketplace for illegal goods and contraband',
      intent: 'Provide dynamic trading opportunities with AI-driven pricing',
      purpose: 'Create market-driven gameplay with speculation, arbitrage, and risk management',
      features: [
        'AI dynamic pricing based on supply/demand',
        'Market trend analysis',
        'Contraband smuggling routes',
        'Predictive pricing algorithms',
        'Real-time price fluctuations',
        'Trade history and analytics'
      ],
      howItWorks: [
        'AI analyzes macro conditions to set prices',
        'Buy items when demand is low (low prices)',
        'Sell when demand spikes (high prices)',
        'Monitor volatility for profit opportunities',
        'Use market intelligence to predict trends',
        'Smuggle contraband between territories'
      ],
      tips: [
        'Check AI predictions before trading',
        'High volatility = high profit potential',
        'Diversify inventory to reduce risk',
        'Track price history for patterns'
      ]
    },
    {
      id: 'investments',
      name: 'Investment System',
      icon: TrendingUp,
      category: 'economy',
      description: 'Strategic investment opportunities with AI-driven predictions',
      intent: 'Provide passive income and wealth growth through smart financial decisions',
      purpose: 'Integrate macroeconomic simulation with player decisions for realistic economic gameplay',
      features: [
        'Multiple investment types (crypto, real estate, enterprises)',
        'AI predictive analysis based on macro trends',
        'Risk/reward calculations',
        'ROI tracking and transparency',
        'Investment portfolios',
        'Macro economic event impacts'
      ],
      howItWorks: [
        'AI generates predictions based on macro data',
        'Choose investments based on risk tolerance',
        'Investments generate returns over time',
        'Economic events affect performance',
        'Track transparent metrics (expected vs actual)',
        'Liquidate at optimal times for profit'
      ],
      tips: [
        'Follow AI predictions with high confidence',
        'Diversify across investment types',
        'Monitor macro economic events',
        'Compound returns by reinvesting'
      ]
    },
    {
      id: 'factions',
      name: 'Factions & Alliances',
      icon: Users,
      category: 'social',
      description: 'Join powerful criminal organizations for exclusive benefits',
      intent: 'Foster community and cooperation through faction membership',
      purpose: 'Create large-scale conflicts, diplomatic gameplay, and long-term player engagement',
      features: [
        'Multiple factions with unique ideologies',
        'Reputation system and rank progression',
        'Faction quests and missions',
        'Faction wars with territory stakes',
        'Diplomatic relations between factions',
        'Exclusive faction resources and NPCs'
      ],
      howItWorks: [
        'Build reputation by completing faction quests',
        'Gain ranks to unlock better benefits',
        'Participate in faction wars for rewards',
        'Access faction-exclusive resources',
        'Influence faction diplomacy decisions',
        'Coordinate with faction members'
      ],
      tips: [
        'Choose faction matching your playstyle',
        'Complete daily quests for steady rep gain',
        'Participate in wars for huge rewards',
        'Coordinate with faction leadership'
      ]
    },
    {
      id: 'combat',
      name: 'Combat System',
      icon: Shield,
      category: 'pvp',
      description: 'Skill-based combat with character progression',
      intent: 'Provide engaging player vs player and player vs environment combat',
      purpose: 'Balance skill, equipment, and character builds for strategic combat encounters',
      features: [
        'Skill-based combat mechanics',
        'Equipment and loadout systems',
        'Combat skills and perks',
        'PvP arenas and battles',
        'Territory battle system',
        'Combat AI for NPCs'
      ],
      howItWorks: [
        'Upgrade combat skills using skill points',
        'Equip weapons and armor for stat bonuses',
        'Unlock perks for special abilities',
        'Engage in PvP battles for rewards',
        'Use strategic positioning and timing',
        'Build character around combat style'
      ],
      tips: [
        'Balance offense and defense stats',
        'Upgrade equipment regularly',
        'Learn enemy patterns in PvE',
        'Practice in lower-stakes battles first'
      ]
    },
    {
      id: 'heists',
      name: 'Heist System',
      icon: Target,
      category: 'missions',
      description: 'Plan and execute complex multi-stage criminal operations',
      intent: 'Provide high-risk, high-reward cooperative gameplay',
      purpose: 'Create strategic planning depth and crew coordination challenges',
      features: [
        'Multi-stage heist planning',
        'Crew role assignments',
        'Target scouting and intel gathering',
        'Dynamic difficulty based on planning',
        'Multiple approach options',
        'Heist scenario variations'
      ],
      howItWorks: [
        'Scout targets to gather intelligence',
        'Plan approach and assign crew roles',
        'Execute heist in stages',
        'Adapt to complications during execution',
        'Success depends on crew skills and planning',
        'Launder stolen money to secure profits'
      ],
      tips: [
        'Invest time in thorough planning',
        'Recruit skilled crew members',
        'Have backup plans ready',
        'Manage wanted level after heist'
      ]
    },
    {
      id: 'laundering',
      name: 'Money Laundering',
      icon: DollarSign,
      category: 'economy',
      description: 'Convert illegal funds into legitimate clean money',
      intent: 'Add realism and strategic depth to wealth management',
      purpose: 'Create risk/reward gameplay around cleaning dirty money',
      features: [
        'Legitimate business fronts',
        'Laundering missions with risk levels',
        'Currency exchange marketplace',
        'Accessory trading for efficiency',
        'Business expansion system',
        'Risk management analytics'
      ],
      howItWorks: [
        'Create business fronts to launder through',
        'Run laundering missions (higher risk = faster)',
        'Manage risk vs speed tradeoffs',
        'Upgrade businesses to increase capacity',
        'Trade accessories for efficiency bonuses',
        'Track analytics to optimize operations'
      ],
      tips: [
        'Start with low-risk operations',
        'Upgrade businesses consistently',
        'Balance multiple laundering fronts',
        'Use analytics to find bottlenecks'
      ]
    },
    {
      id: 'ai',
      name: 'AI Systems',
      icon: Brain,
      category: 'features',
      description: 'Comprehensive AI-driven gameplay features',
      intent: 'Create dynamic, responsive game world using artificial intelligence',
      purpose: 'Provide personalized experiences, strategic advice, and realistic NPC behaviors',
      features: [
        'AI strategic advisor for personalized tips',
        'Dynamic pricing algorithms',
        'Investment prediction models',
        'Economic event generation',
        'NPC behavior simulation',
        'Law enforcement response AI',
        'Mission generation',
        'Playstyle analysis'
      ],
      howItWorks: [
        'AI analyzes player behavior and stats',
        'Generates personalized recommendations',
        'Simulates realistic market conditions',
        'Creates random but contextual events',
        'Adjusts game difficulty dynamically',
        'Provides strategic insights and warnings'
      ],
      tips: [
        'Check AI advisor regularly for tips',
        'Follow high-confidence predictions',
        'Adapt strategy based on AI insights',
        'Use AI analysis to improve playstyle'
      ]
    },
    {
      id: 'macro',
      name: 'Macro Economics',
      icon: TrendingUp,
      category: 'economy',
      description: 'Real-world inspired economic simulation affecting gameplay',
      intent: 'Integrate realistic economic principles into game mechanics',
      purpose: 'Create meaningful economic depth that affects all game systems',
      features: [
        'Interest rate tracking (ECB, Fed)',
        'Inflation and monetary policy impacts',
        'Economic event generation',
        'Market crash probabilities',
        'Credit cost adjustments',
        'Territory value fluctuations',
        'Enterprise profit modifiers'
      ],
      howItWorks: [
        'System tracks real-world economic indicators',
        'AI generates events based on macro conditions',
        'Events directly impact game mechanics',
        'Players adapt strategies to conditions',
        'Economic cycles create opportunities',
        'Long-term planning becomes valuable'
      ],
      tips: [
        'Monitor macro dashboard regularly',
        'Adjust strategy during events',
        'Use favorable conditions to expand',
        'Hedge against economic downturns'
      ]
    },
    {
      id: 'trading',
      name: 'P2P Trading',
      icon: Gavel,
      category: 'social',
      description: 'Peer-to-peer trading system for items and services',
      intent: 'Enable player-driven economy and direct transactions',
      purpose: 'Create trust-based trading mechanics and player interdependence',
      features: [
        'Direct trade proposals',
        'Multi-asset trades (items, currency, services)',
        'Trade history tracking',
        'Reputation system for traders',
        'Secure trade execution',
        'Trading notifications'
      ],
      howItWorks: [
        'Create trade offers specifying items/currency',
        'Send proposals to other players',
        'Negotiate terms through messaging',
        'Both parties review and accept/reject',
        'System executes trade atomically',
        'Build trading reputation over time'
      ],
      tips: [
        'Start with small trades to build trust',
        'Verify player reputation before big deals',
        'Be clear about trade terms',
        'Use messaging to negotiate fairly'
      ]
    },
    {
      id: 'base',
      name: 'Base Management',
      icon: Building2,
      category: 'features',
      description: 'Build and customize your criminal headquarters',
      intent: 'Provide personalization and strategic base building',
      purpose: 'Create defensive gameplay and resource management depth',
      features: [
        'Customizable base layout',
        'Multiple facility types',
        'Security and defense systems',
        'NPC facility managers',
        'Law enforcement raid defense',
        'Facility upgrades',
        '3D base visualization'
      ],
      howItWorks: [
        'Design base layout on grid system',
        'Build facilities for different functions',
        'Assign NPCs to manage facilities',
        'Upgrade security to prevent raids',
        'Defend against LE raids actively',
        'Optimize layout for efficiency'
      ],
      tips: [
        'Prioritize security facilities early',
        'Place high-value facilities deep inside',
        'Hire quality facility managers',
        'Upgrade consistently for best defense'
      ]
    }
  ];

  const filteredSystems = systems.filter(system => 
    system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    system.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    system.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = {
    economy: { name: 'Economy', icon: DollarSign, color: 'green' },
    pvp: { name: 'PvP & Combat', icon: Shield, color: 'red' },
    social: { name: 'Social', icon: Users, color: 'blue' },
    missions: { name: 'Missions', icon: Target, color: 'purple' },
    features: { name: 'Features', icon: Zap, color: 'yellow' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-blue-500/30 bg-gradient-to-r from-slate-900/50 via-blue-900/20 to-slate-900/50 p-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Game Documentation</h1>
            <p className="text-gray-400">Complete guide to all game systems and mechanics</p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search systems, features, or mechanics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-purple-500/20 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSystems.map((system) => {
          const Icon = system.icon;
          const category = categories[system.category];
          const CategoryIcon = category.icon;

          return (
            <Card key={system.id} className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 bg-${category.color}-600/20 rounded-lg`}>
                      <Icon className={`w-6 h-6 text-${category.color}-400`} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{system.name}</CardTitle>
                      <Badge className={`bg-${category.color}-600 mt-1`}>
                        <CategoryIcon className="w-3 h-3 mr-1" />
                        {category.name}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Tabs defaultValue="overview" className="space-y-3">
                  <TabsList className="glass-panel w-full grid grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="howto">How To</TabsTrigger>
                    <TabsTrigger value="tips">Tips</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-300 mb-3">{system.description}</p>
                      
                      <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-blue-400 text-xs">Intent</p>
                            <p className="text-gray-300">{system.intent}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/20 space-y-2 mt-2">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-purple-400 text-xs">Purpose</p>
                            <p className="text-gray-300">{system.purpose}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-white mb-2">Key Features:</p>
                      <div className="space-y-1">
                        {system.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="howto" className="space-y-2 text-sm">
                    <p className="font-semibold text-white mb-2">Step-by-Step Guide:</p>
                    {system.howItWorks.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 bg-slate-900/50 rounded">
                        <Badge className="bg-cyan-600">{idx + 1}</Badge>
                        <span className="text-gray-300">{step}</span>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="tips" className="space-y-2 text-sm">
                    <p className="font-semibold text-white mb-2">Pro Tips:</p>
                    {system.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-900/20 rounded border border-yellow-500/20">
                        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{tip}</span>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}