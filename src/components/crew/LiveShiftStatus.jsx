import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Radio } from 'lucide-react';

export default function LiveShiftStatus({ crewId }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(id); }, []);
  const { data: shifts = [] } = useQuery({
    queryKey: ['crewShifts', crewId],
    queryFn: () => base44.entities.CrewShift.filter({ crew_id: crewId }, '-created_date', 50),
    enabled: !!crewId,
  });
  const t = now.getTime();
  const onDuty = shifts.filter(s => {
    if (s.status === 'completed' || s.status === 'missed') return false;
    const st = new Date(s.scheduled_start).getTime(), en = new Date(s.scheduled_end).getTime();
    return t >= st && t <= en;
  });
  return (
    <Card className="glass-panel border-green-500/30">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-2"><Radio className="w-4 h-4 text-green-400 animate-pulse" /> Live Shift Status</h3>
        {onDuty.length === 0 ? (
          <p className="text-xs text-gray-500">No crew members currently on active duty. <span className="text-cyan-400">Assign shifts →</span></p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-green-400 mb-1">{onDuty.length} on duty now</p>
            {onDuty.map(s => {
              const en = new Date(s.scheduled_end).getTime();
              const remaining = Math.max(0, Math.round((en - t) / 60000));
              return (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-white">{s.crew_member_name}</span>
                  <span className="text-gray-400">{s.duty_type} · {remaining}m left</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}