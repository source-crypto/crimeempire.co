import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, Search, AlertTriangle, Eye, Zap, 
  DollarSign, Building2, Users, Target, Activity, Lock
} from 'lucide-react';
import { toast } from 'sonner';

const HEAT_CONFIG = [
  { min: 0, max: 0, label: 'Clean', color: 'text-green-400', bg: 'bg-green-900/20', badge: 'bg-green-700' },
  { min: 1, max: 1, label: 'Known', color: 'text-yellow-400', bg: 'bg-yellow-900/20', badge: 'bg-yellow-700' },
  { min: 2, max: 2, label: 'Hunted', color: 'text-orange-400', bg: 'bg-orange-900/20', badge: 'bg-orange-700' },
  { min: 3, max: 3, label: 'Notorious', color: 'text-red-400', bg: 'bg-red-900/20', badge: 'bg-red-700' },
  { min: 4, max: 5, label: 'CRITICAL', color: 'text-red-600', bg: 'bg-red-950/40', badge: 'bg-red-900' },
];

const RAID_TYPES = [
  { value: 'quick_strike', label: 'Quick Strike', cost: 5000, force: 30, successBase: 35, desc: 'Low prep — element of surprise', icon: '⚡' },
  { value: 'tactical', label: 'Tactical Raid', cost: 15000, force: 65, successBase: 60, desc: 'Balanced operation', icon: '🪖' },
  { value: 'full_operation', label: 'Full Operation', cost: 40000, force: 95, successBase: 85, desc: 'Maximum force — high cost', icon: '🚁' },
];

function heatInfo(level) {
  return HEAT_CONFIG.find(c => level >= c.min && level <= c.max) || HEAT_CONFIG[0];
}

