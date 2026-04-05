import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { sounds } from '@/utils/sounds';

const LOAN_TIERS = [
  { amount: 10000, interest: 0.20, duration_hours: 12, label: 'Quick Flip', icon: '💵' },
  { amount: 50000, interest: 0.30, duration_hours: 24, label: 'Risky Business', icon: '💰' },
  { amount: 150000, interest: 0.40, duration_hours: 48, label: 'High Roller', icon: '💎' },
];

export default function LoanSharkSystem({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState(null);

  const { data: myLoans = [] } = useQuery({
    queryKey: ['loans', playerData?.id],
    queryFn: () => base44.entities.LoanShark.filter({ borrower_id: playerData.id }),
    enabled: !!playerData?.id,
    refetchInterval: 30000
  });

  const activeLoans = myLoans.filter(l => l.status === 'active');

  const takeLoan = useMutation({
    mutationFn: async (tier) => {
      if (activeLoans.length >= 2) throw new Error('Max 2 active loans allowed');
      const due = new Date(Date.now() + tier.duration_hours * 3600000).toISOString();
      const owed = Math.floor(tier.amount * (1 + tier.interest));
      await base44.entities.LoanShark.create({
        borrower_id: playerData.id,
        borrower_username: playerData.username,
        principal: tier.amount,
        interest_rate: tier.interest,
        amount_owed: owed,
        status: 'active',
        due_at: due
      });
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + tier.amount
      });
    },
    onSuccess: () => { sounds.cash(); toast.success('💰 Loan received — don\'t be late.'); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(e.message)
  });

  const repayLoan = useMutation({
    mutationFn: async (loan) => {
      if ((playerData?.crypto_balance || 0) < loan.amount_owed) throw new Error(`Need $${loan.amount_owed.toLocaleString()} to repay`);
      await base44.entities.LoanShark.update(loan.id, { status: 'paid', paid_at: new Date().toISOString() });
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) - loan.amount_owed
      });
    },
    onSuccess: () => { sounds.cash(); toast.success('✅ Loan repaid!'); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(e.message)
  });

  return (
    <Card className="glass-panel border border-red-500/20">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />Loan Shark
        </CardTitle>
        <p className="text-gray-400 text-xs">Borrow fast, pay back with interest. Default = heat spike + auto-bounty.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Loans */}
        {activeLoans.map(loan => {
          const isOverdue = new Date(loan.due_at) < new Date();
          return (
            <div key={loan.id} className={`p-3 rounded-lg border ${isOverdue ? 'border-red-500 bg-red-900/20' : 'border-yellow-500/30 bg-yellow-900/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">${loan.amount_owed?.toLocaleString()} owed</span>
                <Badge className={isOverdue ? 'bg-red-700' : 'bg-yellow-700'}>{isOverdue ? '⚠️ OVERDUE' : '⏳ Active'}</Badge>
              </div>
              <p className="text-xs text-gray-400">Borrowed: ${loan.principal?.toLocaleString()} · Interest: {(loan.interest_rate * 100).toFixed(0)}%</p>
              <Button size="sm" className="w-full mt-2 bg-green-700 hover:bg-green-600"
                onClick={() => repayLoan.mutate(loan)} disabled={repayLoan.isPending}>
                Repay ${loan.amount_owed?.toLocaleString()}
              </Button>
            </div>
          );
        })}

        {/* Loan Tiers */}
        {activeLoans.length < 2 && (
          <div className="space-y-2">
            {LOAN_TIERS.map((tier, i) => (
              <button key={i} onClick={() => setSelectedTier(selectedTier === i ? null : i)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${selectedTier === i ? 'border-red-500 bg-red-900/20' : 'border-gray-700 hover:border-red-500/40'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold text-sm">{tier.icon} {tier.label}</span>
                  <span className="text-green-400 font-bold">${tier.amount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-400">{(tier.interest * 100).toFixed(0)}% interest · Due in {tier.duration_hours}h · Repay ${Math.floor(tier.amount * (1 + tier.interest)).toLocaleString()}</p>
                {selectedTier === i && (
                  <Button size="sm" className="w-full mt-2 bg-red-700 hover:bg-red-600"
                    onClick={(e) => { e.stopPropagation(); takeLoan.mutate(tier); }} disabled={takeLoan.isPending}>
                    Take Loan — ${tier.amount.toLocaleString()}
                  </Button>
                )}
              </button>
            ))}
          </div>
        )}
        {activeLoans.length >= 2 && <p className="text-center text-gray-500 text-sm py-2">Max loans reached. Repay first.</p>}
      </CardContent>
    </Card>
  );
}