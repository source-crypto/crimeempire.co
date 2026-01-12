import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FolderOpen, TrendingUp, Shield } from "lucide-react";

export default function Layout({ children, currentPageName }) {
    const navItems = [
        { name: "Cases", icon: FolderOpen, path: "Cases" },
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
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </nav>
            
            <main>
                {children}
            </main>
        </div>
    );
}