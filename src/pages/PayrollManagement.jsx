import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calculator, Building2 } from 'lucide-react';
import PayrollDashboard from '@/components/payroll/PayrollDashboard';
import { calculateEmployeeSalary, summarizePayroll } from '@/lib/salaryCalculator';
import { toast } from 'sonner';

export default function PayrollManagement() {
  const queryClient = useQueryClient();
  const [lastRun, setLastRun] = useState(null);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0] || null; },
    enabled: !!user?.email,
  });
  const { data: ownEmp = [] } = useQuery({
    queryKey: ['employment', playerData?.id],
    queryFn: async () => { const e = await base44.entities.Employment.filter({ player_id: playerData.id }); return e; },
    enabled: !!playerData?.id,
  });
  const { data: staffEmp = [] } = useQuery({
    queryKey: ['employmentStaff', playerData?.id],
    queryFn: async () => { const e = await base44.entities.Employment.filter({ employer_id: playerData.id }); return e; },
    enabled: !!playerData?.id,
  });
  const { data: metrics = [] } = useQuery({
    queryKey: ['perfMetrics', playerData?.id],
    queryFn: () => base44.entities.PerformanceMetric.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  const employments = useMemo(() => {
    const map = new Map();
    [...ownEmp, ...staffEmp].forEach(e => { if (e.employment_status === 'employed') map.set(e.id, e); });
    return [...map.values()];
  }, [ownEmp, staffEmp]);

  const records = useMemo(() => employments.map(e => {
    const metric = metrics.find(m => m.player_id === e.player_id && m.period === 'monthly');
    return { employment: e, calc: calculateEmployeeSalary(e, metric) };
  }), [employments, metrics]);
  const summary = useMemo(() => summarizePayroll(records), [records]);

  const currentEmployer = useMemo(() => ownEmp.find(e => e.employment_status === 'employed') || null, [ownEmp]);
  const currentPayout = useMemo(() => currentEmployer
    ? calculateEmployeeSalary(currentEmployer, metrics.find(m => m.player_id === currentEmployer.player_id && m.period === 'monthly'))
    : null, [currentEmployer, metrics]);

  const runMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const updates = records.map(r => {
        const patch = { last_paid_at: now };
        if (r.calc.lawful) patch.pension_accrued = (r.employment.pension_accrued || 0) + r.calc.pension;
        return base44.entities.Employment.update(r.employment.id, patch);
      });
      await Promise.all(updates);
      const ownRecords = records.filter(r => r.employment.player_id === playerData.id);
      const buyPowerAdd = ownRecords.filter(r => r.calc.lawful).reduce((s, r) => s + r.calc.net + r.calc.bonus, 0);
      const cryptoAdd = ownRecords.filter(r => !r.calc.lawful).reduce((s, r) => s + r.calc.net + r.calc.bonus, 0);
      if (buyPowerAdd > 0 || cryptoAdd > 0) {
        await base44.entities.Player.update(playerData.id, {
          buy_power: (playerData.buy_power || 0) + buyPowerAdd,
          crypto_balance: (playerData.crypto_balance || 0) + cryptoAdd,
        });
      }
      await base44.entities.AuditEvent.create({
        event_id: `pay_${Date.now()}`,
        event_type: 'employment',
        category: 'payroll',
        actor_id: playerData.id,
        actor_name: playerData.username || 'Player',
        actor_type: 'player',
        source: 'salaryCalculator',
        description: `Payroll run: ${records.length} employees · lawful $${summary.lawfulPayout} · criminal Ξ${summary.criminalPayout}`,
        metadata: { lawfulPayout: summary.lawfulPayout, criminalPayout: summary.criminalPayout, count: records.length },
        value_before: 0, value_after: buyPowerAdd + cryptoAdd, delta: buyPowerAdd + cryptoAdd,
      });
      return now;
    },
    onSuccess: (ts) => {
      setLastRun(new Date(ts).toLocaleString());
      queryClient.invalidateQueries(['employment']);
      queryClient.invalidateQueries(['employmentStaff']);
      queryClient.invalidateQueries({ queryKey: ['player'] });
      toast.success(`Payroll processed: ${records.length} employees`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!playerData) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2"><Calculator className="w-7 h-7 text-green-400" /> Payroll Management</h1>
        <p className="text-gray-400 mt-1">Automated salary calculation from performance ratings — lawful corporate (buy power, tax, pension) and criminal payouts (crypto, launderer cuts)</p>
      </div>
      {currentEmployer && currentPayout && (
        <Card className="glass-panel border-green-500/30">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Current Employer</p>
                <p className="text-lg font-bold text-white">{currentEmployer.employer_name || 'Unknown Employer'}</p>
                <p className="text-sm text-gray-400">{currentEmployer.job_title} · Level {currentEmployer.career_level}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={currentPayout.lawful ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>{currentPayout.lawful ? 'Lawful' : 'Criminal'}</Badge>
              <div className="text-right">
                <p className="text-xs text-gray-400">Your payout / cycle</p>
                <p className={`text-xl font-bold ${currentPayout.currency === 'crypto' ? 'text-purple-400' : 'text-green-400'}`}>{currentPayout.currency === 'crypto' ? 'Ξ' : '$'}{(currentPayout.net + currentPayout.bonus).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">from {currentPayout.performance}/100 performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <PayrollDashboard records={records} summary={summary} onRun={() => runMutation.mutate()} running={runMutation.isPending} lastRun={lastRun} />
    </div>
  );
}