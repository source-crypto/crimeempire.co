import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sword, Shield, Zap, Trophy, Skull } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CinematicOverlay from '@/components/shared/CinematicOverlay';
import { sounds } from '@/utils/sounds';
import { toast } from 'sonner';

const COMBAT_ITEMS = [
  { id: 'fists', label: 'Bare Fists', power: 5, cost: 0, icon: '👊' },
  { id: 'knife', label: 'Combat Knife', power: 15, cost: 500, icon: '🔪' },
  { id: 'pistol', label: 'Pistol', power: 30, cost: 2000, icon: '🔫' },
  { id: 'smg', label: 'SMG', power: 50, cost: 8000, icon: '🔫' },
  { id: 'armor', label: '+ Armor Vest', power: 0, defense: 20, cost: 3000, icon: '🛡️' },
];

export default function DirectCombat() {
  const queryClient = useQueryClient();
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [selectedWeapon, setSelectedWeapon] = useState(COMBAT_ITEMS[0]);
  const [useArmor, setUseArmor] = useState(false);
  const [cinematic, setCinematic] = useState(null);
  const [battleLog, setBattleLog] = useState([]);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData, refetch } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const p = await base44.entities.Player.filter({ created_by: user.email }); return p[0]; },
    enabled: !!user
  });
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list('-strength_score', 20),
    refetchInterval: 30000
  });

  const opponents = allPlayers.filter(p => p.id !== playerData?.id);

  const engage = useMutation({
    mutationFn: async () => {
      if (!selectedOpponent) throw new Error('Select an opponent');
      const weaponCost = selectedWeapon.cost + (useArmor ? 3000 : 0);
      if ((playerData?.buy_power || 0) < weaponCost) throw new Error(`Need $${weaponCost.toLocaleString()} for equipment`);

      const myPower = (playerData?.strength_score || 10) + selectedWeapon.power + ((playerData?.skills?.combat || 0) * 3);
      const enemyPower = (selectedOpponent?.strength_score || 10) + (Math.random() * 20);
      const myDefense = useArmor ? 20 : 0;
      const winChance = Math.min(90, Math.max(10, ((myPower + myDefense) / (myPower + myDefense + enemyPower)) * 100));
      const win = Math.random() * 100 < winChance;
      const loot = win ? Math.floor((selectedOpponent.buy_power || 0) * 0.2) : 0;
      const loss = win ? 0 : Math.floor((playerData.buy_power || 0) * 0.1);

      const logEntry = {
        opponent: selectedOpponent.username,
        weapon: selectedWeapon.label,
        myPower: Math.round(myPower),
        enemyPower: Math.round(enemyPower),
        win,
        loot,
        loss,
        ts: new Date().toLocaleTimeString()
      };

      if (win) {
        await base44.entities.Player.update(playerData.id, {
          buy_power: (playerData.buy_power || 0) - weaponCost + loot,
          strength_score: (playerData.strength_score || 10) + 1,
          endgame_points: (playerData.endgame_points || 0) + 150,
          'stats.battles_won': (playerData.stats?.battles_won || 0) + 1,
        });
        await base44.entities.Player.update(selectedOpponent.id, {
          buy_power: Math.max(0, (selectedOpponent.buy_power || 0) - loot),
          wanted_level: Math.min(5, (selectedOpponent.wanted_level || 0) + 1),
        });
      } else {
        await base44.entities.Player.update(playerData.id, {
          buy_power: Math.max(0, (playerData.buy_power || 0) - weaponCost - loss),
          wanted_level: Math.min(5, (playerData.wanted_level || 0) + 1),
          'stats.battles_lost': (playerData.stats?.battles_lost || 0) + 1,
        });
      }

      setBattleLog(prev => [logEntry, ...prev.slice(0, 9)]);
      return { win, loot, loss };
    },
    onSuccess: ({ win, loot, loss }) => {
      if (win) sounds.cash(); else sounds.error();
      setCinematic({
        show: true,
        outcome: win ? 'success' : 'failed',
        title: win ? 'Victory!' : 'Defeated!',
        subtitle: win ? `Looted $${loot.toLocaleString()} from ${selectedOpponent?.username}` : `Lost $${loss.toLocaleString()} — better luck next time`,
        icon: win ? '⚔️' : '💀'
      });
      queryClient.invalidateQueries();
      refetch();
    },
    onError: (e) => toast.error(e.message)
  });

  if (!playerData) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <CinematicOverlay {...(cinematic || { show: false })} onComplete={() => setCinematic(null)} />

      <div className="glass-panel border border-red-500/20 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
            <Sword className="w-8 h-8 text-red-400" /> Street Combat
          </h1>
          <p className="text-gray-400 mt-1">1v1 PvP — challenge any player, loot their cash on victory</p>
        </div>
        <div className="flex gap-4 text-center">
          <div><p className="text-xs text-gray-400">Your Strength</p><p className="text-2xl font-bold text-red-400">{playerData.strength_score || 0}</p></div>
          <div><p className="text-xs text-gray-400">Battles Won</p><p className="text-2xl font-bold text-yellow-400">{playerData.stats?.battles_won || 0}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opponent Roster */}
        <div className="lg:col-span-2">
          <Card className="glass-panel border border-red-500/20">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Skull className="w-5 h-5 text-red-400" />Select Opponent</CardTitle></CardHeader>
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              {opponents.map(p => {
                const isSelected = selectedOpponent?.id === p.id;
                const myPower = (playerData.strength_score || 10) + selectedWeapon.power;
                const theirPower = p.strength_score || 10;
                const winChance = Math.min(95, Math.max(5, (myPower / (myPower + theirPower)) * 100));
                return (
                  <button key={p.id} onClick={() => setSelectedOpponent(isSelected ? null : p)}
                    className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-800/50 transition-all text-left ${isSelected ? 'bg-red-900/30 border-l-2 border-l-red-500' : 'hover:bg-slate-800/40'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${winChance >= 60 ? 'bg-green-700' : winChance >= 40 ? 'bg-yellow-700' : 'bg-red-700'}`}>
                        {winChance.toFixed(0)}%
                      </div>
                      <div>
                        <p className="text-white font-semibold">{p.username}</p>
                        <p className="text-xs text-gray-400">Lvl {p.level} · STR {p.strength_score || 0} · {p.crew_role || 'Solo'}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-gray-400">Cash</p>
                      <p className="text-green-400">${(p.buy_power || 0).toLocaleString()}</p>
                      {(p.stats?.battles_won || 0) > 5 && <Badge className="bg-red-800 text-[10px]">⚠️ Veteran</Badge>}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Combat Setup */}
        <div className="space-y-4">
          <Card className="glass-panel border border-orange-500/20">
            <CardHeader><CardTitle className="text-orange-400 text-sm flex items-center gap-2"><Zap className="w-4 h-4" />Equipment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {COMBAT_ITEMS.filter(i => !i.defense).map(item => (
                <button key={item.id} onClick={() => setSelectedWeapon(item)}
                  className={`w-full p-2 rounded border text-left text-sm transition-all ${selectedWeapon.id === item.id ? 'border-orange-500 bg-orange-900/20' : 'border-gray-700 hover:border-orange-500/40'}`}>
                  <div className="flex justify-between">
                    <span className="text-white">{item.icon} {item.label}</span>
                    <span className="text-orange-400">{item.cost > 0 ? `$${item.cost.toLocaleString()}` : 'Free'}</span>
                  </div>
                  <p className="text-xs text-gray-400">+{item.power} power</p>
                </button>
              ))}
              <button onClick={() => setUseArmor(!useArmor)}
                className={`w-full p-2 rounded border text-left text-sm transition-all ${useArmor ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700'}`}>
                <div className="flex justify-between">
                  <span className="text-white">🛡️ Armor Vest</span>
                  <span className="text-blue-400">$3,000</span>
                </div>
                <p className="text-xs text-gray-400">+20 defense</p>
              </button>
            </CardContent>
          </Card>

          {selectedOpponent && (
            <Card className="glass-panel border border-red-500/30">
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Target</span><span className="text-white">{selectedOpponent.username}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Equipment cost</span><span className="text-red-400">-${(selectedWeapon.cost + (useArmor ? 3000 : 0)).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Max loot</span><span className="text-green-400">+${Math.floor((selectedOpponent.buy_power || 0) * 0.2).toLocaleString()}</span></div>
                <Button className="w-full bg-red-700 hover:bg-red-600 h-12 text-lg font-bold"
                  onClick={() => engage.mutate()} disabled={engage.isPending}>
                  <Sword className="w-5 h-5 mr-2" />{engage.isPending ? 'Fighting...' : 'ENGAGE'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Battle Log */}
          {battleLog.length > 0 && (
            <Card className="glass-panel border border-gray-700">
              <CardHeader><CardTitle className="text-gray-400 text-xs">Battle History</CardTitle></CardHeader>
              <CardContent className="p-2 space-y-1">
                {battleLog.map((log, i) => (
                  <div key={i} className={`text-xs p-2 rounded flex justify-between ${log.win ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                    <span className="text-gray-300">{log.win ? '⚔️ Beat' : '💀 Lost to'} {log.opponent}</span>
                    <span className={log.win ? 'text-green-400' : 'text-red-400'}>{log.win ? `+$${log.loot.toLocaleString()}` : `-$${log.loss.toLocaleString()}`}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}