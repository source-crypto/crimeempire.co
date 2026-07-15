import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';

const DUTY_META = {
  patrol: { icon: '🚔', color: 'text-blue-400' },
  smuggling: { icon: '🚚', color: 'text-amber-400' },
  lookout: { icon: '👀', color: 'text-cyan-400' },
  enforcement: { icon: '👊', color: 'text-red-400' },
  logistics: { icon: '📦', color: 'text-indigo-400' },
  recon: { icon: '🔍', color: 'text-purple-400' },
  training: { icon: '🎓', color: 'text-green-400' },
  rest: { icon: '😴', color: 'text-gray-400' },
};

const STATUS_META = {
  scheduled: { label: 'Scheduled', cls: 'bg-slate-600 text-white' },
  active: { label: '● On Duty', cls: 'bg-green-600 text-white' },
  overdue: { label: 'Overdue', cls: 'bg-orange-600 text-white' },
  completed: { label: 'Completed', cls: 'bg-blue-700 text-white' },
  missed: { label: 'Missed', cls: 'bg-red-800 text-white' },
};

function fmt(ts) { try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return '--'; } }

export default function ShiftCard({ shift, now, onEnd }) {
  const meta = DUTY_META[shift.duty_type] || DUTY_META.patrol;
  const s = new Date(shift.scheduled_start).getTime();
  const e = new Date(shift.scheduled_end).getTime();
  const t = now.getTime();
  let liveStatus = shift.status;
  if (shift.status === 'scheduled' || shift.status === 'active') {
    if (t < s) liveStatus = 'scheduled';
    else if (t > e) liveStatus = 'overdue';
    else liveStatus = 'active';
  }
  const elapsed = e > s ? Math.max(0, Math.min(1, (t - s) / (e - s))) : 0;
  const remainingMin = liveStatus === 'active' ? Math.max(0, Math.round((e - t) / 60000)) : 0;
  const liveActivity = liveStatus === 'active' ? Math.round(elapsed * 100) : (shift.activity_score || 0);
  const sm = STATUS_META[liveStatus] || STATUS_META.scheduled;

  return (
    <Card className={`glass-panel ${liveStatus === 'active' ? 'border-green-500/40' : 'border-purple-500/20'}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <p className="text-sm font-bold text-white">{shift.crew_member_name}</p>
              <p className={`text-xs ${meta.color}`}>{shift.duty_type}</p>
            </div>
          </div>
          <Badge className={sm.cls}>{sm.label}</Badge>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>{fmt(shift.scheduled_start)} – {fmt(shift.scheduled_end)}</span>
          {liveStatus === 'active' && <span className="text-green-400">{remainingMin}m left</span>}
          {liveStatus === 'scheduled' && <span>{Math.max(0, Math.round((s - t) / 60000))}m to start</span>}
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-gray-400 mb-0.5"><span>Activity</span><span>{liveActivity}/100</span></div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${liveStatus === 'active' ? 'bg-gradient-to-r from-green-500 to-cyan-400' : 'bg-slate-600'}`} style={{ width: `${liveActivity}%` }} />
          </div>
        </div>
        {liveStatus === 'completed' && shift.performance_rating > 0 && (
          <p className="text-xs text-cyan-300 mt-2">Performance: {shift.performance_rating}/100</p>
        )}
        {liveStatus === 'active' && onEnd && (
          <Button size="sm" variant="outline" className="w-full mt-2 text-gray-300 border-purple-500/30" onClick={onEnd}>
            <Square className="w-3 h-3 mr-1" /> End Shift
          </Button>
        )}
      </CardContent>
    </Card>
  );
}