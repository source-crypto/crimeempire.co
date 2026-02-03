import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Map, Building2, Car, Users, Gavel, Target, 
  Code, Zap, Brain, Package, DollarSign, Shield
} from 'lucide-react';
import { createPageUrl } from '../../utils';

export default function QuickActions() {
  const [activeTab, setActiveTab] = useState('frontend');

  const frontendActions = [
    {
      title: 'Plan Heist',
      description: 'AI-powered operations',
      icon: Target,
      color: 'from-red-600 to-orange-600',
      page: 'Heists'
    },
    {
      title: 'Attack Territory',
      description: 'Expand control',
      icon: Map,
      color: 'from-green-600 to-emerald-600',
      page: 'Territories'
    },
    {
      title: 'New Enterprise',
      description: 'Start business',
      icon: Building2,
      color: 'from-purple-600 to-pink-600',
      page: 'Enterprises'
    },
    {
      title: 'Manage Crew',
      description: 'Team operations',
      icon: Users,
      color: 'from-orange-600 to-yellow-600',
      page: 'Crew'
    },
    {
      title: 'Black Market',
      description: 'Trade contraband',
      icon: Gavel,
      color: 'from-yellow-600 to-green-600',
      page: 'BlackMarket'
    },
    {
      title: 'Items Center',
      description: 'Manage inventory',
      icon: Package,
      color: 'from-cyan-600 to-blue-600',
      page: 'ItemsCenter'
    }
  ];

  const backendActions = [
    {
      title: 'AI Systems',
      description: 'Configure AI agents',
      icon: Brain,
      color: 'from-purple-600 to-indigo-600',
      page: 'AIManagement'
    },
    {
      title: 'Base Defense',
      description: 'Security systems',
      icon: Shield,
      color: 'from-red-600 to-pink-600',
      page: 'BaseManagement'
    },
    {
      title: 'Money Laundering',
      description: 'Clean operations',
      icon: DollarSign,
      color: 'from-green-600 to-emerald-600',
      page: 'MoneyLaundering'
    },
    {
      title: 'Supply Chains',
      description: 'Route optimization',
      icon: Zap,
      color: 'from-cyan-600 to-blue-600',
      page: 'Enterprises'
    },
    {
      title: 'Faction Wars',
      description: 'Strategic conflicts',
      icon: Users,
      color: 'from-orange-600 to-red-600',
      page: 'Factions'
    },
    {
      title: 'Combat Arena',
      description: 'PvP battles',
      icon: Target,
      color: 'from-yellow-600 to-orange-600',
      page: 'Combat'
    }
  ];

  const configActions = [
    {
      title: 'Player Setup',
      description: 'Character config',
      icon: Users,
      color: 'from-blue-600 to-cyan-600',
      page: 'PlayerManagement'
    },
    {
      title: 'Settings',
      description: 'App preferences',
      icon: Code,
      color: 'from-gray-600 to-slate-600',
      page: 'Settings'
    },
    {
      title: 'Strategy AI',
      description: 'Game intelligence',
      icon: Brain,
      color: 'from-purple-600 to-pink-600',
      page: 'Strategy'
    },
    {
      title: 'Tutorial',
      description: 'Learn the game',
      icon: Zap,
      color: 'from-green-600 to-emerald-600',
      page: 'Tutorial'
    },
    {
      title: 'Governance',
      description: 'Empire control',
      icon: Shield,
      color: 'from-indigo-600 to-purple-600',
      page: 'Governance'
    },
    {
      title: 'Metaverse',
      description: '3D crime world',
      icon: Map,
      color: 'from-cyan-600 to-teal-600',
      page: 'Metaverse'
    }
  ];

  const renderActionGrid = (actions) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.title}
            variant="outline"
            className="h-auto flex-col items-start p-4 glass-panel border-purple-500/20 hover:border-purple-500/40 hover:scale-105 transition-all"
            onClick={() => window.location.href = createPageUrl(action.page)}
          >
            <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} mb-2`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-white text-sm">{action.title}</span>
            <span className="text-xs text-gray-400 mt-1">{action.description}</span>
          </Button>
        );
      })}
    </div>
  );

  return (
    <Card className="glass-panel border border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass-panel border-purple-500/20 mb-4 w-full">
            <TabsTrigger value="frontend" className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              Frontend
            </TabsTrigger>
            <TabsTrigger value="backend" className="flex-1">
              <Code className="w-4 h-4 mr-2" />
              Backend
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-1">
              <Shield className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="frontend">
            {renderActionGrid(frontendActions)}
          </TabsContent>

          <TabsContent value="backend">
            {renderActionGrid(backendActions)}
          </TabsContent>

          <TabsContent value="config">
            {renderActionGrid(configActions)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}