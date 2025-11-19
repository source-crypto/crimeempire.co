import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Map, Building2, Car, Users, Gavel, Target 
} from 'lucide-react';
import { createPageUrl } from '../../utils';

export default function QuickActions() {
  const actions = [
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
      title: 'Crew',
      description: 'Manage members',
      icon: Users,
      color: 'from-orange-600 to-yellow-600',
      page: 'Crew'
    },
    {
      title: 'Steal Vehicle',
      description: 'High-value targets',
      icon: Car,
      color: 'from-cyan-600 to-blue-600',
      page: 'Garage'
    },
    {
      title: 'Auction',
      description: 'Trade assets',
      icon: Gavel,
      color: 'from-yellow-600 to-green-600',
      page: 'Auction'
    }
  ];

  return (
    <Card className="glass-panel border border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}