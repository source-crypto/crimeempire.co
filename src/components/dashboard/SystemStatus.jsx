import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Zap, TrendingUp, AlertTriangle, CheckCircle, Activity 
} from 'lucide-react';

export default function SystemStatus({ playerData, crew, enterprises }) {
  const systems = [
    {
      name: 'Battle System',
      status: 'active',
      icon: Shield,
      color: 'text-green-400',
      description: 'Real-time territory battles operational'
    },
    {
      name: 'Heist System',
      status: 'active',
      icon: Zap,
      color: 'text-purple-400',
      description: 'AI-driven heist execution ready'
    },
    {
      name: 'Enterprise System',
      status: enterprises?.length > 0 ? 'active' : 'inactive',
      icon: TrendingUp,
      color: enterprises?.length > 0 ? 'text-cyan-400' : 'text-gray-400',
      description: `${enterprises?.length || 0} operations running`
    },
    {
      name: 'Crew System',
      status: crew ? 'active' : 'inactive',
      icon: Activity,
      color: crew ? 'text-orange-400' : 'text-gray-400',
      description: crew ? `${crew.member_count} members` : 'No crew joined'
    }
  ];

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white">System Status</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {systems.map((system) => {
            const Icon = system.icon;
            return (
              <div
                key={system.name}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${system.color}`} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{system.name}</h4>
                    <p className="text-xs text-gray-400">{system.description}</p>
                  </div>
                </div>
                <Badge className={
                  system.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                }>
                  {system.status === 'active' ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  {system.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}