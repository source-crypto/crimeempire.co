import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sounds } from '@/utils/sounds';
import AnimatedNumber from '@/components/shared/AnimatedNumber';

export default function CrewTreasury({ playerData, crew }) {
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState('');
  const [taxRate, setTaxRate] = useState(crew?.tax_rate || 10);

  const isBoss = playerData?.crew_role === 'boss' || playerData?.crew_role === 'underboss';
  const treasury = crew?.treasury_balance || 0;

  const deposit = useMutation({
    mutationFn: async () => {
      const amount = parseInt(depositAmount);
      if (!amount || amount <= 0) throw new Error('Enter a valid amount');
      if (amount > (playerData?.buy_power || 0)) throw new Error('Insufficient cash');
      await base44.entities.Player.update(playerData.id, { buy_power: (playerData.buy_power || 0) - amount });
      await base44.entities.Crew.update(crew.id, { treasury_balance: treasury + amount });
      setDepositAmount('');
    },
    onSuccess: () => { sounds.cash(); toast.success('💰 Deposited to crew treasury'); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(e.message)
  });

  const updateTax = useMutation({
    mutationFn: async () => {
      await base44.entities.Crew.update(crew.id, { tax_rate: taxRate });
    },
    onSuccess: () => { toast.success(`Tax rate set to ${taxRate}%`); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(e.message)
  });

  if (!crew) return null;

  return (
    <Card className="glass-panel border border-yellow-500/20">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />Crew Treasury
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-xl">
          <p className="text-gray-400 text-sm">Treasury Balance</p>
          <AnimatedNumber value={treasury} prefix="$" className="text-3xl font-bold text-yellow-400" />
        </div>

        {isBoss && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs font-semibold">TAX RATE (% of member earnings)</p>
            <div className="flex gap-2 items-center">
              <input type="range" min="0" max="30" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}
                className="flex-1" />
              <span className="text-yellow-400 font-bold w-12">{taxRate}%</span>
            </div>
            <Button size="sm" className="w-full bg-yellow-800 hover:bg-yellow-700" onClick={() => updateTax.mutate()} disabled={updateTax.isPending}>
              Set Tax Rate
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-gray-400 text-xs font-semibold">VOLUNTARY DEPOSIT</p>
          <div className="flex gap-2">
            <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
              placeholder="Amount..." className="flex-1 bg-slate-800 border border-gray-600 text-white rounded-lg p-2 text-sm" />
            <Button size="sm" className="bg-green-700 hover:bg-green-600" onClick={() => deposit.mutate()} disabled={deposit.isPending}>
              Deposit
            </Button>
          </div>
          <div className="flex gap-2">
            {[1000, 5000, 10000].map(v => (
              <button key={v} onClick={() => setDepositAmount(String(v))}
                className="text-xs px-2 py-1 rounded bg-slate-700 text-gray-300 hover:bg-green-700 transition-colors">${(v / 1000).toFixed(0)}k</button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t border-gray-700 pt-3 space-y-1">
          <p>• Treasury funds shared upgrades & territory defense</p>
          <p>• Boss can withdraw for crew operations</p>
          <p>• Tax auto-deducted from all member earnings</p>
        </div>
      </CardContent>
    </Card>
  );
}