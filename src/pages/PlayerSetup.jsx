import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, User, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

export default function PlayerSetup() {
  const [currentUser, setCurrentUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Check if player exists
      const players = await base44.entities.Player.filter({ created_by: user.email });
      if (players[0]) {
        setPlayerData(players[0]);
        window.location.href = createPageUrl('Dashboard');
      }
    } catch (error) {
      console.log('User not authenticated');
    }
  };

  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      const newPlayer = await base44.entities.Player.create({
        username: username.trim(),
        crypto_balance: 50000,
        buy_power: 25000,
        endgame_points: 0,
        strength_score: 10,
        wanted_level: 0,
        level: 1,
        experience: 0,
        skill_points: 5,
        skills: {
          combat: 1,
          stealth: 1,
          driving: 1,
          hacking: 1,
          leadership: 1,
          negotiation: 1
        },
        territory_count: 0,
        total_earnings: 0,
        stats: {
          heists_completed: 0,
          heists_failed: 0,
          battles_won: 0,
          battles_lost: 0,
          territories_captured: 0,
          total_loot: 0
        },
        playstyle: 'balanced'
      });

      // Log initial transaction
      await base44.entities.TransactionLog.create({
        transaction_type: 'transfer',
        player_id: newPlayer.id,
        player_username: username,
        counterparty_name: 'System',
        amount: 50000,
        description: 'Initial player funding',
        status: 'completed'
      });

      toast.success('Player created successfully!');
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      toast.error('Failed to create player');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
        <Card className="glass-panel border-purple-500/20 w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to CrimeEmpire</h2>
            <p className="text-gray-400 mb-6">Please log in to continue</p>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => base44.auth.redirectToLogin(createPageUrl('PlayerSetup'))}
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4">
      <Card className="glass-panel border-purple-500/20 w-full max-w-md">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-6 h-6 text-purple-400" />
              Create Your Character
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <p className="text-gray-300 mb-2">Logged in as:</p>
            <p className="text-white font-semibold">{currentUser.email}</p>
          </div>

          <form onSubmit={handleCreatePlayer} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-gray-300">
                Choose Your Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 bg-slate-900/50 border-purple-500/20 text-white"
                disabled={loading}
              />
            </div>

            <div className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20">
              <h4 className="text-white font-semibold mb-2">Starting Package</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li>• $50,000 Crypto Balance</li>
                <li>• $25,000 Buy Power</li>
                <li>• Level 1 with 5 Skill Points</li>
                <li>• Basic Skills: Combat, Stealth, Driving</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
              disabled={loading || !username.trim()}
            >
              {loading ? 'Creating Character...' : 'Start Your Criminal Empire'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}