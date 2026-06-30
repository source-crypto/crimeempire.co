import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, SkipBack, Play, Database, Shield,
  TrendingUp, MapPin, Sword, AlertTriangle, Clock, CheckCircle, XCircle, Activity
} from 'lucide-react';

const PHASE_META = {
  enterprise_production: { label: 'Enterprise Production', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-500/30' },
  heat_decay: { label: 'Heat Decay', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/30' },
  market_update: { label: 'Market Prices', icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/30' },
  territory_income: { label: 'Territory Income', icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-500/30' },
  gang_war_update: { label: 'Gang War', icon: Sword, color: 'text-red-400', bg: 'bg-red-900/20 border-red-500/30' },
  gang_war_ended: { label: 'War Ended', icon: Sword, color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-500/30' },
  error: { label: 'Error', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/30 border-red-500/40' },
};

export default function SimulationReplay() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [phaseFilter, setPhaseFilter] = useState('all');

  const { data: ticks = [], isLoading } = useQuery({
    queryKey: ['sim-replay-ticks'],
    queryFn: () => base44.entities.WorldTick.list('-created_date', 50),
  });

  const selectedTick = ticks[selectedIdx];

  const { data: tickEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['sim-replay-events', selectedTick?.id],
    queryFn: () => selectedTick
      ? base44.entities.TickEvent.filter({ tick_id: selectedTick.id }, 'created_date', 200)
      : [],
    enabled: !!selectedTick,
  });

  // Also fetch AuditEvents for this tick's time window
  const { data: auditEvents = [] } = useQuery({
    queryKey: ['sim-replay-audit', selectedTick?.id],
    queryFn: async () => {
      if (!selectedTick) return [];
      return base44.entities.AuditEvent.filter({ event_type: 'world_tick' }, '-created_date', 20);
    },
    enabled: !!selectedTick,
  });

  const filteredEvents = phaseFilter === 'all'
    ? tickEvents
    : tickEvents.filter((e) => e.event_type === phaseFilter || e.phase === phaseFilter);

  // Group by phase for the phase bar
  const phaseCounts = {};
  tickEvents.forEach((e) => { phaseCounts[e.event_type] = (phaseCounts[e.event_type] || 0) + 1; });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Activity className="w-5 h-5 animate-spin mr-2" /> Loading simulation history…
    </div>
  );

  if (ticks.length === 0) return (
    <div className="text-center py-20 text-gray-500">
      <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>No ticks recorded yet. The engine fires every 10 minutes.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tick timeline scrubber */}
      <Card className="glass-panel border border-gray-700">
        <CardHeader className="border-b border-gray-700 pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Play className="w-4 h-4 text-purple-400" /> Simulation Replay — Step Through History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Timeline bar */}
          <div className="flex gap-1 flex-wrap">
            {ticks.map((t, i) => (
              <button key={t.id} onClick={() => setSelectedIdx(i)}
                title={`Tick #${t.tick_number}`}
                className={`h-6 w-6 rounded text-xs font-bold transition-all ${i === selectedIdx
                  ? 'bg-purple-600 text-white scale-110'
                  : t.status === 'completed' ? 'bg-emerald-800/60 text-emerald-300 hover:bg-emerald-700/60'
                  : t.status === 'failed' ? 'bg-red-800/60 text-red-300'
                  : 'bg-slate-700 text-gray-400'
                  }`}>
                {t.tick_number}
              </button>
            ))}
          </div>

          {/* Nav controls */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => setSelectedIdx(ticks.length - 1)}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" disabled={selectedIdx >= ticks.length - 1} onClick={() => setSelectedIdx(i => i + 1)}>
              <ChevronLeft className="w-4 h-4" /> Older
            </Button>
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" disabled={selectedIdx <= 0} onClick={() => setSelectedIdx(i => i - 1)}>
              Newer <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => setSelectedIdx(0)}>
              Latest
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedTick && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tick summary */}
          <Card className="glass-panel border border-purple-500/30">
            <CardHeader className="border-b border-purple-500/20 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Tick #{selectedTick.tick_number}</CardTitle>
                {selectedTick.status === 'completed'
                  ? <Badge className="bg-green-900/40 text-green-300 border border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
                  : selectedTick.status === 'failed'
                  ? <Badge className="bg-red-900/40 text-red-300 border border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
                  : <Badge className="bg-yellow-900/40 text-yellow-300">Running</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              {[
                ['Duration', selectedTick.duration_ms ? `${selectedTick.duration_ms}ms` : '—'],
                ['Enterprises', selectedTick.enterprises_processed ?? '—'],
                ['Players', selectedTick.players_processed ?? '—'],
                ['Markets updated', selectedTick.market_items_updated ?? '—'],
                ['Territory income', `$${(selectedTick.total_income_distributed || 0).toLocaleString()}`],
                ['Production', selectedTick.total_production_generated ?? '—'],
                ['Wars processed', selectedTick.wars_processed ?? '—'],
                ['Events', selectedTick.events_triggered ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-white font-mono">{v}</span>
                </div>
              ))}

              {/* Phase timing breakdown */}
              {selectedTick.phase_timings && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-gray-400 mb-1">Phase Timings</p>
                  {Object.entries(selectedTick.phase_timings).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{k.replace(/_ms$/, '').replace(/_/g, ' ')}</span>
                      <span className="text-cyan-400 font-mono">{v || 0}ms</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedTick.error_log?.length > 0 && (
                <div className="pt-2 border-t border-red-500/20">
                  <p className="text-red-400 mb-1">Errors</p>
                  {selectedTick.error_log.map((e, i) => <p key={i} className="text-red-300">{e}</p>)}
                </div>
              )}

              <div className="text-gray-600 pt-2 border-t border-gray-700">
                <p>Started: {selectedTick.started_at ? new Date(selectedTick.started_at).toLocaleString() : '—'}</p>
                <p>Finished: {selectedTick.completed_at ? new Date(selectedTick.completed_at).toLocaleString() : '—'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Event log for this tick */}
          <div className="lg:col-span-2 space-y-3">
            {/* Phase filter pills */}
            <div className="flex flex-wrap gap-1">
              {['all', ...Object.keys(phaseCounts)].map((p) => (
                <button key={p} onClick={() => setPhaseFilter(p)}
                  className={`text-xs px-2 py-1 rounded-md border transition-all ${phaseFilter === p ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  {p === 'all' ? `All (${tickEvents.length})` : `${p.replace(/_/g, ' ')} (${phaseCounts[p]})`}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {eventsLoading ? (
                <p className="text-gray-400 text-center py-8">Loading events…</p>
              ) : filteredEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No events for this tick.</p>
              ) : filteredEvents.map((e) => {
                const meta = PHASE_META[e.event_type] || { label: e.event_type, icon: Activity, color: 'text-gray-400', bg: 'bg-slate-800/40 border-slate-700/30' };
                const Icon = meta.icon;
                return (
                  <div key={e.id} className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs ${meta.bg}`}>
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${meta.color}`}>{e.entity_name || '—'}</span>
                        {e.delta !== 0 && (
                          <span className={`font-mono ml-auto ${e.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {e.delta > 0 ? '+' : ''}{e.delta?.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <p className="text-gray-500 truncate mt-0.5">
                          {Object.entries(e.metadata).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                      <p className="text-gray-600 mt-0.5">{new Date(e.created_date).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}