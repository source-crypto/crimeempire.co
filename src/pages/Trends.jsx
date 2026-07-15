import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Activity, DollarSign, Loader2 } from 'lucide-react';
import TrendsChart from '@/components/trends/TrendsChart';
import MacroIndicatorChart from '@/components/trends/MacroIndicatorChart';
import CareerSalaryChart from '@/components/trends/CareerSalaryChart';
import { aggregatePayoutTrends, aggregateCareerSalaries } from '@/lib/trendsAggregator';

export default function Trends() {
  const txQuery = useQuery({
    queryKey: ['trend-transactions'],
    queryFn: () => base44.entities.TransactionLog.list('-created_date', 200),
  });
  const macroQuery = useQuery({
    queryKey: ['trend-macro'],
    queryFn: () => base44.entities.MacroEconomicData.list(),
  });
  const empQuery = useQuery({
    queryKey: ['trend-employment'],
    queryFn: () => base44.entities.Employment.list(),
  });

  const loading = txQuery.isLoading || macroQuery.isLoading || empQuery.isLoading;

  const payoutData = useMemo(
    () => aggregatePayoutTrends(txQuery.data || []),
    [txQuery.data]
  );
  const macroData = useMemo(() => macroQuery.data || [], [macroQuery.data]);
  const careerData = useMemo(
    () => aggregateCareerSalaries(empQuery.data || []),
    [empQuery.data]
  );

  const totalCriminal = payoutData.reduce((s, p) => s + p.criminal, 0);
  const totalWealth = payoutData.reduce((s, p) => s + p.wealth, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">City Trends Dashboard</h1>
          <p className="text-sm text-gray-400">Wealth & criminal payout fluctuations over time</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">Total City Wealth</span>
              </div>
              <p className="text-2xl font-bold text-white">${totalWealth.toLocaleString()}</p>
            </div>
            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-medium">Total Criminal Payouts</span>
              </div>
              <p className="text-2xl font-bold text-white">${totalCriminal.toLocaleString()}</p>
            </div>
            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Macro Indicators Tracked</span>
              </div>
              <p className="text-2xl font-bold text-white">{macroData.length}</p>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Payout Fluctuation Over Time</h2>
            {payoutData.length > 0 ? (
              <TrendsChart data={payoutData} />
            ) : (
              <p className="text-gray-400 text-sm py-10 text-center">No transaction history available yet.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Macro Economic Indicators</h2>
              {macroData.length > 0 ? (
                <MacroIndicatorChart data={macroData} />
              ) : (
                <p className="text-gray-400 text-sm py-10 text-center">No macro economic data available.</p>
              )}
            </div>
            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Avg Salary by Career Path</h2>
              {careerData.length > 0 ? (
                <CareerSalaryChart data={careerData} />
              ) : (
                <p className="text-gray-400 text-sm py-10 text-center">No employment records available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}