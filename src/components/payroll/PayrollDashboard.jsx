import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, Coins, Landmark, Shield } from 'lucide-react';

export default function PayrollDashboard({ records, summary, onRun, running, lastRun }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          <Card className="glass-panel border-green-500/20"><CardContent className="p-3 text-center"><DollarSign className="w-4 h-4 mx-auto text-green-400 mb-1" /><p className="text-lg font-bold text-green-400">${summary.lawfulPayout.toLocaleString()}</p><p className="text-xs text-gray-400">Lawful Payout</p></CardContent></Card>
          <Card className="glass-panel border-purple-500/20"><CardContent className="p-3 text-center"><Coins className="w-4 h-4 mx-auto text-purple-400 mb-1" /><p className="text-lg font-bold text-purple-400">Ξ{summary.criminalPayout.toLocaleString()}</p><p className="text-xs text-gray-400">Criminal Payout</p></CardContent></Card>
          <Card className="glass-panel border-blue-500/20"><CardContent className="p-3 text-center"><Landmark className="w-4 h-4 mx-auto text-blue-400 mb-1" /><p className="text-lg font-bold text-blue-400">${summary.totalPension.toLocaleString()}</p><p className="text-xs text-gray-400">Pension Accrued</p></CardContent></Card>
          <Card className="glass-panel border-red-500/20"><CardContent className="p-3 text-center"><Shield className="w-4 h-4 mx-auto text-red-400 mb-1" /><p className="text-lg font-bold text-red-400">Ξ{summary.totalLaundering.toLocaleString()}</p><p className="text-xs text-gray-400">Launderer Cuts</p></CardContent></Card>
        </div>
        <Button className="bg-gradient-to-r from-green-600 to-purple-600" onClick={onRun} disabled={running || records.length === 0}>
          <Calculator className="w-4 h-4 mr-1" /> {running ? 'Processing…' : 'Run Payroll'}
        </Button>
      </div>

      {lastRun && <p className="text-xs text-gray-400">Last run: {lastRun}</p>}

      <Card className="glass-panel border-purple-500/20 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-purple-500/20 text-xs text-gray-400 font-semibold uppercase tracking-wide">
          <div className="col-span-3">Employee</div>
          <div className="col-span-2">Career</div>
          <div className="col-span-1">Lvl</div>
          <div className="col-span-2">Perf</div>
          <div className="col-span-2">Net</div>
          <div className="col-span-2">Breakdown</div>
        </div>
        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No employed records to process. Embark on a career or hire staff first.</div>
        ) : records.map(({ employment: e, calc }) => (
          <div key={e.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-purple-500/10 text-sm items-center">
            <div className="col-span-3 text-white truncate">{e.username || e.job_title || 'Employee'}</div>
            <div className="col-span-2"><Badge className={calc.lawful ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>{e.career_path}</Badge></div>
            <div className="col-span-1 text-gray-300">{e.career_level ?? 1}</div>
            <div className="col-span-2 text-gray-300">{calc.performance}/100</div>
            <div className="col-span-2 font-bold text-green-400">{calc.currency === 'crypto' ? `Ξ${calc.net.toLocaleString()}` : `$${calc.net.toLocaleString()}`}</div>
            <div className="col-span-2 text-xs text-gray-400">
              {calc.lawful ? `tax $${calc.tax} · pension $${calc.pension}` : `launder Ξ${calc.laundererCut}`}
              {calc.bonus > 0 && <span className="text-yellow-400"> · +{calc.bonus}</span>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}