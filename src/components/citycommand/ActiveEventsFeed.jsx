import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Radio } from 'lucide-react';

const SEV_COLOR = { minor: 'text-green-400 border-green-500/30', moderate: 'text-yellow-400 border-yellow-500/30', major: 'text-orange-400 border-orange-500/30', catastrophic: 'text-red-400 border-red-500/30' };

export default function ActiveEventsFeed({ events = [] }) {
  return (
    <Card className="glass-panel border-red-500/20">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center gap-2"><Radio className="w-4 h-4 text-red-400" /> Active Events</h3>
        {events.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">No active world events. The city is quiet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {events.map(e => (
              <div key={e.id} className={`p-2 rounded-lg bg-slate-900/40 border ${SEV_COLOR[e.severity] || 'border-purple-500/20'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {e.event_name}</p>
                  <span className={`text-[10px] uppercase ${SEV_COLOR[e.severity]?.split(' ')[0] || 'text-gray-400'}`}>{e.severity}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{e.description}</p>
                <p className="text-[10px] text-gray-500 mt-1">Type: {e.event_type}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}