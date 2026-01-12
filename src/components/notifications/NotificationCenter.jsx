import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Check, AlertTriangle, Info, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationCenter({ onClose, userEmail }) {
    const queryClient = useQueryClient();

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', userEmail],
        queryFn: () => base44.entities.Notification.filter({ user_email: userEmail }, '-created_date'),
        enabled: !!userEmail,
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const unreadNotifications = notifications.filter(n => !n.is_read);
            await Promise.all(unreadNotifications.map(n => 
                base44.entities.Notification.update(n.id, { is_read: true })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const typeIcons = {
        case_update: Info,
        deadline: Clock,
        assignment: Bell,
        evidence_added: Info,
        critical: AlertTriangle
    };

    const typeColors = {
        case_update: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        deadline: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        assignment: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        evidence_added: "bg-green-500/20 text-green-300 border-green-500/30",
        critical: "bg-red-500/20 text-red-300 border-red-500/30"
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
                <Card className="bg-slate-900 border-slate-700">
                    <CardHeader className="border-b border-slate-700">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Bell className="w-6 h-6 text-amber-500" />
                                <div>
                                    <CardTitle className="text-2xl text-slate-100">Notifications</CardTitle>
                                    {unreadCount > 0 && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => markAllAsReadMutation.mutate()}
                                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        Mark all read
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="text-center py-12">
                                <Bell className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500">No notifications yet</p>
                            </div>
                        ) : (
                            <div>
                                {notifications.map((notification) => {
                                    const Icon = typeIcons[notification.type] || Info;
                                    return (
                                        <motion.div
                                            key={notification.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`border-b border-slate-800 p-4 hover:bg-slate-800/50 transition-colors ${
                                                !notification.is_read ? 'bg-slate-800/30' : ''
                                            }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`p-2 rounded-lg h-fit ${
                                                    notification.priority === 'critical' ? 'bg-red-500/20' : 'bg-slate-800'
                                                }`}>
                                                    <Icon className={`w-5 h-5 ${
                                                        notification.priority === 'critical' ? 'text-red-400' : 'text-amber-500'
                                                    }`} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-1">
                                                        <h4 className="font-medium text-slate-100">{notification.title}</h4>
                                                        {!notification.is_read && (
                                                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                                                New
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-400 mb-2">{notification.message}</p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={typeColors[notification.type]}>
                                                                {notification.type.replace('_', ' ')}
                                                            </Badge>
                                                            <span className="text-xs text-slate-600">
                                                                {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {notification.case_id && (
                                                                <Link to={createPageUrl(`CaseDetail?id=${notification.case_id}`)}>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={onClose}
                                                                        className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                                                                    >
                                                                        View Case
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                            {!notification.is_read && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => markAsReadMutation.mutate(notification.id)}
                                                                    className="text-slate-400 hover:text-slate-100 text-xs"
                                                                >
                                                                    <Check className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}