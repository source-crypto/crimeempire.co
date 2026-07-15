import React from 'react';
import ShiftCard from './ShiftCard';
import { Radio, CalendarClock, CheckCircle2 } from 'lucide-react';

export default function LiveShiftBoard({ shifts = [], now, onEnd }) {
  const t = now.getTime();
  const live = (s) => {
    const st = new Date(s.scheduled_start).getTime(), en = new Date(s.scheduled_end).getTime();
    if (s.status === 'completed') return 'completed';
    if (s.status === 'missed') return 'missed';
    if (t < st) return 'scheduled';
    if (t > en) return 'overdue';
    return 'active';
  };
  const active = shifts.filter(s => live(s) === 'active');
  const upcoming = shifts.filter(s => live(s) === 'scheduled');
  const done = shifts.filter(s => ['completed', 'missed', 'overdue'].includes(live(s))).slice(0, 6);

  const Section = ({ icon: Icon, title, items, color }) => items.length === 0 ? null : (
    <div>
      <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${color}`}><Icon className="w-4 h-4" /> {title} <span className="text-gray-500">({items.length})</span></h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(s => <ShiftCard key={s.id} shift={s} now={now} onEnd={live(s) === 'active' ? () => onEnd(s) : undefined} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {active.length === 0 && upcoming.length === 0 && done.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No shifts scheduled. Assign active duty to your crew.</p>
      )}
      <Section icon={Radio} title="On Duty Now" items={active} color="text-green-400" />
      <Section icon={CalendarClock} title="Upcoming Shifts" items={upcoming} color="text-cyan-400" />
      <Section icon={CheckCircle2} title="Recent / Completed" items={done} color="text-gray-400" />
    </div>
  );
}