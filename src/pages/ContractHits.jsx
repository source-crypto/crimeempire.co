import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Target, Crosshair, Shield, Eye, DollarSign, Plus,
  AlertTriangle, Crown, Skull, MapPin, Users, Lock
} from 'lucide-react';
import { toast } from 'sonner';

const HIT_TYPES = [
  { value: 'tag', label: 'Tag', icon: '🎯', desc: 'Mark target — reveal their activity for 24h', cost: 500, penalty: 'None', color: 'text-yellow-400' },
  { value: 'track', label: 'Track', icon: '🔍', desc: 'Continuously reveal location and actions', cost: 2000, penalty: 'Minor heat', color: 'text-orange-400' },
  { value: 'eliminate', label: 'Eliminate', icon: '💀', desc: 'Full wipe — lose 20% of assets on death', cost: 5000, penalty: 'Heavy heat', color: 'text-red-400' },
];

const GUARD_TIERS = [
  { id: 'street', name: 'Street Guard', icon: '🔫', cost: 1000, reaction: 40, accuracy: 35, loyalty: 80, desc: 'Cheap muscle. Can be bribed.' },
  { id: 'tactical', name: 'Tactical Unit', icon: '🪖', cost: 5000, reaction: 70, accuracy: 65, loyalty: 90, desc: 'Ex-military. Reliable and trained.' },
  { id: 'elite', name: 'Elite Mercenaries', icon: '⚔️', cost: 20000, reaction: 95, accuracy: 90, loyalty: 99, desc: 'Top tier. Nearly unbeatable in defense.' },
];

const STATUS_COLORS = {
  open: 'bg-yellow-600',
  assigned: 'bg-blue-600',
  completed: 'bg-green-600',
  expired: 'bg-gray-600',
  cancelled: 'bg-gray-700',
};

