import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { 
        Home, Map, Users, Building2, Car, Gavel, 
        Settings, Menu, X, Zap, Shield, Crown, BookOpen, DollarSign, User, Brain, Package, MessageCircle, Activity, TrendingUp, ChevronDown, Target
      } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WantedHUD from './components/wanted/WantedHUD';
import NotificationBell from './components/notifications/NotificationBell';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import DailyStreakReward from './components/dailyreward/DailyStreakReward';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [playerForUI, setPlayerForUI] = useState(null);

  React.useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        const players = await base44.entities.Player.filter({ created_by: user.email });
        const p = players[0];
        if (p) {
          setPlayerForUI(p);
          const today = new Date().toDateString();
          const onboardingDone = localStorage.getItem('onboarding_done');
          const streakChecked = sessionStorage.getItem('streak_checked_' + today);
          if (!onboardingDone && !p.username) setShowOnboarding(true);
          if (!streakChecked) { sessionStorage.setItem('streak_checked_' + today, '1'); setShowStreak(true); }
        }
      } catch (e) { /* not logged in */ }
    };
    init();
  }, []);

  const mainNavigation = [
    { name: 'Dashboard', page: 'Dashboard', icon: Home },
    { name: 'Messages', page: 'Messages', icon: MessageCircle },
    { name: 'Player', page: 'PlayerManagement', icon: User },
    { name: 'Strategy', page: 'Strategy', icon: Brain },
    { name: 'Crime Map', page: 'CrimeMap', icon: Map },
    { name: 'Factions', page: 'Factions', icon: Users },
    { name: 'Territories', page: 'Territories', icon: Map },
    { name: 'Enterprises', page: 'Enterprises', icon: Building2 },
  ];

  const moreNavigation = [
    { name: 'Getting Started', page: 'GettingStarted', icon: BookOpen },
    { name: 'Game Guide', page: 'GameDocumentation', icon: BookOpen },
    { name: 'Investigations', page: 'Investigations', icon: Shield },
    { name: 'Combat', page: 'Combat', icon: Shield },
    { name: 'Trading', page: 'Trading', icon: Gavel },
    { name: 'P2P Trading', page: 'P2PTrading', icon: Gavel },
    { name: 'Black Market', page: 'BlackMarket', icon: Zap },
    { name: 'Money Laundering', page: 'MoneyLaundering', icon: DollarSign },
    { name: 'Base Management', page: 'BaseManagement', icon: Building2 },
    { name: 'AI Systems', page: 'AIManagement', icon: Zap },
    { name: 'Items Center', page: 'ItemsCenter', icon: Package },
    { name: 'Macro Economics', page: 'MacroEconomics', icon: TrendingUp },
    { name: 'Performance', page: 'Performance', icon: Activity },
    { name: 'Metaverse', page: 'Metaverse', icon: Zap },
    { name: 'Earnings', page: 'Earnings', icon: Bell },
    { name: 'Reputation', page: 'Reputation', icon: Crown },
    { name: 'Syndicates', page: 'Syndicates', icon: Users },
    { name: 'Governance', page: 'Governance', icon: Crown },
    { name: 'Embassy', page: 'Embassy', icon: Users },
    { name: 'Fleet Management', page: 'FleetManagement', icon: Building2 },
    { name: 'Currency Exchange', page: 'CurrencyExchange', icon: DollarSign },
    { name: 'Contract Hits', page: 'ContractHits', icon: Shield },
    { name: 'Enforcement Center', page: 'EnforcementCenter', icon: Shield },
    { name: 'Commodity Market', page: 'CommodityMarket', icon: TrendingUp },
    { name: 'Territory Control', page: 'TerritoryControl', icon: Map },
    { name: 'World Events', page: 'WorldEvents', icon: Zap },
    { name: 'Street Combat', page: 'DirectCombat', icon: Shield },
    { name: 'Leaderboard', page: 'SeasonalLeaderboard', icon: Crown },
  ];

  const allNavigation = [...mainNavigation, ...moreNavigation];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <style>{`
        :root {
          --cyber-purple: #9333EA;
          --cyber-cyan: #06B6D4;
          --danger-red: #DC2626;
          --neon-glow: 0 0 20px rgba(147, 51, 234, 0.5);
        }
        
        .neon-border {
          box-shadow: 0 0 10px rgba(147, 51, 234, 0.3),
                      inset 0 0 10px rgba(147, 51, 234, 0.1);
        }
        
        .glass-panel {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(147, 51, 234, 0.2);
        }
      `}</style>

      {/* Top Navigation */}
      <nav className="glass-panel border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center neon-border">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                CrimeEmpire
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {mainNavigation.map((item) => {
                const isActive = currentPageName === item.page;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                      isActive
                        ? 'bg-purple-600/30 text-purple-300 neon-border'
                        : 'text-gray-400 hover:text-purple-300 hover:bg-purple-900/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              
              {/* More Menu */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                    moreNavigation.some(item => item.page === currentPageName)
                      ? 'bg-purple-600/30 text-purple-300 neon-border'
                      : 'text-gray-400 hover:text-purple-300 hover:bg-purple-900/20'
                  }`}
                >
                  <Menu className="w-4 h-4" />
                  <span className="font-medium">More</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-panel border border-purple-500/30 rounded-lg shadow-lg z-50">
                    <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
                      {moreNavigation.map((item) => {
                        const isActive = currentPageName === item.page;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.page}
                            to={createPageUrl(item.page)}
                            onClick={() => setMoreMenuOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                              isActive
                                ? 'bg-purple-600/30 text-purple-300'
                                : 'text-gray-400 hover:text-purple-300 hover:bg-purple-900/20'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <WantedHUD compact />
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-purple-300"
                onClick={() => window.location.href = createPageUrl('Settings')}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-gray-400"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-500/20 glass-panel">
            <div className="px-4 py-4 space-y-2 max-h-96 overflow-y-auto">
              {allNavigation.map((item) => {
                const isActive = currentPageName === item.page;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-purple-600/30 text-purple-300'
                        : 'text-gray-400 hover:bg-purple-900/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {showOnboarding && <OnboardingFlow onClose={() => { setShowOnboarding(false); localStorage.setItem('onboarding_done', '1'); }} />}
      {showStreak && playerForUI && <DailyStreakReward playerData={playerForUI} onClose={() => setShowStreak(false)} />}

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-purple-500/20 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>© 2024 CrimeEmpire. Build your criminal legacy.</p>
        </div>
      </footer>
    </div>
  );
}