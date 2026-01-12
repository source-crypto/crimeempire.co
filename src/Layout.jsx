import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FolderOpen, TrendingUp, Shield, Search, Bell, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence } from "framer-motion";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";

export default function Layout({ children, currentPageName }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [user, setUser] = useState(null);

    React.useEffect(() => {
        base44.auth.me().then(u => setUser(u)).catch(() => {});
    }, []);

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', user?.email],
        queryFn: () => base44.entities.Notification.filter({ user_email: user.email }),
        enabled: !!user?.email,
        refetchInterval: 30000,
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const navItems = [
        { name: "Cases", icon: FolderOpen, path: "Cases" },
        { name: "Evidence Search", icon: Search, path: "EvidenceSearch" },
        { name: "Officer Performance", icon: TrendingUp, path: "OfficerPerformance" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 text-amber-500" />
                            <div>
                                <h1 className="text-xl font-bold text-slate-100">Crime Empire</h1>
                                <p className="text-xs text-slate-500">Case Management System</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentPageName === item.path;
                                    
                                    return (
                                        <Link
                                            key={item.path}
                                            to={createPageUrl(item.path)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                                isActive
                                                    ? 'bg-amber-600 text-white'
                                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="font-medium hidden lg:inline">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                            
                            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPreferences(true)}
                                    className="text-slate-400 hover:text-slate-100 relative"
                                >
                                    <SettingsIcon className="w-5 h-5" />
                                </Button>
                                
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowNotifications(true)}
                                    className="text-slate-400 hover:text-slate-100 relative"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            
            <main>
                {children}
            </main>

            <AnimatePresence>
                {showNotifications && user && (
                    <NotificationCenter 
                        onClose={() => setShowNotifications(false)}
                        userEmail={user.email}
                    />
                )}
                {showPreferences && user && (
                    <NotificationPreferences
                        onClose={() => setShowPreferences(false)}
                        userEmail={user.email}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}