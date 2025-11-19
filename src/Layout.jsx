import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { 
  Home, Map, Users, Building2, Car, Gavel, 
  Settings, Menu, X, Zap, Shield, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', page: 'Dashboard', icon: Home },
    { name: 'Metaverse', page: 'Metaverse', icon: Zap },
    { name: 'Territories', page: 'Territories', icon: Map },
    { name: 'Crew', page: 'Crew', icon: Users },
    { name: 'Enterprises', page: 'Enterprises', icon: Building2 },
    { name: 'Garage', page: 'Garage', icon: Car },
    { name: 'Auction', page: 'Auction', icon: Gavel },
  ];

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
              {navigation.map((item) => {
                const isActive = currentPageName === item.page;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
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
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-purple-300"
              >
                <Bell className="w-5 h-5" />
              </Button>
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
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
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