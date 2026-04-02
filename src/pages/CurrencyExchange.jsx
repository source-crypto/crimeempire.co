import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRightLeft, Flame, Building2, Waves, Globe, 
  TrendingDown, AlertTriangle, CheckCircle, Clock, Wallet, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const LAUNDERING_METHODS = [
  {
    id: 'nightclub',
    name: 'Nightclubs',
    icon: '🎵',
    fee: 8,
    risk: 12,
    duration: 10,
    desc: 'Slow but low profile. Mix cash through bar tabs and cover charges.',
    speed: 'Slow',
    speedColor: 'text-yellow-400',
  },
  {
    id: 'shell_company',
    name: 'Shell Companies',
    icon: '🏢',
    fee: 15,
    risk: 25,
    duration: 5,
    desc: 'Balanced approach. Route funds through fake corporate invoices.',
    speed: 'Medium',
    speedColor: 'text-orange-400',
  },
  {
    id: 'offshore',
    name: 'Offshore Accounts',
    icon: '🏝️',
    fee: 22,
    risk: 45,
    duration: 1,
    desc: 'Instant conversion. High exposure — authorities are watching.',
    speed: 'Fast',
    speedColor: 'text-red-400',
  },
];

const STAGES = ['Initiated', 'Washing', 'Cleared', 'Delivered'];

