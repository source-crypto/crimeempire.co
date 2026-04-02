import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const COMMODITIES = [
  { id: 'drugs', label: 'Narcotics', icon: '💊', basePrice: 8000, color: '#9333ea' },
  { id: 'weapons', label: 'Weapons', icon: '🔫', basePrice: 12000, color: '#ef4444' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚗', basePrice: 25000, color: '#3b82f6' },
  { id: 'electronics', label: 'Electronics', icon: '💻', basePrice: 5000, color: '#06b6d4' },
  { id: 'raw_materials', label: 'Raw Materials', icon: '⛏️', basePrice: 2000, color: '#f59e0b' },
  { id: 'contraband', label: 'Contraband', icon: '📦', basePrice: 15000, color: '#ec4899' },
];

const DEMAND_COLORS = { low: 'bg-gray-600', medium: 'bg-yellow-700', high: 'bg-orange-600', critical: 'bg-red-600' };
const TREND_ICONS = { rising: TrendingUp, falling: TrendingDown, stable: Minus, volatile: AlertTriangle };

function generatePriceHistory(basePrice, points = 20) {
  const history = [];
  let price = basePrice;
  for (let i = points; i >= 0; i--) {
    price = Math.max(basePrice * 0.5, price + (Math.random() - 0.48) * basePrice * 0.08);
    history.push({ t: `-${i}m`, price: Math.round(price) });
  }
  return history;
}

export default function CommodityMarket() {
  const queryClient = useQueryClient();
  const [selectedCommodity, setSelectedCommodity] = useState('drugs');
  const [tradeQty, setTradeQty] = useState('1');
  const [tradeMode, setTradeMode] = useState('buy');
  const [priceHistories, setPriceHistories] = useState({});
  const [liveAlerts, setLiveAlerts] = useState([]);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const p = await base44.entities.Player.filter({ created_by: user.email }); return p[0]; },
    enabled: !!user
  });
  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: marketPrices = [], refetch: refetchMarket } = useQuery({
    queryKey: ['commodityPrices'],
    queryFn: () => base44.entities.CommodityPrice.list('-updated_date', 10),
    refetchInterval: 15000
  });

  // Initialize price histories locally + real-time flicker
  useEffect(() => {
    const initial = {};
    COMMODITIES.forEach(c => { initial[c.id] = generatePriceHistory(c.basePrice); });
    setPriceHistories(initial);
  }, []);

  // Live market simulation — prices shift every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPriceHistories(prev => {
        const updated = { ...prev };
        COMMODITIES.forEach(c => {
          const history = prev[c.id] || [];
          const lastPrice = history[history.length - 1]?.price || c.basePrice;
          const newPrice = Math.max(c.basePrice * 0.4, lastPrice + (Math.random() - 0.47) * c.basePrice * 0.06);
          const rounded = Math.round(newPrice);
          const pct = ((rounded - lastPrice) / lastPrice * 100).toFixed(1);
          if (Math.abs(pct) > 4) {
            setLiveAlerts(prev => [{
              commodity: c.label,
              icon: c.icon,
              pct,
              ts: new Date().toLocaleTimeString(),
              spike: pct > 0
            }, ...prev.slice(0, 7)]);
          }
          updated[c.id] = [...history.slice(-29), { t: 'now', price: rounded }];
        });
        return updated;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription — sync with database changes
  useEffect(() => {
    const unsub = base44.entities.CommodityPrice.subscribe(() => {
      refetchMarket();
    });
    return unsub;
  }, []);

  const selectedComm = COMMODITIES.find(c => c.id === selectedCommodity);
  const priceHistory = priceHistories[selectedCommodity] || [];
  const currentPrice = priceHistory[priceHistory.length - 1]?.price || selectedComm?.basePrice || 0;
  const prevPrice = priceHistory[priceHistory.length - 2]?.price || currentPrice;
  const pctChange = prevPrice ? ((currentPrice - prevPrice) / prevPrice * 100).toFixed(1) : 0;

  const executeTrade = useMutation({
    mutationFn: async () => {
      const qty = parseInt(tradeQty) || 1;
      const total = currentPrice * qty;
      const isBuy = tradeMode === 'buy';

      if (isBuy && total > (playerData?.crypto_balance || 0)) throw new Error('Insufficient crypto balance');
      if (!isBuy && total > (playerData?.buy_power || 0)) throw new Error('Insufficient clean cash to sell into');

      const heatIncrease = qty > 5 ? 1 : 0;
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + (isBuy ? -total : total * 1.15),
        buy_power: (playerData.buy_power || 0) + (isBuy ? total * 0.8 : -total),
        wanted_level: Math.min(5, (playerData.wanted_level || 0) + heatIncrease),
        total_earnings: (playerData.total_earnings || 0) + (isBuy ? 0 : total * 0.15),
        'stats.items_traded': ((playerData.stats?.items_traded || 0) + qty),
      });

      // Log to CommodityPrice for global sync
      const existingRecord = marketPrices.find(m => m.commodity === selectedCommodity);
      if (existingRecord) {
        const supplyShift = isBuy ? -qty * 2 : qty * 2;
        await base44.entities.CommodityPrice.update(existingRecord.id, {
          supply_volume: Math.max(10, (existingRecord.supply_volume || 100) + supplyShift),
          current_price: currentPrice,
          pct_change: parseFloat(pctChange),
          demand_level: qty > 10 ? 'critical' : qty > 5 ? 'high' : 'medium'
        });
      } else {
        await base44.entities.CommodityPrice.create({
          commodity: selectedCommodity,
          current_price: currentPrice,
          base_price: selectedComm.basePrice,
          supply_volume: Math.max(10, 100 + (isBuy ? -qty * 2 : qty * 2)),
          demand_level: 'medium',
          pct_change: parseFloat(pctChange)
        });
      }
      return { isBuy, total, qty };
    },
    onSuccess: ({ isBuy, total, qty }) => {
      toast.success(`${isBuy ? '📈 Bought' : '📉 Sold'} ${qty}x ${selectedComm?.label} for $${total.toLocaleString()}`);
      queryClient.invalidateQueries();
      refetchPlayer();
    },
    onError: (e) => toast.error(e.message)
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-yellow-500/20 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-yellow-400" /> Commodity Market
          </h1>
          <p className="text-gray-400 mt-1">Live supply & demand — prices shift with player activity in real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right"><p className="text-xs text-gray-400">Crypto</p><p className="text-lg font-bold text-cyan-400">${(playerData?.crypto_balance || 0).toLocaleString()}</p></div>
          <div className="text-right"><p className="text-xs text-gray-400">Cash</p><p className="text-lg font-bold text-green-400">${(playerData?.buy_power || 0).toLocaleString()}</p></div>
          <Button variant="ghost" size="icon" onClick={() => refetchMarket()} className="text-gray-400"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commodity List */}
        <div className="space-y-2">
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide px-1">Market Overview</p>
          {COMMODITIES.map(c => {
            const history = priceHistories[c.id] || [];
            const price = history[history.length - 1]?.price || c.basePrice;
            const prev = history[history.length - 2]?.price || price;
            const chg = prev ? ((price - prev) / prev * 100).toFixed(1) : 0;
            const isUp = chg > 0;
            const isSelected = selectedCommodity === c.id;
            const dbRecord = marketPrices.find(m => m.commodity === c.id);
            return (
              <button key={c.id} onClick={() => setSelectedCommodity(c.id)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${isSelected ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-700 hover:border-yellow-500/40 bg-slate-900/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{c.icon}</span>
                    <div>
                      <p className="text-white text-sm font-semibold">{c.label}</p>
                      {dbRecord && <Badge className={`${DEMAND_COLORS[dbRecord.demand_level]} text-[10px] px-1`}>{dbRecord.demand_level}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">${price.toLocaleString()}</p>
                    <p className={`text-xs font-semibold ${isUp ? 'text-green-400' : chg < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {isUp ? '▲' : chg < 0 ? '▼' : '—'} {Math.abs(chg)}%
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Live Spike Alerts */}
          {liveAlerts.length > 0 && (
            <Card className="glass-panel border border-red-500/20 mt-4">
              <CardHeader><CardTitle className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3 animate-pulse" />Market Alerts</CardTitle></CardHeader>
              <CardContent className="p-2 space-y-1">
                {liveAlerts.map((a, i) => (
                  <div key={i} className="text-xs flex justify-between items-center">
                    <span className={a.spike ? 'text-green-400' : 'text-red-400'}>{a.icon} {a.commodity} {a.spike ? '▲' : '▼'} {Math.abs(a.pct)}%</span>
                    <span className="text-gray-600">{a.ts}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chart + Trade */}
        <div className="lg:col-span-2 space-y-4">
          {/* Trend Chart */}
          <Card className="glass-panel border border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{selectedComm?.icon}</span>
                  {selectedComm?.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">${currentPrice.toLocaleString()}</span>
                  <span className={`text-sm font-bold ${pctChange > 0 ? 'text-green-400' : pctChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {pctChange > 0 ? '▲' : pctChange < 0 ? '▼' : '—'} {Math.abs(pctChange)}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={priceHistory}>
                  <XAxis dataKey="t" tick={{ fill: '#6b7280', fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} width={60} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Price']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                  <ReferenceLine y={selectedComm?.basePrice} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'Base', fill: '#6b7280', fontSize: 10 }} />
                  <Line type="monotone" dataKey="price" stroke={selectedComm?.color || '#9333ea'} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 text-center mt-2 animate-pulse">● Live — updating every 8 seconds</p>
            </CardContent>
          </Card>

          {/* Trade Panel */}
          <Card className="glass-panel border border-purple-500/20">
            <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" />Trade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setTradeMode('buy')}
                  className={`p-3 rounded-lg border font-semibold transition-all ${tradeMode === 'buy' ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-gray-700 text-gray-400'}`}>
                  📈 Buy
                </button>
                <button onClick={() => setTradeMode('sell')}
                  className={`p-3 rounded-lg border font-semibold transition-all ${tradeMode === 'sell' ? 'border-red-500 bg-red-900/20 text-red-400' : 'border-gray-700 text-gray-400'}`}>
                  📉 Sell
                </button>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Quantity</p>
                <input type="number" value={tradeQty} onChange={e => setTradeQty(e.target.value)} min="1"
                  className="w-full bg-slate-800 border border-gray-600 text-white rounded-lg p-3" />
                <div className="flex gap-2 mt-2">
                  {[1, 5, 10, 25].map(v => (
                    <button key={v} onClick={() => setTradeQty(String(v))}
                      className="text-xs px-2 py-1 rounded bg-slate-700 text-gray-300 hover:bg-purple-700 transition-colors">{v}x</button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-gray-700 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">Unit Price</span><span className="text-white">${currentPrice.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="text-white">{tradeQty}x</span></div>
                <div className="flex justify-between font-bold border-t border-gray-700 pt-1">
                  <span className="text-gray-300">Total</span>
                  <span className={tradeMode === 'buy' ? 'text-red-400' : 'text-green-400'}>
                    {tradeMode === 'buy' ? '-' : '+'}${(currentPrice * (parseInt(tradeQty) || 0)).toLocaleString()}
                  </span>
                </div>
                {tradeMode === 'sell' && <p className="text-xs text-green-400">+15% sell bonus applied</p>}
                {(parseInt(tradeQty) || 0) > 5 && <p className="text-xs text-orange-400">⚠️ Large trades increase heat level</p>}
              </div>

              <Button className={`w-full h-12 text-lg ${tradeMode === 'buy' ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'}`}
                onClick={() => executeTrade.mutate()} disabled={executeTrade.isPending}>
                {executeTrade.isPending ? 'Executing...' : tradeMode === 'buy' ? '📈 Execute Buy' : '📉 Execute Sell'}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Inventory */}
          {enterprises.length > 0 && (
            <Card className="glass-panel border border-gray-700">
              <CardHeader><CardTitle className="text-gray-300 text-sm">Linked Enterprises</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {enterprises.slice(0, 4).map(e => (
                  <div key={e.id} className="p-2 rounded bg-slate-900/60 border border-gray-700 text-xs">
                    <p className="text-white font-semibold">{e.name}</p>
                    <p className="text-gray-400">{e.type?.replace(/_/g, ' ')}</p>
                    <p className="text-cyan-400">Stock: {e.current_stock || 0} / {e.storage_capacity}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}