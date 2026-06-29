import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CAREER_PATHS, getCareerPath, getLevel, getNextLevel, xpToPromote } from './careerPaths';
import { Briefcase, TrendingUp, Award, Coins, ArrowUpCircle } from 'lucide-react';

export default function CareerDashboard({ employment, onPromote, onCollect, pendingPay }) {
  const path = getCareerPath(employment.career_path);
  const level = getLevel(employment.career_path, employment.career_level);
  const next = getNextLevel(employment.career_path, employment.career_level);
  const xpNeeded = xpToPromote(employment.career_level);
  const canPromote = next && employment.experience_points >= xpNeeded && employment.performance_rating >= 65;

  const statusConfig = {
    employed: { label: 'Employed', variant: 'bg-green-700' },
    self_employed: { label: 'Self-Employed', variant: 'bg-purple-700' },
    seeking: { label: 'Seeking Work', variant: 'bg-yellow-700' },
    unemployed: { label: 'Unemployed', variant: 'bg-gray-700' },
    retired: { label: 'Retired', variant: 'bg-blue-800' },
  };
  const st = statusConfig[employment.employment_status] || statusConfig.seeking;

  return (
    <div className="space-y-4">
      {/* Current Position */}
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20 flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2"><Briefcase className="w-5 h-5 text-purple-400" />Current Position</CardTitle>
          <Badge className={st.variant}>{st.label}</Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl border ${path.accent}`}>{path.icon}</div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white">{level.title}</h3>
              <p className="text-sm text-gray-400">{path.name} · Level {level.level} · {employment.employer_name || 'No employer'}</p>
              <p className="text-xs text-gray-500">{level.responsibility}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Base Salary</p>
              <p className="text-xl font-bold text-green-400">${(employment.salary || level.salary).toLocaleString()}</p>
              <p className="text-xs text-gray-500">/ {employment.pay_type === 'hourly' ? 'hour' : 'cycle'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Performance" value={`${employment.performance_rating}/100`} icon={<TrendingUp className="w-3 h-3" />} tone={employment.performance_rating >= 75 ? 'text-green-400' : 'text-yellow-400'} />
            <Stat label="Experience" value={`${employment.experience_points} XP`} icon={<Award className="w-3 h-3" />} />
            <Stat label="Tenure" value={`${employment.tenure_days} days`} icon={<Briefcase className="w-3 h-3" />} />
            <Stat label="Pension" value={`$${(employment.pension_accrued || 0).toLocaleString()}`} icon={<Coins className="w-3 h-3" />} tone="text-blue-400" />
          </div>

          {employment.employment_status !== 'retired' && employment.employment_status !== 'self_employed' && (
            <Button onClick={onCollect} disabled={pendingPay} className="w-full bg-green-600 hover:bg-green-700">
              {pendingPay ? 'Collecting…' : `💰 Collect Paycheck (+$${Math.floor((employment.salary || level.salary) * 0.78).toLocaleString()} net)`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Promotion Track */}
      {next && (
        <Card className="glass-panel border border-cyan-500/20">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="text-cyan-400 text-sm flex items-center gap-2"><ArrowUpCircle className="w-4 h-4" />Promotion Track</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-semibold">{level.title}</span>
              <span className="text-gray-500">→</span>
              <span className="text-cyan-300 font-semibold">{next.title}</span>
              <span className="text-green-400 ml-auto">+${(next.salary - (employment.salary || level.salary)).toLocaleString()}/cycle</span>
            </div>

            <div className="space-y-2">
              <ProgressRow label="Experience" current={employment.experience_points} max={xpNeeded} color="bg-cyan-500" />
              <ProgressRow label="Performance (need 65+)" current={employment.performance_rating} max={100} color="bg-green-500" />
            </div>

            <div className="text-xs text-gray-400 bg-slate-900/50 rounded p-2 border border-gray-700">
              {canPromote
                ? '✅ Eligible for promotion!'
                : `Need ${Math.max(0, xpNeeded - employment.experience_points)} more XP${employment.performance_rating < 65 ? ` and performance ≥ 65 (currently ${employment.performance_rating})` : ''}.`}
            </div>

            <Button onClick={onPromote} disabled={!canPromote} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40">
              ⬆️ Promote to {next.title}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Full Career Ladder */}
      <Card className="glass-panel border border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <CardTitle className="text-white text-sm">{path.name} Career Ladder</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {path.levels.map((l) => (
              <div key={l.level} className={`px-3 py-2 rounded-lg border text-xs ${l.level === employment.career_level ? path.accent + ' ring-1 ring-purple-500' : 'border-gray-700 bg-slate-900/40'}`}>
                <p className="font-semibold text-white">{l.title}</p>
                <p className="text-gray-500">Lv {l.level} · ${l.salary.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">{path.description}</p>
        </CardContent>
      </Card>

      {/* All paths overview */}
      <Card className="glass-panel border border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <CardTitle className="text-white text-sm">All Career Paths</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {CAREER_PATHS.map((p) => (
            <div key={p.key} className={`p-3 rounded-lg border ${p.accent}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{p.icon}</span>
                <span className={`font-semibold ${p.color}`}>{p.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{p.levels.length} levels</Badge>
              </div>
              <p className="text-xs text-gray-400">{p.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon, tone }) {
  return (
    <div className="p-2 rounded-lg bg-slate-900/50 border border-gray-700">
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">{icon}{label}</p>
      <p className={`font-bold ${tone || 'text-white'}`}>{value}</p>
    </div>
  );
}

function ProgressRow({ label, current, max, color }) {
  const pct = Math.min(100, (current / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1"><span>{label}</span><span>{current}/{max}</span></div>
      <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}