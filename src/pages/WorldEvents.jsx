import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Zap, AlertTriangle, TrendingUp, Shield, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { sounds } from '@/utils/sounds';

const EVENT_TEMPLATES = [
  { title: '🚔 Police Crackdown', desc: 'All enterprises +25% heat for 2 hours. Lay low or risk raids.', type: 'police_crackdown', icon: '🚔', effect_type: 'heat_increase', effect_value: 25, duration_hours: 2, color: 'border-red-500 bg-red-900/10' },
  { title: '💣 Gang War Erupts', desc: 'Contested territories earn double influence. Battles cost 50% less.', type: 'gang_war', icon: '💣', effect_type: 'battle_bonus', effect_value: 100, duration_hours: 3, color: 'border-orange-500 bg-orange-900/10' },
  { title: '📈 Weapons Shortage', desc: 'Weapons prices surge +40%. Perfect time to sell your cache.', type: 'market_surge', icon: '📈', affected_commodity: 'weapons', effect_type: 'price_surge', effect_value: 40, duration_hours: 1, color: 'border-yellow-500 bg-yellow-900/10' },
  { title: '💊 Narcotics Flood', desc: 'Drug supply crashes prices by 30%. Buy now, hold for recovery.', type: 'market_crash', icon: '💊', affected_commodity: 'drugs', effect_type: 'price_crash', effect_value: -30, duration_hours: 2, color: 'border-purple-500 bg-purple-900/10' },
  { title: '🎰 Casino Heist Window', desc: 'Casino Strip enterprise defenses down 50% for 30 minutes.', type: 'opportunity', icon: '🎰', effect_type: 'defense_down', effect_value: 50, duration_hours: 0.5, color: 'border-green-500 bg-green-900/10' },
  { title: '⚓ Port Smuggling Route', desc: 'All contraband trades earn +20% bonus for 1 hour.', type: 'opportunity', icon: '⚓', effect_type: 'trade_bonus', effect_value: 20, duration_hours: 1, color: 'border-cyan-500 bg-cyan-900/10' },
  { title: '🌩️ Supply Chain Disrupted', desc: 'Raw materials triple in value. Electronics production halted.', type: 'supply_shortage', icon: '🌩️', affected_commodity: 'raw_materials', effect_type: 'price_surge', effect_value: 200, duration_hours: 2, color: 'border-gray-400 bg-gray-900/30' },
  { title: '💰 Money Laundering Amnesty', desc: 'Exchange fees cut by 50% for 1 hour. Launder freely.', type: 'opportunity', icon: '💰', effect_type: 'fee_reduction', effect_value: 50, duration_hours: 1, color: 'border-emerald-500 bg-emerald-900/10' },
];

const TYPE_ICONS = { police_crackdown: AlertTriangle, gang_war: Flame, market_surge: TrendingUp, market_crash: TrendingUp, opportunity: Zap, supply_shortage: Shield };

export default function WorldEvents() {
  const queryClient = useQueryClient();
  const [newEvents, setNewEvents] = useState([]);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const p = await base44.entities.Player.filter({ created_by: user.email }); return p[0]; },
    enabled: !!user
  });
  const { data: activeEvents = [], refetch } = useQuery({
    queryKey: ['globalEvents'],
    queryFn: () => base44.entities.GlobalEvent.filter({ is_active: true }),
    refetchInterval: 15000
  });

  useEffect(() => {
    const unsub = base44.entities.GlobalEvent.subscribe((ev) => {
      if (ev.type === 'create') {
        sounds.alert();
        setNewEvents(prev => [ev.data, ...prev]);
        refetch();
        toast.custom(() => (
          <div className="flex items-center gap-3 bg-slate-900 border border-red-500/40 rounded-xl p-4">
            <span className="text-3xl">{ev.data?.icon}</span>
            <div>
              <p className="text-red-400 font-bold text-sm">🌍 WORLD EVENT</p>
              <p className="text-white text-sm">{ev.data?.title}</p>
            </div>
          </div>
        ), { duration: 8000 });
      }
    });
    return unsub;
  }, []);

  const triggerEvent = useMutation({
    mutationFn: async (template) => {
      const expires = new Date(Date.now() + template.duration_hours * 3600000).toISOString();
      await base44.entities.GlobalEvent.create({
        ...template,
        is_active: true,
        expires_at: expires,
      });
    },
    onSuccess: () => { sounds.alert(); queryClient.invalidateQueries(); },
    onError: () => toast.error('Failed to trigger event')
  });

  const expireEvent = useMutation({
    mutationFn: (id) => base44.entities.GlobalEvent.update(id, { is_active: false }),
    onSuccess: () => queryClient.invalidateQueries()
  });

  const isAdmin = playerData?.crew_role === 'boss';

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-red-500/20 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
            <Globe className="w-8 h-8 text-red-400" /> World Events
          </h1>
          <p className="text-gray-400 mt-1">Real-time global events affecting every player in the city</p>
        </div>
        <div className="flex gap-4 text-center">
          <div><p className="text-xs text-gray-400">Active Events</p><p className="text-2xl font-bold text-red-400">{activeEvents.length}</p></div>
        </div>
      </div>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400 animate-pulse" />Active Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {activeEvents.map(event => {
                const template = EVENT_TEMPLATES.find(t => t.type === event.event_type) || {};
                return (
                  <motion.div key={event.id}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={`p-4 rounded-xl border-2 ${template.color || 'border-gray-600 bg-gray-900/20'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{event.icon}</span>
                        <div>
                          <h3 className="text-white font-bold">{event.title}</h3>
                          <p className="text-gray-400 text-sm mt-1">{event.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-slate-700 text-xs">Effect: {event.effect_type?.replace(/_/g, ' ')}</Badge>
                            {event.affected_commodity && <Badge className="bg-slate-600 text-xs">{event.affected_commodity}</Badge>}
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-400" onClick={() => expireEvent.mutate(event.id)}>✕</Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 h-1 rounded-full bg-gray-700">
                        <div className="h-full rounded-full bg-red-500 animate-pulse" style={{ width: '60%' }} />
                      </div>
                      <span className="text-xs text-gray-400">{event.duration_hours}h</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {activeEvents.length === 0 && (
        <Card className="glass-panel border border-gray-700">
          <CardContent className="text-center py-12 text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>The city is calm... for now. Events trigger automatically or can be launched below.</p>
          </CardContent>
        </Card>
      )}

      {/* Event Library */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Event Library {isAdmin && <span className="text-sm text-gray-400">(Boss can trigger)</span>}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EVENT_TEMPLATES.map((template, i) => (
            <div key={i} className={`p-4 rounded-xl border ${template.color} flex items-start justify-between gap-3`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <h3 className="text-white font-semibold text-sm">{template.title}</h3>
                  <p className="text-gray-400 text-xs mt-1">{template.desc}</p>
                  <p className="text-xs text-gray-500 mt-1">Duration: {template.duration_hours}h</p>
                </div>
              </div>
              {isAdmin && (
                <Button size="sm" className="bg-purple-800 hover:bg-purple-700 flex-shrink-0 text-xs"
                  onClick={() => triggerEvent.mutate(template)} disabled={triggerEvent.isPending}>
                  Trigger
                </Button>
              )}
            </div>
          ))}
        </div>
        {!isAdmin && <p className="text-center text-gray-500 text-sm mt-4">Only Crew Bosses can trigger events. Events also fire automatically based on city activity.</p>}
      </div>
    </div>
  );
}