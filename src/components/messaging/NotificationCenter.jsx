import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, TrendingUp, Shield, Users, Building2, 
  Zap, Target, Package, Award, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../../utils';

export default function NotificationCenter({ playerData }) {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', playerData.id],
    queryFn: () => base44.entities.Notification.filter({ player_id: playerData.id }),
    refetchInterval: 10000,
    select: (data) => data.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    )
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      for (const notif of unread) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
      toast.success('All notifications marked as read');
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    }
  });

  const getNotificationIcon = (type) => {
    const icons = {
      market_change: TrendingUp,
      territory_attack: Shield,
      investment_update: TrendingUp,
      crew_invitation: Users,
      battle_result: Target,
      heist_opportunity: Zap,
      enterprise_alert: Building2,
      message_received: Bell,
      resource_ready: Package,
      auction_won: Award
    };
    return icons[type] || Bell;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'border-red-500/50 bg-red-900/20',
      high: 'border-orange-500/50 bg-orange-900/20',
      medium: 'border-yellow-500/50 bg-yellow-900/20',
      low: 'border-blue-500/50 bg-blue-900/20'
    };
    return colors[priority] || colors.medium;
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.notification_type === filter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-purple-600' : 'border-purple-500/30'}
              >
                All ({notifications.length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
                className={filter === 'unread' ? 'bg-purple-600' : 'border-purple-500/30'}
              >
                Unread ({notifications.filter(n => !n.is_read).length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'market_change' ? 'default' : 'outline'}
                onClick={() => setFilter('market_change')}
                className={filter === 'market_change' ? 'bg-purple-600' : 'border-purple-500/30'}
              >
                Market
              </Button>
              <Button
                size="sm"
                variant={filter === 'territory_attack' ? 'default' : 'outline'}
                onClick={() => setFilter('territory_attack')}
                className={filter === 'territory_attack' ? 'bg-purple-600' : 'border-purple-500/30'}
              >
                Territory
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || notifications.filter(n => !n.is_read).length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark All Read
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="glass-panel border-purple-500/20">
              <CardContent className="p-12 text-center">
                <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.notification_type);
              const isUnread = !notification.is_read;

              return (
                <Card
                  key={notification.id}
                  className={`glass-panel border ${getPriorityColor(notification.priority)} ${
                    isUnread ? 'border-l-4' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notification.priority === 'critical' ? 'bg-red-600/20' :
                        notification.priority === 'high' ? 'bg-orange-600/20' :
                        notification.priority === 'medium' ? 'bg-yellow-600/20' :
                        'bg-blue-600/20'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-white flex items-center gap-2">
                              {notification.title}
                              {isUnread && (
                                <Badge className="bg-red-600 text-xs">New</Badge>
                              )}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.created_date).toLocaleString()}
                            </p>
                          </div>
                          <Badge className={`text-xs ${
                            notification.priority === 'critical' ? 'bg-red-600' :
                            notification.priority === 'high' ? 'bg-orange-600' :
                            notification.priority === 'medium' ? 'bg-yellow-600' :
                            'bg-blue-600'
                          }`}>
                            {notification.priority}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-300 mt-2">{notification.message}</p>

                        <div className="flex gap-2 mt-3">
                          {notification.action_url && (
                            <Button
                              size="sm"
                              onClick={() => window.location.href = createPageUrl(notification.action_url)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              View Details
                            </Button>
                          )}
                          {isUnread && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              className="border-green-500/30 text-green-400"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            className="border-red-500/30 text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}