export default function ContractHits() {
  const queryClient = useQueryClient();
  const [hitType, setHitType] = useState('tag');
  const [targetId, setTargetId] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [isSilent, setIsSilent] = useState(false);
  const [priorityBoost, setPriorityBoost] = useState(false);
  const [activeGuards, setActiveGuards] = useState([]);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list('-strength_score', 30),
  });

  const { data: openHits = [] } = useQuery({
    queryKey: ['openHits'],
    queryFn: () => base44.entities.HitContract.filter({ status: 'open' }, '-created_date', 20),
    refetchInterval: 15000
  });

  const { data: myHits = [] } = useQuery({
    queryKey: ['myHits', playerData?.id],
    queryFn: () => base44.entities.HitContract.filter({ placer_player_id: playerData.id }, '-created_date', 10),
    enabled: !!playerData?.id
  });

  const { data: hitsOnMe = [] } = useQuery({
    queryKey: ['hitsOnMe', playerData?.id],
    queryFn: () => base44.entities.HitContract.filter({ target_player_id: playerData.id, status: 'open' }, '-created_date', 10),
    enabled: !!playerData?.id
  });

  const selectedHitType = HIT_TYPES.find(h => h.value === hitType);
  const minBid = selectedHitType?.cost || 500;
  const totalCost = parseInt(bidAmount || 0) + (priorityBoost ? 2500 : 0);
  const otherPlayers = allPlayers.filter(p => p.id !== playerData?.id);

  const placeHit = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error('Select a target');
      if (totalCost < minBid) throw new Error(`Minimum bid for ${selectedHitType.label} is $${minBid.toLocaleString()}`);
      if (totalCost > (playerData?.crypto_balance || 0)) throw new Error('Insufficient crypto balance');

      const target = allPlayers.find(p => p.id === targetId);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) - totalCost,
        wanted_level: Math.min(5, (playerData.wanted_level || 0) + (hitType === 'eliminate' ? 2 : 1))
      });

      return base44.entities.HitContract.create({
        target_player_id: targetId,
        target_username: target?.username || 'Unknown',
        placer_player_id: playerData.id,
        placer_username: playerData.username,
        hit_type: hitType,
        bounty_pool: totalCost,
        status: 'open',
        is_silent: isSilent,
        priority_boost: priorityBoost,
        contributors: [{ player_id: playerData.id, username: playerData.username, amount: totalCost }],
        expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      toast.success('🎯 Contract placed on the board!');
      queryClient.invalidateQueries({ queryKey: ['openHits'] });
      queryClient.invalidateQueries({ queryKey: ['myHits'] });
      queryClient.invalidateQueries({ queryKey: ['player'] });
      refetchPlayer();
      setTargetId('');
      setBidAmount('');
    },
    onError: (e) => toast.error(e.message)
  });

  const addBounty = useMutation({
    mutationFn: async ({ hitId, amount, hit }) => {
      if (amount < 500) throw new Error('Minimum contribution is $500');
      if (amount > (playerData?.crypto_balance || 0)) throw new Error('Insufficient funds');
      await base44.entities.Player.update(playerData.id, { crypto_balance: (playerData.crypto_balance || 0) - amount });
      const contrib = { player_id: playerData.id, username: playerData.username, amount };
      await base44.entities.HitContract.update(hitId, {
        bounty_pool: (hit.bounty_pool || 0) + amount,
        contributors: [...(hit.contributors || []), contrib]
      });
    },
    onSuccess: () => {
      toast.success('Bounty increased!');
      queryClient.invalidateQueries({ queryKey: ['openHits'] });
      queryClient.invalidateQueries({ queryKey: ['player'] });
    },
    onError: (e) => toast.error(e.message)
  });

  const cancelHit = useMutation({
    mutationFn: async (hit) => {
      await base44.entities.Player.update(playerData.id, { crypto_balance: (playerData.crypto_balance || 0) + Math.floor(hit.bounty_pool * 0.7) });
      await base44.entities.HitContract.update(hit.id, { status: 'cancelled' });
    },
    onSuccess: () => {
      toast.success('Contract cancelled. 70% refunded.');
      queryClient.invalidateQueries({ queryKey: ['myHits'] });
      queryClient.invalidateQueries({ queryKey: ['player'] });
    }
  });

  const hireGuard = useMutation({
    mutationFn: async (tier) => {
      if (tier.cost > (playerData?.crypto_balance || 0)) throw new Error('Insufficient funds');
      await base44.entities.Player.update(playerData.id, { crypto_balance: (playerData.crypto_balance || 0) - tier.cost });
      setActiveGuards(prev => [...prev, { ...tier, hired_at: Date.now() }]);
    },
    onSuccess: (_, tier) => {
      toast.success(`${tier.name} hired for 24 hours!`);
      queryClient.invalidateQueries({ queryKey: ['player'] });
    },
    onError: (e) => toast.error(e.message)
  });

  const defenseRating = activeGuards.reduce((acc, g) => acc + g.accuracy, 0) + (hitsOnMe.length === 0 ? 50 : 0);

  if (!playerData) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel border border-red-500/30 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
            <Crosshair className="w-8 h-8 text-red-400" /> Contract Hit Network
          </h1>
          <p className="text-gray-400 mt-1">Place bounties, hire killers, protect yourself — this is the underworld economy</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Open Contracts</p>
          <p className="text-3xl font-bold text-red-400">{openHits.length}</p>
        </div>
      </div>

      {/* Incoming Hits Warning */}
      {hitsOnMe.length > 0 && (
        <Card className="glass-panel border border-red-600/60 animate-pulse">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-bold">⚠️ {hitsOnMe.length} active contract(s) on YOUR head!</p>
              <p className="text-sm text-gray-400">Total bounty pool: ${hitsOnMe.reduce((a, h) => a + (h.bounty_pool || 0), 0).toLocaleString()} — Hire protection immediately.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="board">
        <TabsList className="glass-panel border-red-500/20">
          <TabsTrigger value="board"><Target className="w-4 h-4 mr-1" />Active Board</TabsTrigger>
          <TabsTrigger value="place"><Plus className="w-4 h-4 mr-1" />Place Hit</TabsTrigger>
          <TabsTrigger value="defense"><Shield className="w-4 h-4 mr-1" />Protection Hub</TabsTrigger>
          <TabsTrigger value="mine"><Crown className="w-4 h-4 mr-1" />My Contracts</TabsTrigger>
        </TabsList>

        {/* Active Board */}
        <TabsContent value="board" className="space-y-3 mt-4">
          {openHits.filter(h => !h.is_silent).length === 0 ? (
            <div className="text-center text-gray-500 py-12">No public contracts active.</div>
          ) : (
            openHits.filter(h => !h.is_silent).map(hit => {
              const htType = HIT_TYPES.find(h => h.value === hit.hit_type);
              const topContrib = (hit.contributors || []).sort((a, b) => b.amount - a.amount)[0];
              const [addAmt, setAddAmt] = useState('');
              return (
                <Card key={hit.id} className={`glass-panel border ${hit.hit_type === 'eliminate' ? 'border-red-500/40' : 'border-yellow-500/20'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{htType?.icon}</span>
                        <div>
                          <p className="text-white font-bold">{hit.target_username}</p>
                          <p className="text-xs text-gray-400">{htType?.label} contract</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold text-lg">${(hit.bounty_pool || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{hit.contributors?.length || 0} contributors</p>
                      </div>
                    </div>
                    {topContrib && <p className="text-xs text-gray-500 mb-3">Top bidder: {topContrib.username} (${topContrib.amount?.toLocaleString()})</p>}
                    {hit.priority_boost && <Badge className="bg-orange-600 mb-2">⚡ Priority</Badge>}
                    <div className="flex gap-2 items-center">
                      <input type="number" value={addAmt} onChange={e => setAddAmt(e.target.value)}
                        placeholder="Add to bounty..." className="flex-1 bg-slate-800 border border-gray-600 text-white rounded p-2 text-sm" />
                      <Button size="sm" className="bg-red-700 hover:bg-red-600" onClick={() => { addBounty.mutate({ hitId: hit.id, amount: Number(addAmt), hit }); setAddAmt(''); }}>
                        <DollarSign className="w-3 h-3 mr-1" /> Increase
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Place Hit */}
        <TabsContent value="place" className="mt-4">
          <Card className="glass-panel border border-red-500/30">
            <CardHeader><CardTitle className="text-white">Draft a Contract</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {/* Hit Type */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Hit Type</p>
                <div className="grid grid-cols-3 gap-3">
                  {HIT_TYPES.map(h => (
                    <button key={h.value} onClick={() => setHitType(h.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${hitType === h.value ? 'border-red-500 bg-red-900/20' : 'border-gray-700 hover:border-red-500/40'}`}>
                      <p className="text-xl mb-1">{h.icon}</p>
                      <p className={`font-semibold text-sm ${h.color}`}>{h.label}</p>
                      <p className="text-xs text-gray-400 mt-1">{h.desc}</p>
                      <p className="text-xs text-yellow-400 mt-1">Min: ${h.cost.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Target</p>
                <select value={targetId} onChange={e => setTargetId(e.target.value)}
                  className="w-full bg-slate-800 border border-gray-600 text-white rounded-lg p-2">
                  <option value="">Select target player...</option>
                  {otherPlayers.map(p => <option key={p.id} value={p.id}>{p.username} (Lvl {p.level})</option>)}
                </select>
              </div>

              {/* Bid */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Initial Bounty (min ${minBid.toLocaleString()})</p>
                <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                  placeholder={`Minimum $${minBid.toLocaleString()}`}
                  className="w-full bg-slate-800 border border-gray-600 text-white rounded-lg p-2" />
              </div>

              {/* Modifiers */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPriorityBoost(!priorityBoost)}
                  className={`p-3 rounded-lg border text-sm ${priorityBoost ? 'border-orange-500 bg-orange-900/20' : 'border-gray-700'}`}>
                  <p className="font-semibold text-orange-400">⚡ Priority Boost</p>
                  <p className="text-xs text-gray-400">+$2,500 — listed at top</p>
                </button>
                <button onClick={() => setIsSilent(!isSilent)}
                  className={`p-3 rounded-lg border text-sm ${isSilent ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700'}`}>
                  <p className="font-semibold text-purple-400"><Lock className="w-3 h-3 inline mr-1" />Silent Contract</p>
                  <p className="text-xs text-gray-400">Hidden from public board</p>
                </button>
              </div>

              {/* Summary */}
              {(parseInt(bidAmount) > 0 || priorityBoost) && (
                <div className="bg-slate-900/60 border border-gray-700 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-400">Bounty</span><span className="text-white">${parseInt(bidAmount || 0).toLocaleString()}</span></div>
                  {priorityBoost && <div className="flex justify-between"><span className="text-gray-400">Priority Fee</span><span className="text-orange-400">+$2,500</span></div>}
                  <div className="flex justify-between font-bold border-t border-gray-700 pt-1"><span className="text-gray-300">Total Cost</span><span className="text-red-400">${totalCost.toLocaleString()}</span></div>
                </div>
              )}

              <Button className="w-full bg-red-700 hover:bg-red-600 h-12 text-lg" onClick={() => placeHit.mutate()} disabled={placeHit.isPending}>
                <Crosshair className="w-5 h-5 mr-2" /> {placeHit.isPending ? 'Processing...' : 'Place Contract'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protection Hub */}
        <TabsContent value="defense" className="space-y-4 mt-4">
          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass-panel border border-green-500/30">
              <CardContent className="p-4">
                <p className="text-gray-400 text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Defense Rating</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{Math.min(100, defenseRating)}</p>
                <Progress value={Math.min(100, defenseRating)} className="h-2 mt-2" />
              </CardContent>
            </Card>
            <Card className="glass-panel border border-red-500/30">
              <CardContent className="p-4">
                <p className="text-gray-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Incoming Threats</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{hitsOnMe.length}</p>
                <p className="text-xs text-gray-500 mt-2">Active contracts against you</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Guards */}
          {activeGuards.length > 0 && (
            <Card className="glass-panel border border-green-500/20">
              <CardHeader><CardTitle className="text-green-400 text-sm">Active Protection</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {activeGuards.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-slate-900/60">
                    <span className="text-xl">{g.icon}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{g.name}</p>
                      <p className="text-xs text-gray-400">Accuracy: {g.accuracy}% · Loyalty: {g.loyalty}%</p>
                    </div>
                    <Badge className="bg-green-700">Active</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Hire Guards */}
          <Card className="glass-panel border border-purple-500/20">
            <CardHeader><CardTitle className="text-white">Hire Protection</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {GUARD_TIERS.map(tier => (
                <div key={tier.id} className="p-4 rounded-lg bg-slate-900/60 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tier.icon}</span>
                      <div>
                        <p className="text-white font-semibold">{tier.name}</p>
                        <p className="text-xs text-gray-400">{tier.desc}</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-purple-700 hover:bg-purple-600" onClick={() => hireGuard.mutate(tier)}>
                      Hire ${tier.cost.toLocaleString()}
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-gray-500">Reaction</p><p className="text-cyan-400">{tier.reaction}%</p></div>
                    <div><p className="text-gray-500">Accuracy</p><p className="text-green-400">{tier.accuracy}%</p></div>
                    <div><p className="text-gray-500">Loyalty</p><p className="text-yellow-400">{tier.loyalty}%</p></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Contracts */}
        <TabsContent value="mine" className="space-y-3 mt-4">
          {myHits.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No contracts placed.</div>
          ) : (
            myHits.map(hit => {
              const htType = HIT_TYPES.find(h => h.value === hit.hit_type);
              return (
                <Card key={hit.id} className="glass-panel border border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{htType?.icon}</span>
                        <div>
                          <p className="text-white font-semibold">Target: {hit.target_username}</p>
                          <p className="text-xs text-gray-400">{htType?.label} · Pool: ${(hit.bounty_pool || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[hit.status]}>{hit.status}</Badge>
                        {hit.status === 'open' && (
                          <Button size="sm" variant="destructive" onClick={() => cancelHit.mutate(hit)}>Cancel</Button>
                        )}
                      </div>
                    </div>
                    {hit.is_silent && <Badge className="bg-purple-700 mt-2 text-xs"><Lock className="w-3 h-3 inline mr-1" />Silent</Badge>}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}