import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, AlertTriangle, Info, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Notifications() {
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        base44.auth.me().then(setUser).catch(() => setUser(null));
    }, []);

    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['all-notifications', user?.email],
        queryFn: () => user ? base44.entities.Notification.filter({ user_email: user.email }, '-created_date') : [],
        enabled: !!user,
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const unread = notifications.filter(n => !n.is_read);
            await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const typeIcons = {
        critical_case: AlertTriangle,
        status_change: Info,
        new_evidence: FileText,
        new_note: FileText,
        assignment: Bell,
        deadline: Clock
    };

    const typeColors = {
        critical: "bg-red-500/20 text-red-300 border-red-500/30",
        high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        low: "bg-slate-500/20 text-slate-300 border-slate-500/30"
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading notifications...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-100 mb-2">Notifications</h1>
                            <p className="text-slate-400">
                                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                onClick={() => markAllAsReadMutation.mutate()}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Mark All Read
                            </Button>
                        )}
                    </div>
                </motion.div>

                {notifications.length === 0 ? (
                    <div className="text-center py-20">
                        <Bell className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-400 mb-2">No notifications yet</h3>
                        <p className="text-slate-500">You'll be notified about important case updates</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => {
                            const Icon = typeIcons[notification.type] || Bell;
                            return (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <Card className={`bg-slate-900/50 border-slate-700/50 hover:border-amber-500/30 transition-all ${
                                        !notification.is_read ? 'border-l-4 border-l-amber-500' : ''
                                    }`}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-lg ${
                                                    !notification.is_read ? 'bg-amber-500/20' : 'bg-slate-800/50'
                                                }`}>
                                                    <Icon className={`w-5 h-5 ${
                                                        !notification.is_read ? 'text-amber-500' : 'text-slate-400'
                                                    }`} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h3 className={`font-semibold ${
                                                            !notification.is_read ? 'text-slate-100' : 'text-slate-300'
                                                        }`}>
                                                            {notification.title}
                                                        </h3>
                                                        <Badge variant="outline" className={typeColors[notification.priority]}>
                                                            {notification.priority}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-slate-400 text-sm mb-3">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-slate-500">
                                                            {format(new Date(notification.created_date), 'MMM d, yyyy HH:mm')}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {notification.case_id && (
                                                                <Link to={createPageUrl(`CaseDetail?id=${notification.case_id}`)}>
                                                                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                                                        View Case
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                            {!notification.is_read && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => markAsReadMutation.mutate(notification.id)}
                                                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                                                >
                                                                    <Check className="w-3 h-3 mr-1" />
                                                                    Mark Read
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}