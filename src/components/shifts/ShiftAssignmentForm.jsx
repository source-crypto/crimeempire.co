import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

const DUTIES = [
  { value: 'patrol', label: '🚔 Patrol' },
  { value: 'smuggling', label: '🚚 Smuggling Run' },
  { value: 'lookout', label: '👀 Lookout' },
  { value: 'enforcement', label: '👊 Enforcement' },
  { value: 'logistics', label: '📦 Logistics' },
  { value: 'recon', label: '🔍 Recon' },
  { value: 'training', label: '🎓 Training' },
  { value: 'rest', label: '😴 Rest' },
];

function toLocalInput(d) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ShiftAssignmentForm({ members, onAssign, assigning }) {
  const [memberId, setMemberId] = useState('');
  const [duty, setDuty] = useState('patrol');
  const [start, setStart] = useState(toLocalInput(new Date()));
  const [end, setEnd] = useState(toLocalInput(new Date(Date.now() + 4 * 3600000)));
  const [notes, setNotes] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!memberId) return;
    onAssign({
      crew_member_id: memberId,
      duty_type: duty,
      scheduled_start: new Date(start).toISOString(),
      scheduled_end: new Date(end).toISOString(),
      notes,
    });
  };

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" /> Assign Active Duty</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Crew Member</Label>
            <select value={memberId} onChange={e => setMemberId(e.target.value)} className="w-full mt-1 bg-slate-900/60 border border-purple-500/30 rounded-md px-3 py-2 text-sm text-white">
              <option value="">Select member…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.member_name} · {m.member_type}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Duty Type</Label>
            <select value={duty} onChange={e => setDuty(e.target.value)} className="w-full mt-1 bg-slate-900/60 border border-purple-500/30 rounded-md px-3 py-2 text-sm text-white">
              {DUTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-400">Start</Label>
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="w-full mt-1 bg-slate-900/60 border border-purple-500/30 rounded-md px-2 py-2 text-sm text-white" />
            </div>
            <div>
              <Label className="text-xs text-gray-400">End</Label>
              <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="w-full mt-1 bg-slate-900/60 border border-purple-500/30 rounded-md px-2 py-2 text-sm text-white" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Notes (optional)</Label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 bg-slate-900/60 border border-purple-500/30 rounded-md px-3 py-2 text-sm text-white" placeholder="Special instructions…" />
          </div>
          <Button type="submit" disabled={!memberId || assigning} className="w-full bg-gradient-to-r from-cyan-600 to-purple-600">
            <Clock className="w-4 h-4 mr-1" /> Assign Shift
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}