import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  FolderOpen, 
  Search, 
  Bell, 
  BarChart3, 
  Settings, 
  Shield,
  Menu,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => user ? base44.entities.Notification.filter({ 
      user_email: user.email, 
      is_read: false 
    }) : [],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const navItems = [
    { name: "Dashboard", icon: BarChart3, page: "Dashboard" },
    { name: "Skills", icon: Shield, page: "Skills" },
    { name: "Syndicates", icon: FolderOpen, page: "Syndicates" },
    { name: "Trading", icon: Search, page: "Trading" },
    { name: "Notifications", icon: Bell, page: "Notifications", badge: notifications.length },
    { name: "Settings", icon: Settings, page: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-amber-500" />
              <div>
                <h1 className="text-xl font-bold text-slate-100">Crime Empire</h1>
                <p className="text-xs text-slate-400">Case Management System</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link key={item.page} to={createPageUrl(item.page)}>
                    <Button
                      variant="ghost"
                      className={`relative ${
                        isActive
                          ? "bg-amber-600/20 text-amber-400"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                      {item.badge > 0 && (
                        <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start relative ${
                        isActive
                          ? "bg-amber-600/20 text-amber-400"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                      {item.badge > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}