import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronDown, ChevronRight, Activity, Filter } from 'lucide-react';

const TYPES = ['all', 'transaction', 'market_update', 'enterprise_production', 'territory_change', 'ai_decision', 'infrastructure', 'employment', 'alliance', 'combat', 'trade', 'world_tick', 'admin', 'player_action', 'research', 'construction'];

const typeColor = (t) => ({
  transaction: 'text-cyan-400', market_update: 'text-purple-400', enterprise_production: 'text-amber-400',
  territory_change: 'text-green-400', ai_decision: 'text-violet-400', combat: 'text-red-400', trade: 'text-cyan-400',
  employment: 'text-pink-400', infrastructure: 'text-orange-400', world_tick: 'text-gray-400', admin: 'text-yellow-400',
}[t] || 'text-gray-400');

export default function EventLedger() {
  const queryClient = useQueryClient();
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ['audit-events', type],
    queryFn: async () => {
      const f = type === 'all' ? {} : { event_type: type };
      return base44.entities.AuditEvent.filter(f, '-created_date', 100);
    },
    refetchInterval: 15000,
  });

  // Real-time: subscribe to new AuditEvents
  useEffect(() => {
    const unsub = base44.entities.AuditEvent.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    });
    return () => unsub && unsub();
  }, [queryClient]);

  const filtered = (events || []).filter((e) =>
    !search || (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.actor_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.event_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="glass-panel border border-gray-700">
      <CardHeader className="border-b border-gray-700">
        <CardTitle className="text-white text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400" /> Immutable Event Ledger</CardTitle>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="bg-slate-800 text-gray-200 text-xs rounded-md border border-gray-700 px-2 py-1">
            {TYPES.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}</option>)}
          </select>
          <Input placeholder="Search events, actors, IDs…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-8 text-xs bg-slate-800 border-gray-700" />
          <Badge className="bg-slate-700 text-gray-300">{filtered.length} events</Badge>
          <span className="text-xs text-green-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading ledger…</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-12 text-center">No events match. The ledger is immutable — every action creates a record.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map((e) => (
              <div key={e.id} className="hover:bg-slate-800/40">
                <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="w-full text-left p-3 flex items-center gap-3">
                  {expanded === e.id ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <span className="text-xs font-mono text-purple-300 w-40 truncate">{e.event_id}</span>
                  <Badge variant="outline" className={`text-xs capitalize ${typeColor(e.event_type)}`}>{e.event_type.replace(/_/g, ' ')}</Badge>
                  <span className="text-sm text-gray-200 flex-1 truncate">{e.description}</span>
                  <span className="text-xs text-gray-500">{e.actor_name || 'system'}</span>
                  <span className="text-xs text-gray-600">{new Date(e.created_date).toLocaleTimeString()}</span>
                </button>
                {expanded === e.id && (
                  <div className="px-12 pb-3 text-xs space-y-1 bg-slate-900/40">
                    <Row label="Unique ID" value={e.event_id} />
                    <Row label="Timestamp" value={new Date(e.created_date).toISOString()} />
                    <Row label="Source" value={e.source} />
                    <Row label="Target" value={`${e.target_name || '—'} (${e.target_type || '—'})`} />
                    <Row label="Actor" value={`${e.actor_name || '—'} (${e.actor_type || '—'})`} />
                    <Row label="Location" value={e.location || '—'} />
                    {e.value_before !== 0 || e.value_after !== 0 ? (
                      <Row label="Value Δ" value={`${e.value_before} → ${e.value_after} (Δ ${e.delta > 0 ? '+' : ''}${e.delta})`} />
                    ) : null}
                    <Row label="Dependencies" value={e.dependencies?.length ? e.dependencies.join(', ') : 'none'} />
                    <Row label="Audit Hash" value={e.audit_hash || '—'} />
                    {e.metadata && <Row label="Metadata" value={JSON.stringify(e.metadata)} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const Row = ({ label, value }) => (
  <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">{label}:</span><span className="text-gray-200 break-all">{value}</span></div>
);