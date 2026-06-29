import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Database, Radio, Webhook } from 'lucide-react';

// Read-only transparent endpoints the platform exposes. Documentation-style catalog.
const ENDPOINTS = [
  { group: 'World Statistics', method: 'GET', path: '/api/world/stats', proto: 'REST', desc: 'Aggregate world KPIs (players, orgs, economy, territories)' },
  { group: 'World Statistics', method: 'WS', path: '/api/world/stream', proto: 'WebSocket', desc: 'Real-time world metric push (live dashboards)' },
  { group: 'Market Prices', method: 'GET', path: '/api/market/prices', proto: 'REST', desc: 'Current commodity & black market prices' },
  { group: 'Market Prices', method: 'SUB', path: '/api/market/events', proto: 'Event Stream', desc: 'Subscribe to price-change events with lineage' },
  { group: 'Players', method: 'GET', path: '/api/players/:id', proto: 'REST', desc: 'Player profile, reputation, employment, achievements' },
  { group: 'Organizations', method: 'GET', path: '/api/organizations', proto: 'GraphQL', desc: 'Query orgs, departments, KPIs, finance (drill-down)' },
  { group: 'Employment', method: 'GET', path: '/api/employment', proto: 'REST', desc: 'Workforce, contracts, salaries, performance' },
  { group: 'Businesses', method: 'GET', path: '/api/businesses/:id/ledger', proto: 'REST', desc: 'Business financial ledger — every transaction' },
  { group: 'Infrastructure', method: 'GET', path: '/api/infrastructure', proto: 'REST', desc: 'Asset health, capacity, usage, lifetime cost' },
  { group: 'Regions', method: 'GET', path: '/api/regions', proto: 'REST', desc: 'Regional development & economy snapshots' },
  { group: 'Events', method: 'GET', path: '/api/events', proto: 'GraphQL', desc: 'Immutable event ledger with full provenance' },
  { group: 'Analytics', method: 'GET', path: '/api/analytics/historical', proto: 'REST', desc: 'Historical time-series for any metric' },
  { group: 'AI Decisions', method: 'GET', path: '/api/ai/decisions/:id', proto: 'REST', desc: 'Explainable AI decision record (inputs, reasoning, outcome)' },
];

const protoIcon = { REST: Database, WebSocket: Radio, 'Event Stream': Webhook, GraphQL: Globe };
const protoColor = { REST: 'text-cyan-400', WebSocket: 'text-green-400', 'Event Stream': 'text-purple-400', GraphQL: 'text-pink-400' };

export default function APILayer() {
  const groups = Array.from(new Set(ENDPOINTS.map((e) => e.group)));
  return (
    <Card className="glass-panel border border-gray-700">
      <CardHeader className="border-b border-gray-700">
        <CardTitle className="text-white text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> Read-Only API Layer</CardTitle>
        <p className="text-xs text-gray-400">Everything is exposed read-only for transparency. Supports REST, GraphQL, WebSockets, and Event Streams — all timestamped, transaction-IDed, and drill-downable.</p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {groups.map((g) => (
          <div key={g}>
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wide mb-2">{g}</p>
            <div className="space-y-1.5">
              {ENDPOINTS.filter((e) => e.group === g).map((e, i) => {
                const Icon = protoIcon[e.proto];
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 border border-gray-700">
                    <Badge variant="outline" className={`text-xs font-mono ${e.method === 'GET' ? 'text-green-400' : e.method === 'WS' ? 'text-blue-400' : 'text-purple-400'}`}>{e.method}</Badge>
                    <code className="text-xs text-gray-200 flex-1 break-all">{e.path}</code>
                    <span className={`text-xs flex items-center gap-1 ${protoColor[e.proto]}`}><Icon className="w-3 h-3" />{e.proto}</span>
                    <span className="text-xs text-gray-500 hidden md:block max-w-xs truncate">{e.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}