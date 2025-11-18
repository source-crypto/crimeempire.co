import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Map, Building2, Car, Users, Gavel, Zap 
} from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function QuickActions() {
  const actions = [
    {
      title: 'Conquer Territory',
      description: 'Expand your empire',
      icon: Map,
      color: 'from-red-600 to-orange-600',
      page: 'Territories'
    },
    {
      title: 'Manage Operations',
      description: 'Criminal enterprises',
      icon: Building2,
      color: 'from-purple-600 to-pink-600',
      page: 'Enterprises'
    },
    {
      title: 'Steal Vehicle',
      description: 'High-value targets',
      icon: Car,
      color: 'from-cyan-600 to-blue-600',
      page: 'Garage'
    },
    {
      title: 'Recruit Members',
      description: 'Grow your crew',
      icon: Users,
      color: 'from-green-600 to-emerald-600',
      page: 'Crew'
    },
    {
      title: 'Auction House',
      description: 'Buy & sell assets',
      icon: Gavel,
      color: 'from-yellow-600 to-orange-600',
      page: 'Auction'
    },
    {
      title: 'Boost Stats',
      description: 'Level up abilities',
      icon: Zap,
      color: 'from-indigo-600 to-purple-600',
      page: 'Dashboard'
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