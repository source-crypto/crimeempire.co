import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import ShiftAssignmentForm from '@/components/shifts/ShiftAssignmentForm';
import LiveShiftBoard from '@/components/shifts/LiveShiftBoard';
import { toast } from 'sonner';

export default function ShiftManagement() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(id); }, []);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0] || null; },
    enabled: !!user?.email,
  });
  const crewId = playerData?.crew_id;
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: crewId }, '-created_date', 100),
    enabled: !!crewId,
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ['crewShifts', crewId],
    queryFn: () => base44.entities.CrewShift.filter({ crew_id: crewId }, '-created_date', 100),
    enabled: !!crewId,
  });

  const assignMutation = useMutation({
    mutationFn: async (payload) => {
      const m = members.find(x => x.id === payload.crew_member_id);
      if (!m) throw new Error('Member not found');
      const t = Date.now();
      const st = new Date(payload.scheduled_start).getTime();
      const status = t >= st ? 'active' : 'scheduled';
      await base44.entities.CrewShift.create({
        crew_id: crewId,
        crew_member_id: m.id,
        crew_member_name: m.member_name,
        player_id: playerData.id,
        duty_type: payload.duty_type,
        status,
        scheduled_start: payload.scheduled_start,
        scheduled_end: payload.scheduled_end,
        activity_score: 0,
        events_logged: 0,
        notes: payload.notes || '',
      });
    },
    onSuccess: () => { queryClient.invalidateQueries(['crewShifts']); toast.success('Shift assigned'); },
    onError: (e) => toast.error(e.message),
  });

  const endMutation = useMutation({
    mutationFn: async (shift) => {
      const st = new Date(shift.scheduled_start).getTime();
      const en = new Date(shift.scheduled_end).getTime();
      const elapsed = Math.max(0, Math.min(1, (Date.now() - st) / (en - st || 1)));
      const perf = Math.round(60 + elapsed * 35 + Math.random() * 5);
      await base44.entities.CrewShift.update(shift.id, {
        status: 'completed',
        activity_score: Math.round(elapsed * 100),
        events_logged: Math.round(elapsed * 8),
        last_activity_at: new Date().toISOString(),
        performance_rating: Math.min(100, perf),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries(['crewShifts']); toast.success('Shift ended — performance logged'); },
    onError: (e) => toast.error(e.message),
  });

  if (!playerData) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  if (!crewId) return (
    <Card className="glass-panel border-purple-500/20"><CardContent className="p-10 text-center text-gray-400">Join or create a crew to manage shifts.</CardContent></Card>
  );

  const onDutyCount = shifts.filter(s => {
    if (s.status === 'completed' || s.status === 'missed') return false;
    const t = now.getTime();
    return t >= new Date(s.scheduled_start).getTime() && t <= new Date(s.scheduled_end).getTime();
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2"><Clock className="w-7 h-7 text-cyan-400" /> Shift Management</h1>
        <p className="text-gray-400 mt-1">Assign active duty hours, track who's working in real-time, and log performance on completion</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-panel border-purple-500/20"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-400">{onDutyCount}</p><p className="text-xs text-gray-400">On Duty Now</p></CardContent></Card>
        <Card className="glass-panel border-purple-500/20"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-cyan-400">{members.length}</p><p className="text-xs text-gray-400">Crew Members</p></CardContent></Card>
        <Card className="glass-panel border-purple-500/20"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-purple-400">{shifts.length}</p><p className="text-xs text-gray-400">Total Shifts</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          {membersLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div> : (
            <ShiftAssignmentForm members={members} onAssign={(p) => assignMutation.mutate(p)} assigning={assignMutation.isPending} />
          )}
        </div>
        <div className="lg:col-span-2">
          <LiveShiftBoard shifts={shifts} now={now} onEnd={(s) => endMutation.mutate(s)} />
        </div>
      </div>
    </div>
  );
}