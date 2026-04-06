import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Activity, Zap, TrendingUp, Shield, Swords, Globe, Clock,
  CheckCircle, XCircle, AlertTriangle, BarChart3, Eye, Flame
} from 'lucide-react';

const PHASE_COLORS = {
  enterprise_production: 'text-purple-400',
  heat_decay:            'text-blue-400',
  market_update:         'text-yellow-400',
  territory_income:      'text-green-400',
  gang_war_update:       'text-red-400',
  gang_war_ended:        'text-orange-400',
  global_event_triggered:'text-cyan-400',
  error:                 'text-red-600',
};

const PHASE_ICONS = {
  enterprise_production: '🏭',
  heat_decay:            '🧊',
  market_update:         '📈',
  territory_income:      '💰',
  gang_war_update:       '⚔️',
  gang_war_ended:        '🏆',
  global_event_triggered:'🌍',
  error:                 '❌',
};

function PhaseBar({ label, ms, maxMs, icon, color }) {
  const pct = maxMs > 0 ? Math.min(100, (ms / maxMs) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={`${color} font-medium`}>{icon} {label}</span>
        <span className="text-gray-400">{ms}ms</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function TickCard({ tick, isLatest }) {
  const statusColor = tick.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : tick.status === 'running' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-red-500/20 text-red-400 border-red-500/30';
  const maxPhase = Math.max(...Object.values(tick.phase_timings || {}).map(Number).filter(Boolean), 1);

  return (
    <Card className={`glass-panel border ${isLatest ? 'border-purple-400/40' : 'border-purple-500/20'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Tick #{tick.tick_number}
            {isLatest && <Badge className="bg-purple-600 text-xs">LATEST</Badge>}
          </CardTitle>
          <Badge className={`text-xs border ${statusColor}`}>
            {tick.status === 'completed' ? <CheckCircle className="w-3 h-3 mr-1 inline" /> : null}
            {tick.status}
          </Badge>
        </div>
        <p className="text-gray-500 text-xs">{tick.started_at ? new Date(tick.started_at).toLocaleString() : '—'}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-purple-400 font-bold text-sm">{tick.enterprises_processed || 0}</p>
            <p className="text-gray-500 text-xs">Enterprises</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-green-400 font-bold text-sm">${((tick.total_income_distributed || 0) / 1000).toFixed(0)}k</p>
            <p className="text-gray-500 text-xs">Distributed</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-red-400 font-bold text-sm">{tick.wars_processed || 0}</p>
            <p className="text-gray-500 text-xs">Wars</p>
          </div>
        </div>

        {/* Phase timings */}
        {tick.phase_timings && Object.keys(tick.phase_timings).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-gray-500 text-xs font-medium">Phase Timings</p>
            {tick.phase_timings.enterprise_ms != null && (
              <PhaseBar label="Production" ms={tick.phase_timings.enterprise_ms} maxMs={maxPhase} icon="🏭" color="text-purple-400" />
            )}
            {tick.phase_timings.heat_decay_ms != null && (
              <PhaseBar label="Heat Decay" ms={tick.phase_timings.heat_decay_ms} maxMs={maxPhase} icon="🧊" color="text-blue-400" />
            )}
            {tick.phase_timings.market_ms != null && (
              <PhaseBar label="Market" ms={tick.phase_timings.market_ms} maxMs={maxPhase} icon="📈" color="text-yellow-400" />
            )}
            {tick.phase_timings.territory_ms != null && (
              <PhaseBar label="Territory" ms={tick.phase_timings.territory_ms} maxMs={maxPhase} icon="💰" color="text-green-400" />
            )}
            {tick.phase_timings.gang_wars_ms != null && (
              <PhaseBar label="Gang Wars" ms={tick.phase_timings.gang_wars_ms} maxMs={maxPhase} icon="⚔️" color="text-red-400" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tick.duration_ms || 0}ms total</span>
          <span>{tick.events_triggered || 0} events triggered</span>
        </div>

        {tick.error_log?.length > 0 && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded p-2">
            ⚠️ {tick.error_log.length} error(s) — partial tick
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveWarCard({ war }) {
  const total = (war.war_score_attacker || 0) + (war.war_score_defender || 0) || 1;
  const attackPct = Math.round((war.war_score_attacker / total) * 100);
  const ticksLeft = (war.max_ticks || 6) - (war.ticks_elapsed || 0);

  return (
    <Card className="glass-panel border border-red-500/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white font-bold text-sm">⚔️ {war.territory_name || 'Unknown Territory'}</p>
          <Badge className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs">{ticksLeft} ticks left</Badge>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span className="text-red-400 font-medium">{war.attacker_crew_name}</span>
          <span className="text-blue-400 font-medium">{war.defender_crew_name}</span>
        </div>
        <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-red-500/60 transition-all duration-700" style={{ width: `${attackPct}%` }} />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {attackPct}% / {100 - attackPct}%
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">💥 DMG: ${((war.economic_damage || 0) / 1000).toFixed(0)}k</span>
          <span className="text-gray-400">🔥 Heat: +{war.heat_generated || 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorldTickDashboard() {
  const [countdown, setCountdown] = useState(0);
  const [nextTick, setNextTick] = useState(null);

  const { data: ticks = [], refetch: refetchTicks } = useQuery({
    queryKey: ['worldTicks'],
    queryFn: () => base44.entities.WorldTick.list('-tick_number', 20),
    refetchInterval: 30000,
  });

  const { data: tickEvents = [] } = useQuery({
    queryKey: ['tickEvents', ticks[0]?.id],
    queryFn: () => base44.entities.TickEvent.filter({ tick_id: ticks[0]?.id }, '-created_date', 50),
    enabled: !!ticks[0]?.id,
    refetchInterval: 30000,
  });

  const { data: activeWars = [] } = useQuery({
    queryKey: ['activeWars'],
    queryFn: () => base44.entities.TerritoryWar.filter({ status: 'active' }),
    refetchInterval: 30000,
  });

  const { data: globalEvents = [] } = useQuery({
    queryKey: ['globalEvents'],
    queryFn: () => base44.entities.GlobalEvent.filter({ is_active: true }),
    refetchInterval: 30000,
  });

  const { data: commodities = [] } = useQuery({
    queryKey: ['commodities'],
    queryFn: () => base44.entities.CommodityPrice.list('-created_date', 7),
    refetchInterval: 60000,
  });

  // Countdown to next tick
  useEffect(() => {
    const latestTick = ticks[0];
    if (latestTick?.completed_at) {
      const last = new Date(latestTick.completed_at);
      const next = new Date(last.getTime() + 10 * 60 * 1000);
      setNextTick(next);
    }
  }, [ticks]);

  useEffect(() => {
    if (!nextTick) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, nextTick - Date.now());
      setCountdown(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [nextTick]);

  const countdownMins = Math.floor(countdown / 60000);
  const countdownSecs = Math.floor((countdown % 60000) / 1000);

  const latestTick = ticks[0];
  const totalProduction = ticks.slice(0, 10).reduce((a, t) => a + (t.total_production_generated || 0), 0);
  const totalDistributed = ticks.slice(0, 10).reduce((a, t) => a + (t.total_income_distributed || 0), 0);
  const avgDuration = ticks.length > 0 ? Math.round(ticks.reduce((a, t) => a + (t.duration_ms || 0), 0) / ticks.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-7 h-7 text-cyan-400" />
              World Tick Engine
            </h1>
            <p className="text-gray-400 text-sm mt-1">Live simulation heartbeat — every 10 minutes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-gray-500 text-xs">Next Tick</p>
              <p className="text-2xl font-mono font-bold text-cyan-400">
                {String(countdownMins).padStart(2, '0')}:{String(countdownSecs).padStart(2, '0')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs">Tick #</p>
              <p className="text-2xl font-bold text-purple-400">{latestTick?.tick_number || 0}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
              latestTick?.status === 'completed'
                ? 'bg-green-900/20 text-green-400 border-green-500/30'
                : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${latestTick?.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
              {latestTick?.status === 'completed' ? 'Idle' : 'Running'}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Ticks Run', value: ticks.length, icon: Activity, color: 'text-purple-400' },
          { label: 'Avg Duration', value: `${avgDuration}ms`, icon: Clock, color: 'text-cyan-400' },
          { label: '10-Tick Production', value: totalProduction.toLocaleString(), icon: BarChart3, color: 'text-yellow-400' },
          { label: '10-Tick Income', value: `$${(totalDistributed / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-green-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="glass-panel border border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="ticks" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="ticks">Tick History</TabsTrigger>
          <TabsTrigger value="events">Event Log</TabsTrigger>
          <TabsTrigger value="wars">Gang Wars ({activeWars.length})</TabsTrigger>
          <TabsTrigger value="market">Market Prices</TabsTrigger>
          <TabsTrigger value="world">World Events</TabsTrigger>
        </TabsList>

        {/* TICK HISTORY */}
        <TabsContent value="ticks">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ticks.map((tick, i) => (
              <TickCard key={tick.id} tick={tick} isLatest={i === 0} />
            ))}
            {ticks.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">
                No ticks recorded yet. The engine runs every 10 minutes.
              </div>
            )}
          </div>
        </TabsContent>

        {/* EVENT LOG */}
        <TabsContent value="events">
          <Card className="glass-panel border border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-400" />
                Tick #{latestTick?.tick_number} — Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickEvents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No events logged for latest tick.</p>
              ) : (
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {tickEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/40 text-sm border border-transparent hover:border-purple-500/10">
                      <span className="text-lg w-6 text-center">{PHASE_ICONS[ev.event_type] || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium ${PHASE_COLORS[ev.event_type] || 'text-gray-300'}`}>
                          {ev.event_type.replace(/_/g, ' ')}
                        </span>
                        {ev.entity_name && <span className="text-gray-400 ml-2 text-xs">— {ev.entity_name}</span>}
                      </div>
                      {ev.delta !== 0 && (
                        <span className={`text-xs font-mono ${ev.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {ev.delta > 0 ? '+' : ''}{ev.delta?.toLocaleString()}
                        </span>
                      )}
                      <span className="text-gray-600 text-xs">{new Date(ev.created_date).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GANG WARS */}
        <TabsContent value="wars">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeWars.map(war => <ActiveWarCard key={war.id} war={war} />)}
            {activeWars.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-500">
                No active gang wars. Territories are at peace.
              </div>
            )}
          </div>
        </TabsContent>

        {/* MARKET PRICES */}
        <TabsContent value="market">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {commodities.map(c => (
              <Card key={c.id} className="glass-panel border border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-semibold capitalize">{c.commodity?.replace(/_/g, ' ')}</p>
                    <Badge className={
                      c.trend === 'rising' ? 'bg-green-600/20 text-green-400 border border-green-500/30' :
                      c.trend === 'falling' ? 'bg-red-600/20 text-red-400 border border-red-500/30' :
                      'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                    }>
                      {c.trend === 'rising' ? '▲' : c.trend === 'falling' ? '▼' : '—'} {c.trend}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">${c.current_price?.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Base: ${c.base_price?.toLocaleString()}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Supply: {c.supply_volume || 100}</span>
                    <span className={c.pct_change >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {c.pct_change >= 0 ? '+' : ''}{c.pct_change?.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, ((c.current_price / (c.base_price * 2)) * 100))}
                    className="h-1 mt-2"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* WORLD EVENTS */}
        <TabsContent value="world">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {globalEvents.map(ev => (
              <Card key={ev.id} className="glass-panel border border-orange-500/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold">{ev.title}</p>
                    <Badge className="bg-orange-600/20 text-orange-400 border border-orange-500/30 text-xs capitalize">
                      {ev.event_type?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{ev.description}</p>
                  {ev.expires_at && (
                    <p className="text-gray-500 text-xs">
                      Expires: {new Date(ev.expires_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {globalEvents.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-500">No active world events.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}