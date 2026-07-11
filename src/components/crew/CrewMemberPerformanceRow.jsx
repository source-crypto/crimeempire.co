import React from 'react';
import { Badge } from '@/components/ui/badge';

const ROLE_LABELS = {
  enforcer: 'Enforcer', hacker: 'Hacker', driver: 'Driver',
  strategist: 'Strategist', smuggler: 'Smuggler', negotiator: 'Negotiator',
};

const STATUS_META = {
  available: { label: 'Available', cls: 'bg-green-600' },
  on_mission: { label: 'On Mission', cls: 'bg-cyan-600' },
  injured: { label: 'Injured', cls: 'bg-red-600' },
  training: { label: 'Training', cls: 'bg-purple-600' },
  resting: { label: 'Resting', cls: 'bg-yellow-600' },
};

function ratingColor(v) {
  if (v >= 80) return 'text-green-400';
  if (v >= 60) return 'text-yellow-400';
  if (v >= 40) return 'text-orange-400';
  return 'text-red-400';
}
function barColor(v) {
  if (v >= 80) return 'bg-green-500';
  if (v >= 60) return 'bg-yellow-500';
  if (v >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function CrewMemberPerformanceRow({ member }) {
  const skills = member.skills || {};
  const vals = ['combat', 'stealth', 'driving', 'hacking', 'negotiation'].map(k => skills[k] ?? 0);
  const skillsAvg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
  const performance = Math.round(skillsAvg * 0.7 + (member.morale ?? 75) * 0.3);
  const standing = Math.round((member.morale ?? 75) * 0.5 + (member.loyalty ?? 50) * 0.5);
  const status = STATUS_META[member.status] || STATUS_META.available;
  const role = ROLE_LABELS[member.member_type] || member.member_type;

  return (
    <div className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-b border-purple-500/10 hover:bg-purple-900/10">
      <div className="col-span-12 md:col-span-3">
        <p className="text-white font-medium">{member.member_name}</p>
        <p className="text-xs text-gray-500">{member.current_assignment || 'Unassigned'} · ${member.salary?.toLocaleString() || 500}/cycle</p>
      </div>
      <div className="col-span-6 md:col-span-3">
        <p className="text-sm text-cyan-300 font-medium">{role}</p>
        <p className="text-xs text-gray-400">Level {member.level ?? 1} · XP {member.experience ?? 0}</p>
      </div>
      <div className="col-span-6 md:col-span-3">
        <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Reputation</span><span className={ratingColor(standing)}>{standing}</span></div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor(standing)}`} style={{ width: `${standing}%` }} /></div>
      </div>
      <div className="col-span-6 md:col-span-2">
        <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Performance</span><span className={ratingColor(performance)}>{performance}</span></div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor(performance)}`} style={{ width: `${performance}%` }} /></div>
      </div>
      <div className="col-span-6 md:col-span-1 flex md:justify-end">
        <Badge className={`${status.cls} text-white text-xs`}>{status.label}</Badge>
      </div>
    </div>
  );
}