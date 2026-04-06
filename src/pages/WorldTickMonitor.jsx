import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Activity, Zap, TrendingUp, Shield, MapPin, Sword, Clock, CheckCircle,
  AlertTriangle, RefreshCw, BarChart2, Database, Eye, ChevronRight
} from 'lucide-react';

const PHASE_META = {
  enterprise_production: { label: 'Enterprise Production', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  heat_decay: { label: 'Heat Decay', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  market_update: { label: 'Market Prices', icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  territory_income: { label: 'Territory Income', icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  gang_war_update: { label: 'Gang War Update', icon: Sword, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  gang_war_ended: { label: 'Gang War Ended', icon: Sword, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  gang_war_started: { label: 'Gang War Started', icon: Sword, color: 'text-red-500', bg: 'bg-red-600/10 border-red-600/30' },
  error: { label: 'Error', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-500/30' },
};

function StatPill({ label, value, color = 'text-white' }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-slate-900/60 border border-purple-500/20">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}

function TickCard({ tick, isLatest }) {
  const statusColor = tick.status === 'completed' ? 'bg-green-500' : tick.status === 'running' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500';
  const phaseDurationTotal = Object.values(tick.phase_timings || {}).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className={`p-4 rounded-xl border ${isLatest ? 'border-purple-500/50 bg-purple-900/10' : 'border-slate-700/50 bg-slate-900/40'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
          <span className="font-bold text-white">Tick #{tick.tick_number}</span>
          {isLatest && <Badge className="bg-purple-600 text-xs">Latest</Badge>}
        </div>
        <span className="text-xs text-gray-400">{tick.duration_ms ? `${tick.duration_ms}ms` : '—'}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="text-center"><div className="text-green-400 font-semibold">{tick.enterprises_processed || 0}</div><div className="text-gray-500">Enterprises</div></div>
        <div className="text-center"><div className="text-blue-400 font-semibold">{tick.players_processed || 0}</div><div className="text-gray-500">Players</div></div>
        <div className="text-center"><div className="text-purple-400 font-semibold">${(tick.total_income_distributed || 0).toLocaleString()}</div><div className="text-gray-500">Distributed</div></div>
        <div className="text-center"><div className="text-yellow-400 font-semibold">{tick.market_items_updated || 0}</div><div className="text-gray-500">Markets</div></div>
        <div className="text-center"><div className="text-red-400 font-semibold">{tick.wars_processed || 0}</div><div className="text-gray-500">Wars</div></div>
        <div className="text-center"><div className="text-emerald-400 font-semibold">{tick.total_production_generated || 0}</div><div className="text-gray-500">Produced</div></div>
      </div>

      {/* Phase timing bar */}
      {tick.phase_timings && phaseDurationTotal > 0 && (
        <div className="flex rounded-full overflow-hidden h-2 gap-px">
          {[
            { key: 'enterprise_ms', color: 'bg-emerald-500' },
            { key: 'heat_decay_ms', color: 'bg-blue-500' },
            { key: 'market_ms', color: 'bg-yellow-500' },
            { key: 'territory_ms', color: 'bg-purple-500' },
            { key: 'gang_wars_ms', color: 'bg-red-500' },
          ].map(({ key, color }) => {
            const pct = Math.round(((tick.phase_timings[key] || 0) / phaseDurationTotal) * 100);
            if (pct === 0) return null;
            return <div key={key} className={`${color} h-full`} style={{ width: `${pct}%` }} title={`${key}: ${tick.phase_timings[key]}ms`} />;
          })}
        </div>
      )}

      {tick.error_log?.length > 0 && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {tick.error_log.length} error(s) in this tick
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        {tick.completed_at ? new Date(tick.completed_at).toLocaleString() : 'In progress...'}
      </div>
    </div>
  );
}

function EventRow({ event }) {
  const meta = PHASE_META[event.event_type] || { label: event.event_type, icon: Activity, color: 'text-gray-400', bg: 'bg-slate-800/40 border-slate-700/30' };
  const Icon = meta.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${meta.bg}`}>
      <div className={`mt-0.5 ${meta.color}`}><Icon className="w-4 h-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
          {event.entity_name && <span className="text-xs text-gray-300 truncate">{event.entity_name}</span>}
          {event.delta !== 0 && (
            <span className={`text-xs font-mono ml-auto ${event.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {event.delta > 0 ? '+' : ''}{event.delta?.toLocaleString()}
            </span>
          )}
        </div>
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            {Object.entries(event.metadata).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorldTickMonitor() {
  const [selectedTickId, setSelectedTickId] = useState(null);

  const { data: ticks = [], refetch: refetchTicks, isLoading: loadingTicks } = useQuery({
    queryKey: ['worldTicks'],
    queryFn: () => base44.entities.WorldTick.list('-created_date', 20),
    refetchInterval: 30000,
  });

  const { data: activeWars = [] } = useQuery({
    queryKey: ['activeWars'],
    queryFn: () => base44.entities.TerritoryWar.filter({ status: 'active' }),
    refetchInterval: 30000,
  });

  const { data: commodities = [] } = useQuery({
    queryKey: ['commoditiesMonitor'],
    queryFn: () => base44.entities.CommodityPrice.list(),
    refetchInterval: 60000,
  });

  const latestTick = ticks[0];
  const displayTickId = selectedTickId || latestTick?.id;

  const { data: tickEvents = [] } = useQuery({
    queryKey: ['tickEvents', displayTickId],
    queryFn: () => base44.entities.TickEvent.filter({ tick_id: displayTickId }, '-created_date', 50),
    enabled: !!displayTickId,
    refetchInterval: 15000,
  });

  // Subscribe to new ticks in real-time
  useEffect(() => {
    const unsub = base44.entities.WorldTick.subscribe(() => refetchTicks());
    return unsub;
  }, []);

  const completedTicks = ticks.filter(t => t.status === 'completed').length;
  const failedTicks = ticks.filter(t => t.status === 'failed').length;
  const avgDuration = ticks.length
    ? Math.round(ticks.filter(t => t.duration_ms).reduce((a, t) => a + t.duration_ms, 0) / ticks.filter(t => t.duration_ms).length)
    : 0;
  const totalIncomeAll = ticks.reduce((a, t) => a + (t.total_income_distributed || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel border border-purple-500/20 p-5 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-7 h-7 text-purple-400" />
              World Tick Engine
            </h1>
            <p className="text-gray-400 text-sm mt-1">Global simulation running every 10 minutes — deterministic, auditable, transparent</p>
          </div>
          <div className="flex items-center gap-3">
            {latestTick?.status === 'running' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                <Zap className="w-4 h-4 animate-pulse" /> Tick Running...
              </div>
            )}
            {latestTick?.status === 'completed' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" /> Tick #{latestTick.tick_number} Complete
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => refetchTicks()} className="border-purple-500/30 text-purple-300">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <StatPill label="Total Ticks" value={ticks.length} color="text-purple-400" />
          <StatPill label="Completed" value={completedTicks} color="text-green-400" />
          <StatPill label="Avg Duration" value={avgDuration ? `${avgDuration}ms` : '—'} color="text-cyan-400" />
          <StatPill label="Total Income Dist." value={`$${(totalIncomeAll / 1000).toFixed(0)}K`} color="text-yellow-400" />
        </div>
      </div>

      {/* Phase Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Production', icon: Database, color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' },
          { label: 'Heat Decay', icon: Shield, color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
          { label: 'Markets', icon: TrendingUp, color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' },
          { label: 'Territory', icon: MapPin, color: 'bg-purple-500/20 border-purple-500/30 text-purple-300' },
          { label: 'Gang Wars', icon: Sword, color: 'bg-red-500/20 border-red-500/30 text-red-300' },
        ].map(({ label, icon: Icon, color }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${color}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </div>
        ))}
      </div>

      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="ledger">📜 Tick Ledger</TabsTrigger>
          <TabsTrigger value="events">⚡ Event Log</TabsTrigger>
          <TabsTrigger value="wars">⚔️ Gang Wars ({activeWars.length})</TabsTrigger>
          <TabsTrigger value="markets">📈 Markets</TabsTrigger>
        </TabsList>

        {/* TICK LEDGER */}
        <TabsContent value="ledger">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {loadingTicks ? (
              <div className="text-gray-400 text-center py-12 col-span-2">Loading tick history...</div>
            ) : ticks.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No ticks recorded yet. The engine fires every 10 minutes.</p>
              </div>
            ) : ticks.map((tick, i) => (
              <div key={tick.id} onClick={() => setSelectedTickId(tick.id)} className="cursor-pointer">
                <TickCard tick={tick} isLatest={i === 0} />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* EVENT LOG */}
        <TabsContent value="events">
          <div className="glass-panel border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                Event Ledger — Tick #{ticks.find(t => t.id === displayTickId)?.tick_number || '...'}
              </h3>
              <div className="flex gap-2 flex-wrap">
                {ticks.slice(0, 5).map(t => (
                  <button key={t.id} onClick={() => setSelectedTickId(t.id)}
                    className={`text-xs px-2 py-1 rounded-md border transition-all ${displayTickId === t.id ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'border-slate-700/50 text-gray-400 hover:border-purple-500/30'}`}>
                    #{t.tick_number}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {tickEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No events recorded for this tick.</p>
              ) : tickEvents.map(e => <EventRow key={e.id} event={e} />)}
            </div>
          </div>
        </TabsContent>

        {/* GANG WARS */}
        <TabsContent value="wars">
          <div className="space-y-4">
            {activeWars.length === 0 ? (
              <div className="glass-panel border border-purple-500/20 rounded-xl p-12 text-center">
                <Sword className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">No active gang wars. Peace holds... for now.</p>
              </div>
            ) : activeWars.map(war => {
              const totalScore = (war.war_score_attacker || 0) + (war.war_score_defender || 0);
              const attackPct = totalScore > 0 ? Math.round((war.war_score_attacker / totalScore) * 100) : 0;
              const defPct = 100 - attackPct;
              const ticksLeft = (war.max_ticks || 6) - (war.ticks_elapsed || 0);

              return (
                <div key={war.id} className="glass-panel border border-red-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Sword className="w-5 h-5 text-red-400" />
                        {war.territory_name || 'Unknown Territory'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{ticksLeft} ticks remaining (~{ticksLeft * 10} min)</p>
                    </div>
                    <Badge className="bg-red-600/20 border border-red-500/40 text-red-300">⚔️ Active War</Badge>
                  </div>

                  {/* War Score Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-400 font-semibold">{war.attacker_crew_name || 'Attacker'} {attackPct}%</span>
                      <span className="text-blue-400 font-semibold">{defPct}% {war.defender_crew_name || 'Defender'}</span>
                    </div>
                    <div className="flex h-4 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${attackPct}%` }} />
                      <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${defPct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center bg-red-900/20 rounded-lg p-2">
                      <div className="text-red-400 font-bold">{war.war_score_attacker || 0}</div>
                      <div className="text-gray-500">Attack Score</div>
                    </div>
                    <div className="text-center bg-slate-800/40 rounded-lg p-2">
                      <div className="text-yellow-400 font-bold">{war.ticks_elapsed || 0}/{war.max_ticks || 6}</div>
                      <div className="text-gray-500">Ticks</div>
                    </div>
                    <div className="text-center bg-blue-900/20 rounded-lg p-2">
                      <div className="text-blue-400 font-bold">{war.war_score_defender || 0}</div>
                      <div className="text-gray-500">Defense Score</div>
                    </div>
                  </div>

                  {/* Tick progress */}
                  <div className="mt-3">
                    <Progress value={((war.ticks_elapsed || 0) / (war.max_ticks || 6)) * 100} className="h-1.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* MARKETS */}
        <TabsContent value="markets">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {commodities.map(c => {
              const pct = c.pct_change || 0;
              const trendColor = c.trend === 'rising' ? 'text-green-400' : c.trend === 'falling' ? 'text-red-400' : 'text-gray-400';
              const barPct = c.base_price ? Math.min(100, (c.current_price / (c.base_price * 2)) * 100) : 50;

              return (
                <div key={c.id} className="glass-panel border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold capitalize">{c.commodity?.replace(/_/g, ' ')}</span>
                    <span className={`text-sm font-bold ${trendColor}`}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl font-bold text-white">${(c.current_price || 0).toLocaleString()}</span>
                    <span className="text-gray-500 text-sm mb-0.5">/ unit</span>
                  </div>
                  <Progress value={barPct} className="h-1.5 mb-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Base: ${(c.base_price || 0).toLocaleString()}</span>
                    <span className="capitalize">{c.demand_level} demand</span>
                  </div>
                </div>
              );
            })}
            {commodities.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No commodity data yet. Market prices initialize on first tick.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}