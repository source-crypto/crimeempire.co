import React, { useState } from 'react';
import { Activity, Database, Brain, Network, Globe, ArrowRight } from 'lucide-react';
import WorldAnalytics from '@/components/transparency/WorldAnalytics';
import EventLedger from '@/components/transparency/EventLedger';
import AIInspector from '@/components/transparency/AIInspector';
import KnowledgeGraph from '@/components/transparency/KnowledgeGraph';
import APILayer from '@/components/transparency/APILayer';

const TABS = [
  { id: 'analytics', label: 'World Analytics', icon: Activity },
  { id: 'ledger', label: 'Event Ledger', icon: Database },
  { id: 'ai', label: 'AI Inspector', icon: Brain },
  { id: 'graph', label: 'Knowledge Graph', icon: Network },
  { id: 'api', label: 'API Layer', icon: Globe },
];

// The platform's data-flow pipeline — every operation is timestamped & transaction-IDed.
const PIPELINE = ['Player Input', 'Auth', 'Permissions', 'Game Logic', 'Simulation Engine', 'Event Queue', 'Business Logic', 'Database', 'Analytics Engine', 'Live Dashboards', 'Client Updates'];

export default function TransparencyPlatform() {
  const [tab, setTab] = useState('analytics');

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Transparency Platform</h1>
        <p className="text-gray-400 mt-1">A living, server-authoritative simulation where every action, transaction, and system update is traceable, explainable, and visible through integrated analytics. Nothing is hidden.</p>
      </div>

      {/* Data flow pipeline */}
      <div className="glass-panel border border-gray-700 rounded-xl p-4 overflow-x-auto">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Data Flow Architecture</p>
        <div className="flex items-center gap-1 min-w-max">
          {PIPELINE.map((stage, i) => (
            <React.Fragment key={stage}>
              <span className={`text-xs px-3 py-1.5 rounded-md border ${i === 8 ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 bg-slate-900/50 text-gray-300'}`}>{stage}</span>
              {i < PIPELINE.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${tab === t.id ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'analytics' && <WorldAnalytics />}
      {tab === 'ledger' && <EventLedger />}
      {tab === 'ai' && <AIInspector />}
      {tab === 'graph' && <KnowledgeGraph />}
      {tab === 'api' && <APILayer />}
    </div>
  );
}