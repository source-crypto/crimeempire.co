import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCareerPath, getLevel } from './careerPaths';
import { Handshake, Coins, Users, Sparkles } from 'lucide-react';

export default function RetirementPanel({ employment, playerData, onRetire, onFoundCompany, retiring }) {
  const path = getCareerPath(employment.career_path);
  const level = getLevel(employment.career_path, employment.career_level);
  const topReached = employment.career_level >= Math.max(...path.levels.map((l) => l.level));
  const pension = employment.pension_accrued || 0;
  const pensionPerCycle = Math.floor(pension * 0.02);
  const isRetired = employment.employment_status === 'retired';
  const isSelfEmployed = employment.employment_status === 'self_employed';

  return (
    <div className="space-y-4">
      {/* Retirement */}
      <Card className="glass-panel border border-blue-500/20">
        <CardHeader className="border-b border-blue-500/20">
          <CardTitle className="text-blue-400 flex items-center gap-2"><Handshake className="w-5 h-5" />Retirement & Mentorship</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 rounded bg-slate-900/50 border border-gray-700">
              <p className="text-xs text-gray-400">Pension Accrued</p>
              <p className="text-xl font-bold text-blue-400">${pension.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded bg-slate-900/50 border border-gray-700">
              <p className="text-xs text-gray-400">Pension / Cycle</p>
              <p className="text-xl font-bold text-green-400">${pensionPerCycle.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded p-3 border border-gray-700 text-xs text-gray-300 space-y-1">
            <p className="font-semibold text-gray-200">Retirement unlocks veteran roles:</p>
            <p>• Mentor new players (grant them XP & reputation)</p>
            <p>• Join corporate boards (passive influence income)</p>
            <p>• Become an investor (fund other organizations)</p>
            <p>• Collect pension based on career achievements</p>
          </div>

          {isRetired ? (
            <div className="text-center p-3 rounded bg-blue-900/20 border border-blue-500/30">
              <Badge className="bg-blue-700">Retired Veteran</Badge>
              <p className="text-xs text-gray-400 mt-2">Drawing ${pensionPerCycle.toLocaleString()}/cycle pension. Use Collect Paycheck to withdraw.</p>
            </div>
          ) : (
            <Button onClick={onRetire} disabled={retiring || !topReached} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40">
              {retiring ? 'Processing…' : topReached ? '🏖️ Retire (Top Level Reached)' : `Reach top of ${path.name} path (Lv ${path.levels.length}) to retire`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Entrepreneurship — found your own organization */}
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-purple-400 flex items-center gap-2"><Sparkles className="w-5 h-5" />Entrepreneurship — Found Your Own Organization</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-gray-400">Resign from your job and start your own organization. You become responsible for hiring, payroll, budgets, expansion, and employee satisfaction.</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded bg-slate-900/50 border border-gray-700">
              <p className="text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" />Hire & manage</p>
            </div>
            <div className="p-2 rounded bg-slate-900/50 border border-gray-700">
              <p className="text-gray-400 flex items-center gap-1"><Coins className="w-3 h-3" />Run payroll</p>
            </div>
          </div>
          <Button onClick={onFoundCompany} disabled={isSelfEmployed} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40">
            {isSelfEmployed ? 'Already a Founder' : '🚀 Found My Organization'}
          </Button>
          {isSelfEmployed && <p className="text-xs text-center text-purple-300">You run your own organization — post jobs in the Internal Job Market to hire other players.</p>}
        </CardContent>
      </Card>
    </div>
  );
}