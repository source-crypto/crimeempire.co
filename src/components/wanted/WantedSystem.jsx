import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Star, Shield, AlertTriangle, Swords, DollarSign,
  Radio, Lock, Zap, Eye, TrendingDown, UserX
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Wanted Level Config ─────────────────────────────────────────────────────
export const WANTED_CONFIG = {
  0: { label: 'Clean',        color: 'text-green-400',  bgColor: 'bg-green-900/20',  border: 'border-green-500/30',  policeMultiplier: 1,   incomeBlock: false, description: 'No heat. Operate freely.' },
  1: { label: 'Known',        color: 'text-yellow-400', bgColor: 'bg-yellow-900/20', border: 'border-yellow-500/30', policeMultiplier: 1.5, incomeBlock: false, description: 'Local police taking notice. Minor surveillance.' },
  2: { label: 'Hunted',       color: 'text-orange-400', bgColor: 'bg-orange-900/20', border: 'border-orange-500/30', policeMultiplier: 2,   incomeBlock: false, description: 'Active warrants. Patrol units deployed.' },
  3: { label: 'Notorious',    color: 'text-red-400',    bgColor: 'bg-red-900/20',    border: 'border-red-500/30',    policeMultiplier: 3,   incomeBlock: true,  description: 'Task force activated. High-income districts blockaded.' },
  4: { label: 'Most Wanted',  color: 'text-red-500',    bgColor: 'bg-red-900/30',    border: 'border-red-600/50',    policeMultiplier: 4,   incomeBlock: true,  description: 'Federal attention. Bounty hunters deployed. Districts locked.' },
  5: { label: '⚠️ KINGPIN',   color: 'text-red-600',    bgColor: 'bg-red-950/50',    border: 'border-red-700/70',    policeMultiplier: 6,   incomeBlock: true,  description: 'Military-grade response. Maximum bounty. All operations compromised.' },
};

export const BLOCKED_DISTRICTS_AT = { 3: ['Financial Quarter', 'Downtown Core'], 4: ['Financial Quarter', 'Downtown Core', 'Tech Corridor', 'The Docks'], 5: ['Financial Quarter', 'Downtown Core', 'Tech Corridor', 'The Docks', 'Underground', 'Airport Strip'] };

// Actions that trigger wanted level increases
export const HEAT_ACTIONS = {
  territory_attack:     { heat: 20, wantedIncrease: 1, label: 'Territory Attack' },
  territory_capture:    { heat: 25, wantedIncrease: 1, label: 'Territory Capture' },
  large_smuggle:        { heat: 30, wantedIncrease: 1, label: 'Large Smuggling Op' },
  heist_completed:      { heat: 15, wantedIncrease: 1, label: 'Heist Completed' },
  contraband_purchase:  { heat: 10, wantedIncrease: 0, label: 'Contraband Purchase' },
  weapons_purchase:     { heat: 15, wantedIncrease: 1, label: 'Weapons Acquired' },
  auction_high_bid:     { heat: 5,  wantedIncrease: 0, label: 'High-Value Auction Bid' },
  pvp_attack:           { heat: 20, wantedIncrease: 1, label: 'PvP Attack' },
};

// Bounty Hunter NPC encounters by wanted level
const BOUNTY_HUNTERS = {
  3: [
    { name: 'Rex "The Tracker" Morgan', bounty: 50000,  strength: 45, payout: 8000,  description: 'Ex-cop turned bounty hunter. Knows the streets.' },
    { name: 'Sofia "Viper" Cruz',       bounty: 60000,  strength: 55, payout: 10000, description: 'Cartel enforcer. Fast and ruthless.' },
  ],
  4: [
    { name: 'Black Unit Squad',         bounty: 120000, strength: 75, payout: 20000, description: 'Private military contract team. Armed to the teeth.' },
    { name: 'The Cleaner',              bounty: 150000, strength: 80, payout: 25000, description: 'Government deniable asset. No record, no mercy.' },
  ],
  5: [
    { name: 'APEX Task Force',          bounty: 300000, strength: 95, payout: 50000, description: 'Elite federal kill squad. Priority target: YOU.' },
  ],
};

// Decay: wanted level decreases over time if player stays low-profile
const DECAY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour between decay ticks

