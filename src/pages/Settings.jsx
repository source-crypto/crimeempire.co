import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, LogOut, Mail, Lock, Shield, UserPlus, Clock, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }
    
    const domain = email.split('@')[1].toLowerCase();
    const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    
    return validDomains.includes(domain) || domain.includes('.');
  };

  const handleUpdateEmail = async () => {
    if (!validateEmail(newEmail)) {
      toast.error('Please enter a valid email address (Gmail, Yahoo, or other valid provider)');
      return;
    }

    try {
      // Base44 handles email updates through their auth system
      toast.info('To update your email, please use the account settings in your profile menu');
    } catch (error) {
      toast.error('Failed to update email');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // Base44 handles password updates through their auth system
      toast.info('To update your password, please use the account settings in your profile menu');
    } catch (error) {
      toast.error('Failed to update password');
    }
  };

  const handleInviteUser = () => {
    toast.info('Contact admin to invite new users to the platform');
  };

  const handleSaveLoginConfig = () => {
    localStorage.setItem('loginConfig', JSON.stringify({
      sessionTimeout,
      twoFactorEnabled,
      rememberDevice
    }));
    toast.success('Login configuration saved');
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-purple-400" />
              Account Information
            </CardTitle>
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

            <div className="pt-4 border-t border-purple-500/20 space-y-3">
              <div className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white font-medium">Login Status</p>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>• Session Timeout: {sessionTimeout} minutes</p>
                  <p>• 2FA: {twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                  <p>• Remember Device: {rememberDevice ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
              >
                <Shield className="w-4 h-4 mr-2" />
                Request Login Link
              </Button>

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

        <Card className="glass-panel border-cyan-500/20">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <Mail className="w-5 h-5 text-cyan-400" />
              Update Email
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail" className="text-white">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="your.email@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-slate-900/50 border-purple-500/30 text-white"
              />
              <p className="text-xs text-gray-400">Use Gmail, Yahoo, or any valid email</p>
            </div>
            <Button
              onClick={handleUpdateEmail}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Update Email
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="w-5 h-5 text-purple-400" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-900/50 border-purple-500/30 text-white"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-900/50 border-purple-500/30 text-white"
                minLength={6}
              />
            </div>
            <p className="text-xs text-gray-400">Minimum 6 characters</p>
            <Button
              onClick={handleUpdatePassword}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel border-orange-500/20">
          <CardHeader className="border-b border-orange-500/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-orange-400" />
              Login Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="sessionTimeout" className="text-white">Session Timeout</Label>
                <select
                  id="sessionTimeout"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full mt-2 bg-slate-900/50 border border-purple-500/30 text-white rounded-md px-3 py-2"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="480">8 hours</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Automatically logout after inactivity</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-purple-500/20">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-400">Extra security layer for login</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-purple-500/20">
                <div>
                  <p className="text-white font-medium">Remember This Device</p>
                  <p className="text-xs text-gray-400">Stay logged in on this device</p>
                </div>
                <Switch
                  checked={rememberDevice}
                  onCheckedChange={setRememberDevice}
                />
              </div>

              <div className="p-3 rounded-lg bg-orange-900/20 border border-orange-500/30">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Security Tips</p>
                    <ul className="text-xs text-gray-400 space-y-1 mt-1">
                      <li>• Use a strong, unique password</li>
                      <li>• Enable 2FA for maximum security</li>
                      <li>• Don't share login credentials</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveLoginConfig}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel border-green-500/20">
          <CardHeader className="border-b border-green-500/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5 text-green-400" />
              Invite New Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
              <p className="text-sm text-gray-300 mb-2">
                New users receive a welcome bonus:
              </p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• $50,000 Crypto Balance</li>
                <li>• $50,000 Buy Power</li>
                <li>• 50,000 Endgame Points</li>
              </ul>
            </div>
            <p className="text-sm text-gray-400">
              Share your empire with new players and grow your network in the criminal underworld.
            </p>
            <Button
              onClick={handleInviteUser}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite New Players
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}