export default function EnforcementCenter() {
  const queryClient = useQueryClient();
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedRaidType, setSelectedRaidType] = useState('tactical');
  const [searchTerm, setSearchTerm] = useState('');
  const [liveLog, setLiveLog] = useState([]);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const p = await base44.entities.Player.filter({ created_by: user.email }); return p[0]; },
    enabled: !!user
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list('-wanted_level', 50),
    refetchInterval: 10000
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['allEnterprises'],
    queryFn: () => base44.entities.CriminalEnterprise.list('-heat_level', 30),
    refetchInterval: 15000
  });

  const { data: raidHistory = [] } = useQuery({
    queryKey: ['raidHistory'],
    queryFn: () => base44.entities.RaidHistory.list('-created_date', 20),
    refetchInterval: 10000
  });

  // Real-time subscription for live activity log
  useEffect(() => {
    const unsub = base44.entities.Player.subscribe((event) => {
      if (event.type === 'update' && event.data?.wanted_level > 0) {
        setLiveLog(prev => [{
          id: event.id,
          message: `🔥 ${event.data.username} heat updated → Level ${event.data.wanted_level}`,
          ts: new Date().toLocaleTimeString(),
          level: event.data.wanted_level
        }, ...prev.slice(0, 19)]);
      }
    });
    return unsub;
  }, []);

  const targetEnterprises = enterprises.filter(e => e.owner_id === selectedTarget?.id);
  const raidSpec = RAID_TYPES.find(r => r.value === selectedRaidType);

  const launchRaid = useMutation({
    mutationFn: async () => {
      if (!selectedTarget) throw new Error('Select a target first');
      if ((playerData?.buy_power || 0) < raidSpec.cost) throw new Error(`Insufficient funds — need $${raidSpec.cost.toLocaleString()}`);

      const defenseRating = selectedTarget.strength_score || 10;
      const successChance = Math.max(5, raidSpec.successBase - defenseRating * 0.5);
      const success = Math.random() * 100 < successChance;

      let assetsSeized = 0;
      if (success) {
        assetsSeized = Math.floor((selectedTarget.crypto_balance || 0) * 0.3);
        await base44.entities.Player.update(selectedTarget.id, {
          crypto_balance: Math.max(0, (selectedTarget.crypto_balance || 0) - assetsSeized),
          wanted_level: 0,
        });
        await base44.entities.Player.update(playerData.id, {
          buy_power: (playerData.buy_power || 0) - raidSpec.cost + assetsSeized,
          endgame_points: (playerData.endgame_points || 0) + 500,
        });
      } else {
        await base44.entities.Player.update(playerData.id, {
          buy_power: (playerData.buy_power || 0) - raidSpec.cost,
        });
        await base44.entities.Player.update(selectedTarget.id, {
          endgame_points: (selectedTarget.endgame_points || 0) + 200,
        });
      }

      await base44.entities.RaidHistory.create({
        target_player_id: selectedTarget.id,
        target_username: selectedTarget.username,
        raider_player_id: playerData.id,
        raid_type: selectedRaidType,
        status: success ? 'success' : 'failed',
        assets_seized: assetsSeized,
        defense_rating: defenseRating,
        police_force: raidSpec.force,
        outcome_notes: success ? `Seized $${assetsSeized.toLocaleString()} — operations shut down` : 'Target repelled the raid — criminal notoriety increased',
        executed_at: new Date().toISOString()
      });

      return { success, assetsSeized };
    },
    onSuccess: ({ success, assetsSeized }) => {
      if (success) toast.success(`✅ Raid successful! $${assetsSeized.toLocaleString()} seized.`);
      else toast.error('❌ Raid failed — target defenses held.');
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message)
  });

  const freezeAssets = useMutation({
    mutationFn: async () => {
      if (!selectedTarget) throw new Error('Select a target first');
      const frozen = Math.floor((selectedTarget.crypto_balance || 0) * 0.5);
      await base44.entities.Player.update(selectedTarget.id, {
        crypto_balance: (selectedTarget.crypto_balance || 0) - frozen,
        wanted_level: Math.max(0, (selectedTarget.wanted_level || 0) - 1)
      });
      await base44.entities.RaidHistory.create({
        target_player_id: selectedTarget.id,
        target_username: selectedTarget.username,
        raider_player_id: playerData.id,
        raid_type: 'quick_strike',
        status: 'success',
        assets_seized: frozen,
        outcome_notes: 'Assets frozen by financial authorities',
        executed_at: new Date().toISOString()
      });
      return frozen;
    },
    onSuccess: (frozen) => { toast.success(`🔒 $${frozen.toLocaleString()} frozen!`); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(e.message)
  });

  const filteredPlayers = allPlayers.filter(p =>
    p.id !== playerData?.id &&
    (p.username?.toLowerCase().includes(searchTerm.toLowerCase()) || searchTerm === '')
  ).sort((a, b) => (b.wanted_level || 0) - (a.wanted_level || 0));

  const criticalPlayers = filteredPlayers.filter(p => (p.wanted_level || 0) >= 3);

  if (!playerData) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-blue-500/30 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" /> Enforcement Command Center
          </h1>
          <p className="text-gray-400 mt-1">Real-time criminal intelligence — monitor, investigate, raid</p>
        </div>
        <div className="flex gap-4 text-center">
          <div><p className="text-xs text-gray-400">Critical Targets</p><p className="text-2xl font-bold text-red-400">{criticalPlayers.length}</p></div>
          <div><p className="text-xs text-gray-400">Raids Today</p><p className="text-2xl font-bold text-blue-400">{raidHistory.filter(r => r.raider_player_id === playerData.id).length}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heat Monitor */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-panel border border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" />Heat Monitor Grid</span>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search player..."
                  className="bg-slate-800 border border-gray-600 text-white rounded px-3 py-1 text-sm w-40" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredPlayers.map(p => {
                  const hi = heatInfo(p.wanted_level || 0);
                  const isSelected = selectedTarget?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => setSelectedTarget(isSelected ? null : p)}
                      className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-800/50 transition-all text-left ${isSelected ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'} ${hi.bg}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${(p.wanted_level || 0) >= 3 ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="text-white font-semibold text-sm">{p.username}</p>
                          <p className="text-xs text-gray-400">Lvl {p.level} · {p.crew_role || 'Solo'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <p className="text-gray-400">Strength</p>
                          <p className="text-white">{p.strength_score || 0}</p>
                        </div>
                        <Badge className={hi.badge}>{hi.label} ★{p.wanted_level || 0}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Raid History */}
          <Card className="glass-panel border border-purple-500/20">
            <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Target className="w-4 h-4" />Recent Operations</CardTitle></CardHeader>
            <CardContent className="p-0">
              {raidHistory.slice(0, 8).map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2 border-b border-gray-800/40 text-sm">
                  <div>
                    <p className="text-white">{r.target_username}</p>
                    <p className="text-xs text-gray-400">{r.raid_type?.replace('_', ' ')} · {r.outcome_notes?.slice(0, 40)}...</p>
                  </div>
                  <div className="text-right">
                    <Badge className={r.status === 'success' ? 'bg-green-700' : 'bg-red-700'}>{r.status}</Badge>
                    {r.assets_seized > 0 && <p className="text-xs text-green-400 mt-1">+${r.assets_seized.toLocaleString()}</p>}
                  </div>
                </div>
              ))}
              {raidHistory.length === 0 && <p className="text-gray-500 text-center py-6 text-sm">No operations on record.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Live Feed */}
          <Card className="glass-panel border border-cyan-500/20">
            <CardHeader><CardTitle className="text-cyan-400 text-sm flex items-center gap-2"><Activity className="w-4 h-4 animate-pulse" />Live Activity Feed</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-1 max-h-40 overflow-y-auto">
              {liveLog.length === 0 ? <p className="text-gray-500 text-xs">Monitoring... activity will appear here in real-time.</p> : (
                liveLog.map((log, i) => (
                  <div key={i} className="text-xs flex justify-between">
                    <span className={log.level >= 3 ? 'text-red-400' : 'text-gray-300'}>{log.message}</span>
                    <span className="text-gray-600 ml-2 flex-shrink-0">{log.ts}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Target Analysis */}
          {selectedTarget ? (
            <>
              <Card className="glass-panel border border-yellow-500/30">
                <CardHeader><CardTitle className="text-yellow-400 text-sm flex items-center gap-2"><Eye className="w-4 h-4" />Target Analysis: {selectedTarget.username}</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Crypto Balance</span><span className="text-white">${(selectedTarget.crypto_balance || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Cash</span><span className="text-white">${(selectedTarget.buy_power || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Strength</span><span className="text-white">{selectedTarget.strength_score || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Territories</span><span className="text-white">{selectedTarget.territory_count || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Enterprises</span><span className="text-white">{targetEnterprises.length}</span></div>
                  <div>
                    <p className="text-gray-400 mb-1">Heat Level</p>
                    <Progress value={(selectedTarget.wanted_level || 0) * 20} className="h-2" />
                  </div>
                  {targetEnterprises.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-gray-400 text-xs font-semibold">Known Enterprises:</p>
                      {targetEnterprises.slice(0, 3).map(e => (
                        <p key={e.id} className="text-xs text-red-300">• {e.name} ({e.type?.replace(/_/g, ' ')})</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Raid Panel */}
              <Card className="glass-panel border border-red-500/30">
                <CardHeader><CardTitle className="text-red-400 text-sm">Raid Control</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {RAID_TYPES.map(r => (
                      <button key={r.value} onClick={() => setSelectedRaidType(r.value)}
                        className={`w-full p-2 rounded border text-left text-sm transition-all ${selectedRaidType === r.value ? 'border-red-500 bg-red-900/20' : 'border-gray-700 hover:border-red-500/40'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-white">{r.icon} {r.label}</span>
                          <span className="text-red-400 text-xs">${r.cost.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-400">{r.desc} · {r.successBase}% base success</p>
                      </button>
                    ))}
                  </div>
                  <Button className="w-full bg-red-700 hover:bg-red-600" onClick={() => launchRaid.mutate()} disabled={launchRaid.isPending}>
                    🚨 {launchRaid.isPending ? 'Launching...' : 'Launch Raid'}
                  </Button>
                  <Button className="w-full bg-slate-700 hover:bg-slate-600 text-sm" onClick={() => freezeAssets.mutate()} disabled={freezeAssets.isPending}>
                    <Lock className="w-4 h-4 mr-2" />{freezeAssets.isPending ? 'Freezing...' : 'Freeze Assets (50%)'}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-panel border border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                <Search className="w-10 h-10 mb-3 opacity-30" />
                <p>Select a player from the grid to analyze and raid</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}