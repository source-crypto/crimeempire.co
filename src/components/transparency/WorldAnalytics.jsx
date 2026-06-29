import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Building2, Map, Coins, TrendingUp, Briefcase, Brain, Hammer, Swords, MousePointerClick } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import DrillDownModal, { DRILL_MAP } from './DrillDownModal';

const KPIS = [
  { key: 'Players', label: 'Players', icon: Users, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-900/20' },
  { key: 'Enterprises', label: 'Enterprises', icon: Building2, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-900/20' },
  { key: 'Territories', label: 'Territories', icon: Map, color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-900/20' },
  { key: 'Transactions', label: 'Transactions', icon: Coins, color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-900/20' },
  { key: 'Market', label: 'Market Prices', icon: TrendingUp, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-900/20' },
  { key: 'Employment', label: 'Employment', icon: Briefcase, color: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-900/20' },
  { key: 'AI Decisions', label: 'AI Decisions', icon: Brain, color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-900/20' },
  { key: 'Infrastructure', label: 'Infrastructure', icon: Hammer, color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-900/20' },
];

export default function WorldAnalytics() {
  const [drill, setDrill] = useState(null);

  const { data: counts, isLoading } = useQuery({
    queryKey: ['world-analytics'],
    queryFn: async () => {
      const [players, enterprises, territories, txns, prices, employ, aiDec, infra] = await Promise.all([
        base44.entities.Player.list('-created_date', 200),
        base44.entities.CriminalEnterprise.list('-created_date', 200),
        base44.entities.Territory.list('-created_date', 200),
        base44.entities.TransactionLog.list('-created_date', 200),
        base44.entities.CommodityPrice.list('-created_date', 50),
        base44.entities.Employment.list('-created_date', 200),
        base44.entities.AIDecisionLog.list('-created_date', 200),
        base44.entities.BaseFacility.list('-created_date', 200),
      ]);
      return {
        Players: players.length, Enterprises: enterprises.length, Territories: territories.length,
        Transactions: txns.length, Market: prices.length, Employment: employ.length,
        'AI Decisions': aiDec.length, Infrastructure: infra.length,
        prices,
      };
    },
  });

  // Drill-down events
  const { data: drillEvents, isFetching: drillLoading } = useQuery({
    queryKey: ['drill', drill],
    queryFn: async () => {
      if (!drill) return [];
      const f = DRILL_MAP[drill] || {};
      const events = await base44.entities.AuditEvent.filter(f, '-created_date', 50);
      return events;
    },
    enabled: !!drill,
  });

  // events-per-type bar chart
  const { data: eventBuckets } = useQuery({
    queryKey: ['event-buckets'],
    queryFn: async () => {
      const events = await base44.entities.AuditEvent.list('-created_date', 200);
      const map = {};
      events.forEach((e) => { map[e.event_type] = (map[e.event_type] || 0) + 1; });
      return Object.entries(map).map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }));
    },
  });

  const priceChart = (counts?.prices || []).map((p) => ({ name: p.commodity, price: p.current_price }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <button key={k.key} onClick={() => setDrill(k.key)}
              className={`text-left p-4 rounded-xl border ${k.border} ${k.bg} glass-panel hover:scale-[1.02] transition-all group`}>
              <div className="flex items-center justify-between">
                <Icon className={`w-6 h-6 ${k.color}`} />
                <MousePointerClick className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-bold text-white mt-2">{isLoading ? '…' : (counts?.[k.key] ?? 0)}</p>
              <p className="text-xs text-gray-400">{k.label}</p>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 flex items-center gap-1"><MousePointerClick className="w-3 h-3" />Every number is clickable — click any KPI to drill down to its originating events.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-panel border border-gray-700">
          <CardHeader className="border-b border-gray-700"><CardTitle className="text-white text-sm">Event Volume by Type (live)</CardTitle></CardHeader>
          <CardContent className="p-4">
            {eventBuckets?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eventBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#9333EA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-gray-500 text-center py-16">No events recorded yet.</p>}
          </CardContent>
        </Card>
        <Card className="glass-panel border border-gray-700">
          <CardHeader className="border-b border-gray-700"><CardTitle className="text-white text-sm">Commodity Prices (live)</CardTitle></CardHeader>
          <CardContent className="p-4">
            {priceChart.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={priceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #475569', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="price" stroke="#06B6D4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-gray-500 text-center py-16">No market data yet.</p>}
          </CardContent>
        </Card>
      </div>

      <DrillDownModal
        open={!!drill}
        category={drill || ''}
        valueLabel={drill ? `Aggregate metric: ${drill} (${counts?.[drill] ?? 0})` : ''}
        onClose={() => setDrill(null)}
        events={drillEvents || []}
        loading={drillLoading}
      />
    </div>
  );
}