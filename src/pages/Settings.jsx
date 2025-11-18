import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, LogOut } from 'lucide-react';

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">Account</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-400">Email</p>
            <p className="text-white font-semibold">{currentUser?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Name</p>
            <p className="text-white font-semibold">{currentUser?.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Role</p>
            <p className="text-white font-semibold capitalize">{currentUser?.role}</p>
          </div>
          
          <div className="pt-4 border-t border-purple-500/20">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}