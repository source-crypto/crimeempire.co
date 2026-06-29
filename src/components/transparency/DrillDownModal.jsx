import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Link2, ArrowRight } from 'lucide-react';

// Maps a KPI category to the AuditEvent query filter used for drill-down.
export const DRILL_MAP = {
  Players: { event_type: 'player_action' },
  Enterprises: { event_type: 'enterprise_production' },
  Territories: { event_type: 'territory_change' },
  Transactions: { event_type: 'transaction' },
  Market: { event_type: 'market_update' },
  Employment: { event_type: 'employment' },
  'AI Decisions': { event_type: 'ai_decision' },
  Infrastructure: { event_type: 'infrastructure' },
  Combat: { event_type: 'combat' },
};

export default function DrillDownModal({ open, category, valueLabel, onClose, events, loading }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel border-purple-500/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-400" /> Drill-Down: {category}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {valueLabel}. Every number links to its originating events. Showing the constituent transactions.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading lineage…</div>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No recorded events for this metric yet.</p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className="p-3 rounded-lg bg-slate-900/60 border border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-purple-300">{e.event_id}</span>
                    <Badge variant="outline" className="text-xs text-gray-400">{e.event_type}</Badge>
                  </div>
                  <p className="text-sm text-white">{e.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                    {e.actor_name && <span>Actor: <span className="text-gray-200">{e.actor_name}</span></span>}
                    {e.target_name && <span><ArrowRight className="w-3 h-3 inline" /> {e.target_name}</span>}
                    {e.source && <span>· src: {e.source}</span>}
                    {e.location && <span>· loc: {e.location}</span>}
                  </div>
                  {(e.value_before || e.value_after) ? (
                    <div className="mt-1 text-xs">
                      <span className="text-gray-400">Value: </span>
                      <span className="text-gray-300">{e.value_before}</span> <ArrowRight className="w-3 h-3 inline" /> <span className="text-green-400">{e.value_after}</span>
                      <span className="text-gray-500"> (Δ {e.delta > 0 ? '+' : ''}{e.delta})</span>
                    </div>
                  ) : null}
                  {e.dependencies?.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">Depends on: {e.dependencies.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}