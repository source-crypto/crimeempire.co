import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCareerPath, getLevel } from './careerPaths';
import { Receipt, TrendingUp, GraduationCap, Scroll } from 'lucide-react';

// Fully transparent salary breakdown — every value is derived and explained.
export function computeSalaryBreakdown(employment) {
  const path = getCareerPath(employment.career_path);
  const level = getLevel(employment.career_path, employment.career_level);
  const base = employment.salary || level.salary || 0;
  const perf = employment.performance_rating || 0;
  const bonusPct = Math.max(0, (perf - 70) * 0.5); // perf above 70 → bonus
  const bonus = Math.floor(base * (bonusPct / 100));
  const overtime = Math.floor(base * 0.05); // flat overtime allowance
  const gross = base + bonus + overtime;
  const taxes = Math.floor(gross * 0.22);
  const insurance = Math.floor(gross * 0.04);
  const pension = Math.floor(gross * 0.06);
  const net = gross - taxes - insurance - pension;
  return { base, bonus, bonusPct, overtime, gross, taxes, insurance, pension, net };
}

export default function TransparencyPanel({ employment }) {
  const path = getCareerPath(employment.career_path);
  const level = getLevel(employment.career_path, employment.career_level);
  const next = path.levels.find((l) => l.level === employment.career_level + 1);
  const b = computeSalaryBreakdown(employment);

  const rows = [
    { label: 'Base Salary', value: b.base, tone: 'text-white', note: employment.pay_type === 'hourly' ? 'hourly rate' : 'per cycle' },
    { label: `Performance Bonus (${b.bonusPct.toFixed(1)}%)`, value: b.bonus, tone: 'text-green-400', note: `(perf ${employment.performance_rating} − 70) × 0.5%` },
    { label: 'Overtime Allowance (5%)', value: b.overtime, tone: 'text-green-400', note: 'base × 5%' },
    { label: 'Gross Pay', value: b.gross, tone: 'text-cyan-300', note: 'sum of above', bold: true },
    { label: 'Income Tax (22%)', value: -b.taxes, tone: 'text-red-400', note: 'gross × 22%' },
    { label: 'Health Insurance (4%)', value: -b.insurance, tone: 'text-red-400', note: 'gross × 4%' },
    { label: 'Pension Contribution (6%)', value: -b.pension, tone: 'text-blue-400', note: 'gross × 6% → pension' },
    { label: 'Net Pay', value: b.net, tone: 'text-green-400', note: 'gross − deductions', bold: true },
  ];

  return (
    <div className="space-y-4">
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center gap-2"><Receipt className="w-5 h-5 text-purple-400" />Salary Breakdown — Full Transparency</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-1">
          {rows.map((r, i) => (
            <div key={i} className={`flex items-center justify-between py-1.5 ${r.bold ? 'border-t border-gray-700 mt-1 font-bold' : ''}`}>
              <div>
                <p className={`text-sm ${r.tone}`}>{r.label}</p>
                <p className="text-xs text-gray-500">{r.note}</p>
              </div>
              <p className={`text-sm ${r.tone} ${r.bold ? 'text-base' : ''}`}>{r.value < 0 ? '-' : ''}${Math.abs(r.value).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Promotion Requirements */}
      <Card className="glass-panel border border-cyan-500/20">
        <CardHeader className="border-b border-cyan-500/20">
          <CardTitle className="text-cyan-400 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" />Promotion Requirements</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-sm">
          <ReqRow label="Current Level" value={`${level.title} (Lv ${level.level})`} />
          {next ? (
            <>
              <ReqRow label="Next Level" value={`${next.title} (Lv ${next.level})`} />
              <ReqRow label="Required Experience" value={`${500 + employment.career_level * 250} XP`} />
              <ReqRow label="Current Experience" value={`${employment.experience_points} XP`} />
              <ReqRow label="Required Performance" value="≥ 65 / 100" />
              <ReqRow label="Current Performance" value={`${employment.performance_rating} / 100`} />
              <ReqRow label="New Salary" value={`$${next.salary.toLocaleString()} / cycle`} />
              <div className="bg-slate-900/50 rounded p-2 border border-gray-700 text-xs text-gray-400 mt-2">
                <p className="font-semibold text-gray-300 mb-1">Unlocks on promotion:</p>
                <p>• Higher income & leadership bonuses</p>
                <p>• {next.responsibility}</p>
                <p>• Management tools & decision authority</p>
              </div>
            </>
          ) : (
            <p className="text-cyan-300 text-sm">🏆 You've reached the top of the {path.name} career path.</p>
          )}
        </CardContent>
      </Card>

      {/* Education / Certifications */}
      <Card className="glass-panel border border-emerald-500/20">
        <CardHeader className="border-b border-emerald-500/20">
          <CardTitle className="text-emerald-400 text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4" />Education & Certifications</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {(employment.certifications || []).length === 0 ? (
            <p className="text-xs text-gray-500">No certifications earned yet. Earn certifications to unlock advanced careers.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {employment.certifications.map((c, i) => (
                <span key={i} className="px-2 py-1 rounded bg-emerald-900/30 border border-emerald-500/30 text-xs text-emerald-300">{c}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employment History */}
      <Card className="glass-panel border border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <CardTitle className="text-white text-sm flex items-center gap-2"><Scroll className="w-4 h-4" />Employment History</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {(employment.employment_history || []).length === 0 ? (
            <p className="text-xs text-gray-500">No previous positions. Your career starts here.</p>
          ) : (
            <div className="space-y-2">
              {employment.employment_history.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-gray-700 text-xs">
                  <div>
                    <p className="text-white font-semibold">{h.job_title} · {h.employer_name}</p>
                    <p className="text-gray-500">{h.career_path} · Lv {h.level} · ${h.salary?.toLocaleString()}</p>
                  </div>
                  <div className="text-right text-gray-500">
                    <p>{h.start_date?.slice(0, 10)} → {h.end_date?.slice(0, 10)}</p>
                    <p className="text-gray-400">{h.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReqRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-800 pb-1.5">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}