function getWantedState() {
  try {
    const s = JSON.parse(localStorage.getItem('wanted_state') || '{}');
    return { level: s.level || 0, heat: s.heat || 0, lastDecay: s.lastDecay || Date.now(), activeBounty: s.activeBounty || null };
  } catch { return { level: 0, heat: 0, lastDecay: Date.now(), activeBounty: null }; }
}

function saveWantedState(s) { localStorage.setItem('wanted_state', JSON.stringify(s)); }

// ─── Hook: useWantedLevel ────────────────────────────────────────────────────
export function useWantedLevel() {
  const [state, setState] = useState(getWantedState);

  // Apply natural decay
  useEffect(() => {
    const check = () => {
      const current = getWantedState();
      const now = Date.now();
      if (current.level > 0 && now - current.lastDecay > DECAY_INTERVAL_MS) {
        const ticks = Math.floor((now - current.lastDecay) / DECAY_INTERVAL_MS);
        const newLevel = Math.max(0, current.level - ticks);
        const newHeat = Math.max(0, current.heat - ticks * 10);
        const updated = { ...current, level: newLevel, heat: newHeat, lastDecay: now };
        saveWantedState(updated);
        setState(updated);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerAction = useCallback((actionKey) => {
    const action = HEAT_ACTIONS[actionKey];
    if (!action) return;
    const current = getWantedState();
    const newHeat = Math.min(100, current.heat + action.heat);
    const newLevel = Math.min(5, current.level + action.wantedIncrease);
    const updated = { ...current, heat: newHeat, level: newLevel };
    saveWantedState(updated);
    setState(updated);
    return { newLevel, newHeat };
  }, []);

  const reduceWanted = useCallback((amount = 1) => {
    const current = getWantedState();
    const updated = { ...current, level: Math.max(0, current.level - amount), heat: Math.max(0, current.heat - 20) };
    saveWantedState(updated);
    setState(updated);
  }, []);

  const setActiveBounty = useCallback((bounty) => {
    const current = getWantedState();
    const updated = { ...current, activeBounty: bounty };
    saveWantedState(updated);
    setState(updated);
  }, []);

  return { ...state, triggerAction, reduceWanted, setActiveBounty, config: WANTED_CONFIG[state.level] };
}

// ─── WantedSystem Panel Component ───────────────────────────────────────────
export default function WantedSystem({ playerData }) {
  const queryClient = useQueryClient();
  const { level, heat, activeBounty, triggerAction, reduceWanted, setActiveBounty, config } = useWantedLevel();
  const [combatLog, setCombatLog] = useState([]);
  const [activeBountyHunter, setActiveBountyHunter] = useState(null);

  // Spawn bounty hunter encounter if wanted >= 3 and none active
  useEffect(() => {
    if (level >= 3 && !activeBounty && !activeBountyHunter) {
      const options = BOUNTY_HUNTERS[level] || BOUNTY_HUNTERS[3];
      const hunter = options[Math.floor(Math.random() * options.length)];
      setActiveBountyHunter(hunter);
      toast.error(`🎯 BOUNTY HUNTER SPOTTED: ${hunter.name} is hunting you!`, { duration: 6000 });
    }
  }, [level]);

  const bribeMutation = useMutation({
    mutationFn: async () => {
      const cost = level * 15000;
      if ((playerData?.crypto_balance || 0) < cost) throw new Error(`Need $${cost.toLocaleString()} to bribe officials`);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost,
        wanted_level: Math.max(0, level - 1)
      });
      reduceWanted(1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
      toast.success(`Officials bribed. Wanted Level reduced to ${Math.max(0, level - 1)}.`);
    },
    onError: err => toast.error(err.message)
  });

  const layLowMutation = useMutation({
    mutationFn: async () => {
      const cost = level * 8000;
      if ((playerData?.crypto_balance || 0) < cost) throw new Error(`Need $${cost.toLocaleString()} to lay low`);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost,
        wanted_level: Math.max(0, level - 2)
      });
      reduceWanted(2);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
      toast.success(`Went off-grid. Wanted Level -2. Stay quiet for a while.`);
    },
    onError: err => toast.error(err.message)
  });

  const fightBountyHunter = useMutation({
    mutationFn: async (hunter) => {
      const playerPower = (playerData?.strength_score || 10) + ((playerData?.skills?.combat || 0) * 8);
      const success = Math.random() * 100 < Math.max(20, Math.min(80, playerPower - hunter.strength + 40));
      if (success) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: (playerData?.crypto_balance || 0) + hunter.payout
        });
        reduceWanted(1);
      }
      setCombatLog(prev => [{
        hunter: hunter.name,
        success,
        payout: hunter.payout,
        time: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 4)]);
      setActiveBountyHunter(null);
      setActiveBounty(null);
      return { success, hunter };
    },
    onSuccess: ({ success, hunter }) => {
      queryClient.invalidateQueries(['player']);
      if (success) toast.success(`💀 Defeated ${hunter.name}! +$${hunter.payout.toLocaleString()} & Wanted -1`);
      else toast.error(`You were defeated by ${hunter.name}! Lay low immediately.`);
    },
    onError: err => toast.error(err.message)
  });

  const fleeBountyHunter = useMutation({
    mutationFn: async (hunter) => {
      const stealth = playerData?.skills?.stealth || 0;
      const success = Math.random() * 100 < 40 + stealth * 5;
      if (!success) {
        // Caught — pay fine
        const fine = hunter.bounty * 0.1;
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: Math.max(0, (playerData?.crypto_balance || 0) - fine)
        });
      }
      setActiveBountyHunter(null);
      setActiveBounty(null);
      return { success };
    },
    onSuccess: ({ success }) => {
      if (success) toast.success('Escaped! Bounty hunter lost your trail.');
      else toast.error('Failed to escape! Paid fine. Increase Stealth skill to run faster.');
    },
    onError: err => toast.error(err.message)
  });

  const blockedDistricts = BLOCKED_DISTRICTS_AT[level] || [];

  return (
    <div className="space-y-4">
      {/* Main Wanted Status Card */}
      <Card className={`glass-panel ${config.border} ${config.bgColor}`}>
        <CardHeader className="border-b border-white/10 pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Shield className={`w-6 h-6 ${config.color}`} />
                {level >= 4 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
              </div>
              <span className={`text-lg font-bold ${config.color}`}>WANTED LEVEL</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-5 h-5 md:w-6 md:h-6 transition-all ${
                  i <= level ? `${config.color} fill-current drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]` : 'text-gray-700'
                }`} />
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Badge className={`${level === 0 ? 'bg-green-700' : level <= 2 ? 'bg-yellow-700' : 'bg-red-700'} text-sm px-3 py-1`}>
              {config.label}
            </Badge>
            <span className="text-xs text-gray-400">{config.description}</span>
          </div>

          {/* Heat Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" />Global Heat</span>
              <span className={heat > 70 ? 'text-red-400' : heat > 40 ? 'text-orange-400' : 'text-green-400'}>{heat}%</span>
            </div>
            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  heat > 70 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                  heat > 40 ? 'bg-gradient-to-r from-orange-600 to-yellow-400' :
                  'bg-gradient-to-r from-green-700 to-green-400'
                }`}
                style={{ width: `${heat}%` }}
              />
              {heat > 85 && (
                <div className="absolute inset-0 bg-red-400/20 animate-pulse rounded-full" />
              )}
            </div>
          </div>

          {/* Consequences */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded-lg ${level >= 1 ? 'bg-yellow-900/30 border border-yellow-500/20' : 'bg-gray-900/30 border border-gray-700/20 opacity-40'}`}>
              <p className="text-gray-300 mb-0.5">👁️ Surveillance</p>
              <p className={level >= 1 ? 'text-yellow-400' : 'text-gray-500'}>{level >= 1 ? 'ACTIVE' : 'Inactive'}</p>
            </div>
            <div className={`p-2 rounded-lg ${level >= 2 ? 'bg-orange-900/30 border border-orange-500/20' : 'bg-gray-900/30 border border-gray-700/20 opacity-40'}`}>
              <p className="text-gray-300 mb-0.5">🚓 Patrols</p>
              <p className={level >= 2 ? 'text-orange-400' : 'text-gray-500'}>{level >= 2 ? `${WANTED_CONFIG[level].policeMultiplier}x spawn` : 'Normal'}</p>
            </div>
            <div className={`p-2 rounded-lg ${level >= 3 ? 'bg-red-900/30 border border-red-500/20' : 'bg-gray-900/30 border border-gray-700/20 opacity-40'}`}>
              <p className="text-gray-300 mb-0.5">🔒 Blockades</p>
              <p className={level >= 3 ? 'text-red-400' : 'text-gray-500'}>{level >= 3 ? `${blockedDistricts.length} districts` : 'None'}</p>
            </div>
            <div className={`p-2 rounded-lg ${level >= 3 ? 'bg-red-900/30 border border-red-500/20' : 'bg-gray-900/30 border border-gray-700/20 opacity-40'}`}>
              <p className="text-gray-300 mb-0.5">🎯 Bounty Hunters</p>
              <p className={level >= 3 ? 'text-red-400' : 'text-gray-500'}>{level >= 3 ? 'DEPLOYED' : 'None'}</p>
            </div>
          </div>

          {/* Blocked Districts */}
          {blockedDistricts.length > 0 && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30">
              <p className="text-red-300 text-xs font-semibold mb-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> DISTRICT BLOCKADES ACTIVE
              </p>
              <div className="flex flex-wrap gap-1">
                {blockedDistricts.map(d => (
                  <Badge key={d} className="bg-red-900 text-red-200 text-xs">{d}</Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Income from these districts reduced by 75%. Cannot claim/attack while blocked.</p>
            </div>
          )}

          {/* Active Bounty Hunter Encounter */}
          {activeBountyHunter && (
            <div className="p-4 rounded-xl bg-red-950/60 border-2 border-red-500/60 animate-pulse">
              <p className="text-red-300 font-bold text-sm mb-1 flex items-center gap-2">
                <UserX className="w-4 h-4" />🎯 BOUNTY HUNTER ENCOUNTER
              </p>
              <p className="text-white font-semibold">{activeBountyHunter.name}</p>
              <p className="text-xs text-gray-400 mb-2">{activeBountyHunter.description}</p>
              <div className="flex gap-2 text-xs text-gray-300 mb-3">
                <span>💀 Strength: {activeBountyHunter.strength}</span>
                <span>💰 Bounty: ${activeBountyHunter.bounty.toLocaleString()}</span>
                <span>🏆 Win Payout: ${activeBountyHunter.payout.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-red-700 to-orange-700 text-xs"
                  onClick={() => fightBountyHunter.mutate(activeBountyHunter)}
                  disabled={fightBountyHunter.isPending}
                >
                  <Swords className="w-3 h-3 mr-1" />Fight ({activeBountyHunter.payout.toLocaleString()})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 text-xs"
                  onClick={() => fleeBountyHunter.mutate(activeBountyHunter)}
                  disabled={fleeBountyHunter.isPending}
                >
                  🏃 Flee (Stealth check)
                </Button>
              </div>
            </div>
          )}

          {/* Clearance Options */}
          {level > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Clearance Options</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-700 to-indigo-700 text-xs"
                  onClick={() => bribeMutation.mutate()}
                  disabled={bribeMutation.isPending || !playerData}
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  Bribe (${(level * 15000).toLocaleString()})
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-gray-700 to-slate-700 text-xs"
                  onClick={() => layLowMutation.mutate()}
                  disabled={layLowMutation.isPending || !playerData}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Lay Low (${(level * 8000).toLocaleString()})
                </Button>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Wanted level also decays naturally over 1hr of inactivity
              </p>
            </div>
          )}

          {level === 0 && (
            <div className="text-center py-2 text-green-400 text-sm flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              You're off the grid. Keep it that way.
            </div>
          )}
        </CardContent>
      </Card>

      {/* What Raises Wanted */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20 pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            Actions That Raise Wanted Level
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {Object.entries(HEAT_ACTIONS).map(([key, action]) => (
              <div key={key} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/40">
                <span className="text-gray-300">{action.label}</span>
                <div className="flex gap-3">
                  <span className="text-orange-400">+{action.heat}% heat</span>
                  {action.wantedIncrease > 0 && <span className="text-red-400">+{action.wantedIncrease}⭐</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Combat Log */}
      {combatLog.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20 pb-2">
            <CardTitle className="text-white text-sm">Bounty Encounter Log</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1.5">
            {combatLog.map((log, i) => (
              <div key={i} className={`text-xs flex items-center justify-between p-1.5 rounded ${log.success ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <span className={log.success ? 'text-green-400' : 'text-red-400'}>
                  {log.success ? '💀 Defeated' : '💥 Lost to'} {log.hunter}
                </span>
                <span className="text-gray-500">{log.success ? `+$${log.payout.toLocaleString()}` : 'Fine paid'} • {log.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}