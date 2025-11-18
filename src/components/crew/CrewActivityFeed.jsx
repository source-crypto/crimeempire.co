import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Trophy, Users, TrendingUp, TrendingDown,
  AlertTriangle, DollarSign, Link as LinkIcon, Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const activityIcons = {
  territory_captured: MapPin,
  territory_lost: AlertTriangle,
  heist_completed: Trophy,
  member_joined: Users,
  member_left: Users,
  member_promoted: TrendingUp,
  supply_line_created: LinkIcon,
  supply_line_disrupted: AlertTriangle,
  major_payout: DollarSign,
  battle_won: Shield,
  battle_lost: TrendingDown
};

const activityColors = {
  territory_captured: 'text-green-400 bg-green-900/20',
  territory_lost: 'text-red-400 bg-red-900/20',
  heist_completed: 'text-yellow-400 bg-yellow-900/20',
  member_joined: 'text-cyan-400 bg-cyan-900/20',
  member_left: 'text-gray-400 bg-gray-900/20',
  member_promoted: 'text-purple-400 bg-purple-900/20',
  supply_line_created: 'text-blue-400 bg-blue-900/20',
  supply_line_disrupted: 'text-orange-400 bg-orange-900/20',
  major_payout: 'text-green-400 bg-green-900/20',
  battle_won: 'text-cyan-400 bg-cyan-900/20',
  battle_lost: 'text-red-400 bg-red-900/20'
};

export default function CrewActivityFeed({ crewId }) {
  const { data: activities = [] } = useQuery({
    queryKey: ['crewActivities', crewId],
    queryFn: () => base44.entities.CrewActivity.filter({ crew_id: crewId }, '-created_date', 50),
    refetchInterval: 5000,
    enabled: !!crewId
  });

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white text-lg">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No recent activity</p>
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = activityIcons[activity.activity_type] || Trophy;
              const colorClass = activityColors[activity.activity_type] || 'text-gray-400 bg-gray-900/20';

              return (
                <div
                  key={activity.id}
                  className="flex gap-3 p-3 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors border border-purple-500/10"
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-white text-sm">{activity.title}</h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{activity.description}</p>
                    {activity.value && (
                      <Badge className="mt-2 bg-green-900/30 text-green-400">
                        +${activity.value.toLocaleString()}
                      </Badge>
                    )}
                    {activity.player_username && (
                      <span className="text-xs text-purple-400 mt-1 block">
                        by {activity.player_username}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}