export default function CurrencyExchange() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('nightclub');
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const method = LAUNDERING_METHODS.find(m => m.id === selectedMethod);
  const cryptoAmount = parseFloat(amount) || 0;
  const fee = Math.floor(cryptoAmount * method.fee / 100);
  const cleanCash = cryptoAmount - fee;
  const wantedLevel = playerData?.wanted_level || 0;
  const riskMultiplier = 1 + wantedLevel * 0.3;
  const effectiveRisk = Math.min(95, Math.floor(method.risk * riskMultiplier));

  // Simulate transaction progress
  useEffect(() => {
    if (!activeTransaction) return;
    const totalMs = activeTransaction.duration * 1000;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);
      const stage = Math.floor(pct / 25);
      setStageIndex(Math.min(3, stage));
      if (pct >= 100) {
        clearInterval(interval);
        finalizeTransaction(activeTransaction);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [activeTransaction]);

  const finalizeTransaction = async (tx) => {
    const busted = Math.random() * 100 < tx.risk;
    if (busted) {
      const confiscated = Math.floor(tx.cleanCash * 0.5);
      toast.error(`🚨 Law enforcement seized $${confiscated.toLocaleString()}! Heat increased.`);
      await base44.entities.Player.update(playerData.id, {
        wanted_level: Math.min(5, (playerData.wanted_level || 0) + 1),
      });
    } else {
      await base44.entities.Player.update(playerData.id, {
        buy_power: (playerData.buy_power || 0) + tx.cleanCash,
        crypto_balance: (playerData.crypto_balance || 0) - tx.original,
        wanted_level: Math.min(5, (playerData.wanted_level || 0) + (tx.risk > 30 ? 1 : 0)),
        total_earnings: (playerData.total_earnings || 0) + tx.cleanCash,
      });
      toast.success(`✅ $${tx.cleanCash.toLocaleString()} clean cash delivered!`);
    }
    setActiveTransaction(null);
    setProgress(0);
    setStageIndex(0);
    refetchPlayer();
    queryClient.invalidateQueries({ queryKey: ['player'] });
  };

  const startExchange = () => {
    if (!cryptoAmount || cryptoAmount <= 0) return toast.error('Enter an amount');
    if (cryptoAmount > (playerData?.crypto_balance || 0)) return toast.error('Insufficient crypto balance');
    if (activeTransaction) return toast.error('Transaction already in progress');

    setActiveTransaction({
      original: cryptoAmount,
      cleanCash,
      fee,
      risk: effectiveRisk,
      method: method.name,
      duration: method.duration * 1000,
    });
    setProgress(0);
    setStageIndex(0);
    setAmount('');
    toast.info(`🔄 Laundering initiated via ${method.name}...`);
  };

  const wantedColors = ['text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400', 'text-red-500', 'text-red-600'];

  if (!playerData) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
          <ArrowRightLeft className="w-8 h-8 text-purple-400" /> Black Market Exchange
        </h1>
        <p className="text-gray-400 mt-1">Convert crypto to clean cash through illegal fronts. Every transaction carries risk.</p>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel border border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-cyan-400" /><p className="text-gray-400 text-sm">Crypto Balance</p></div>
            <p className="text-2xl font-bold text-cyan-400">${(playerData.crypto_balance || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Dirty — cannot be spent directly</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-green-400" /><p className="text-gray-400 text-sm">Clean Cash</p></div>
            <p className="text-2xl font-bold text-green-400">${(playerData.buy_power || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Spendable funds</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Flame className="w-4 h-4 text-red-400" /><p className="text-gray-400 text-sm">Heat Level</p></div>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${wantedColors[wantedLevel]}`}>{'★'.repeat(wantedLevel)}{'☆'.repeat(5 - wantedLevel)}</p>
            </div>
            <Progress value={wantedLevel * 20} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exchange Panel */}
        <div className="space-y-4">
          {/* Method Selection */}
          <Card className="glass-panel border border-purple-500/20">
            <CardHeader><CardTitle className="text-white text-sm">Select Laundering Method</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {LAUNDERING_METHODS.map(m => (
                <button key={m.id} onClick={() => setSelectedMethod(m.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${selectedMethod === m.id ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 hover:border-purple-500/40 bg-slate-900/40'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-white font-semibold">{m.name}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge className="bg-slate-700">Fee: {m.fee}%</Badge>
                      <Badge className={m.risk > 30 ? 'bg-red-700' : 'bg-yellow-700'}>Risk: {m.risk}%</Badge>
                      <span className={m.speedColor}>{m.speed}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Amount Input */}
          <Card className="glass-panel border border-purple-500/20">
            <CardHeader><CardTitle className="text-white text-sm">Exchange Amount</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="Enter crypto amount..."
                  className="w-full bg-slate-800 border border-gray-600 text-white rounded-lg p-3 text-lg" />
                <div className="flex gap-2 mt-2">
                  {[1000, 5000, 10000, 25000].map(v => (
                    <button key={v} onClick={() => setAmount(String(Math.min(v, playerData.crypto_balance || 0)))}
                      className="text-xs px-2 py-1 rounded bg-slate-700 text-gray-300 hover:bg-purple-700 transition-colors">
                      ${v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {cryptoAmount > 0 && (
                <div className="bg-slate-900/60 rounded-lg p-3 space-y-2 text-sm border border-gray-700">
                  <div className="flex justify-between"><span className="text-gray-400">Gross Amount</span><span className="text-white">${cryptoAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Laundering Fee ({method.fee}%)</span><span className="text-red-400">-${fee.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t border-gray-700 pt-2"><span className="text-gray-300">Clean Cash</span><span className="text-green-400">${cleanCash.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Detection Risk</span><span className={effectiveRisk > 40 ? 'text-red-400' : 'text-yellow-400'}>{effectiveRisk}%</span></div>
                  {wantedLevel > 0 && <p className="text-xs text-orange-400"><AlertTriangle className="w-3 h-3 inline mr-1" />Heat multiplier active: +{Math.floor(wantedLevel * 30)}% risk</p>}
                </div>
              )}

              <Button onClick={startExchange} disabled={!!activeTransaction || !cryptoAmount}
                className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg">
                {activeTransaction ? '⏳ Processing...' : '💸 Initiate Exchange'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Timeline */}
        <div className="space-y-4">
          {activeTransaction ? (
            <Card className="glass-panel border border-cyan-500/40">
              <CardHeader><CardTitle className="text-cyan-400 flex items-center gap-2"><Clock className="w-5 h-5 animate-spin" />Transaction In Progress</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Laundering via {activeTransaction.method}</span>
                    <span>{Math.floor(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="space-y-3">
                  {STAGES.map((stage, i) => (
                    <div key={stage} className={`flex items-center gap-3 transition-all ${i <= stageIndex ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i < stageIndex ? 'bg-green-600' : i === stageIndex ? 'bg-cyan-600 animate-pulse' : 'bg-gray-700'
                      }`}>
                        {i < stageIndex ? '✓' : i + 1}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${i === stageIndex ? 'text-cyan-400' : 'text-gray-300'}`}>{stage}</p>
                        <p className="text-xs text-gray-500">{['Funds sent to front', 'Being mixed & cleaned', 'Records falsified', 'Ready for pickup'][i]}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm">
                  <p className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Detection Risk: {activeTransaction.risk}%</p>
                  <p className="text-gray-400 text-xs mt-1">If caught, up to 50% of funds may be confiscated</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-panel border border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                <ArrowRightLeft className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-semibold">No Active Transaction</p>
                <p className="text-sm mt-1">Select a method and initiate an exchange</p>
              </CardContent>
            </Card>
          )}

          {/* Risk Warning Panel */}
          <Card className="glass-panel border border-yellow-500/20">
            <CardHeader><CardTitle className="text-yellow-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Risk Factors</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-gray-400">
              {wantedLevel >= 3 && <p className="text-red-400">⚠️ Critical heat — authorities actively scanning your operations</p>}
              {wantedLevel >= 2 && <p className="text-orange-400">🔥 Elevated heat increases all risk multipliers</p>}
              <p>• High risk exchanges can trigger asset freezes</p>
              <p>• Offshore accounts detected more frequently at heat level 3+</p>
              <p>• Consecutive exchanges increase cumulative risk</p>
              <p>• Lower your heat level before large exchanges</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}