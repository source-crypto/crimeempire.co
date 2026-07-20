import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Building2, PieChart as PieIcon } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { propertyMonthlyROI, propertyAnnualROI, appreciationPct, valuationHistory } from '@/lib/empireMetrics';

const TYPE_COLORS = ['#9333EA', '#06B6D4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#3b82f6', '#ec4899'];

const PIE_LABELS = {
  apartment: 'Apartment', warehouse: 'Warehouse', safehouse: 'Safehouse', luxury_home: 'Luxury Home',
  hotel: 'Hotel', nightclub: 'Nightclub', factory: 'Factory', casino: 'Casino', garage: 'Garage',
  airport: 'Airport', private_island: 'Private Island', office_tower: 'Office Tower',
  restaurant: 'Restaurant', gas_station: 'Gas Station',
};

export default function PropertyROIAnalytics({ playerData }) {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', playerData?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: playerData.id }, '-acquired_at', 50),
    enabled: !!playerData?.id,
  });

  const portfolio = useMemo(() => {
    const totalValue = properties.reduce((s, p) => s + (p.market_value || p.purchase_price || 0), 0);
    const totalIncome = properties.reduce((s, p) => s + (p.income_per_hour || 0), 0);
    const totalUpkeep = properties.reduce((s, p) => s + (p.upkeep_per_hour || 0), 0);
    const totalPurchase = properties.reduce((s, p) => s + (p.purchase_price || 0), 0);
    const netMonthly = (totalIncome - totalUpkeep) * 24 * 30;
    const portfolioROI = totalPurchase ? Math.round((netMonthly / totalPurchase) * 1000) / 10 : 0;
    const appreciation = totalPurchase ? Math.round(((totalValue - totalPurchase) / totalPurchase) * 1000) / 10 : 0;
    return { totalValue, totalIncome, totalUpkeep, netMonthly, portfolioROI, appreciation };
  }, [properties]);

  const distribution = useMemo(() => {
    const m = {};
    properties.forEach((p) => { m[p.property_type] = (m[p.property_type] || 0) + (p.market_value || p.purchase_price || 0); });
    return Object.entries(m).map(([type, value]) => ({ name: PIE_LABELS[type] || type, value }));
  }, [properties]);

  const trend = useMemo(() => {
    if (properties.length === 0) return [];
    const sample = valuationHistory(properties[0], 12);
    return sample.map((pt, i) => ({
      date: pt.date,
      value: properties.reduce((s, p) => {
        const hist = valuationHistory(p, 12);
        return s + (hist[i]?.value || 0);
      }, 0),
    }));
  }, [properties]);

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
  if (properties.length === 0) return (
    <Card className="glass-panel border-purple-500/20"><CardContent className="p-12 text-center text-gray-400">Acquire property to unlock investment & ROI analytics.</CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-panel border-cyan-500/20"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-cyan-400">${portfolio.totalValue.toLocaleString()}</p><p className="text-xs text-gray-400">Portfolio Value</p></CardContent></Card>
        <Card className="glass-panel border-green-500/20"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-green-400">${portfolio.netMonthly.toLocaleString()}</p><p className="text-xs text-gray-400">Net Monthly Income</p></CardContent></Card>
        <Card className="glass-panel border-purple-500/20"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-purple-400">{portfolio.portfolioROI}%</p><p className="text-xs text-gray-400">Portfolio ROI / mo</p></CardContent></Card>
        <Card className="glass-panel border-amber-500/20"><CardContent className="p-3 text-center flex flex-col items-center"><div className="flex items-center gap-1">{portfolio.appreciation >= 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}<p className={`text-lg font-bold ${portfolio.appreciation >= 0 ? 'text-green-400' : 'text-red-400'}`}>{portfolio.appreciation}%</p></div><p className="text-xs text-gray-400">Appreciation</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" /> Valuation History</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs><linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9333EA" stopOpacity={0.5} /><stop offset="95%" stopColor="#9333EA" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(147,51,234,0.4)', borderRadius: 8, color: '#e2e8f0' }} />
                <Area type="monotone" dataKey="value" stroke="#9333EA" fill="url(#valGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center gap-2"><PieIcon className="w-4 h-4 text-cyan-400" /> Asset Distribution</h3>
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={{ fill: '#cbd5e1', fontSize: 10 }}>
                    {distribution.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(147,51,234,0.4)', borderRadius: 8, color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm py-10 text-center">No asset data.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-purple-500/20 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-purple-500/20 text-xs text-gray-400 font-semibold uppercase tracking-wide">
          <div className="col-span-4">Property</div>
          <div className="col-span-2 text-right">Purchase</div>
          <div className="col-span-2 text-right">Market</div>
          <div className="col-span-2 text-right">Appreciation</div>
          <div className="col-span-2 text-right">ROI / mo</div>
        </div>
        {properties.map((p) => {
          const ap = appreciationPct(p);
          const roi = propertyMonthlyROI(p);
          return (
            <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-purple-500/10 text-sm items-center">
              <div className="col-span-4 text-white truncate flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-gray-500" />{p.emoji} {p.name}</div>
              <div className="col-span-2 text-right text-gray-300">${(p.purchase_price || 0).toLocaleString()}</div>
              <div className="col-span-2 text-right text-cyan-400">${(p.market_value || 0).toLocaleString()}</div>
              <div className={`col-span-2 text-right ${ap >= 0 ? 'text-green-400' : 'text-red-400'}`}>{ap >= 0 ? '+' : ''}{ap}%</div>
              <div className="col-span-2 text-right text-purple-400 font-medium">{roi}%</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}