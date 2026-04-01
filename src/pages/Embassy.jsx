import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Handshake, ScrollText, Landmark, Shield, TrendingUp, Users,
  Plus, CheckCircle, XCircle, Clock, Banknote, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { toast } from 'sonner';

const TREATY_TYPES = [
  { value: 'non_aggression', label: 'Non-Aggression Pact', icon: Shield, desc: 'Agree not to attack each other\'s territories', color: 'text-blue-400' },
  { value: 'shared_defense', label: 'Shared Defense', icon: Shield, desc: 'Defend each other\'s territories from rivals', color: 'text-green-400' },
  { value: 'trade_agreement', label: 'Trade Agreement', icon: TrendingUp, desc: 'Share 10% revenue bonus across supply lines', color: 'text-yellow-400' },
  { value: 'full_alliance', label: 'Full Alliance', icon: Handshake, desc: 'All benefits + shared bank account', color: 'text-purple-400' },
];

const STATUS_COLORS = {
  pending: 'bg-yellow-600',
  active: 'bg-green-600',
  rejected: 'bg-red-600',
  expired: 'bg-gray-600',
  broken: 'bg-red-800',
};

export default function Embassy() {
  const queryClient = useQueryClient();
  const [showNewTreaty, setShowNewTreaty] = useState(false);
  const [selectedType, setSelectedType] = useState('non_aggression');
  const [targetCrewId, setTargetCrewId] = useState('');
  const [terms, setTerms] = useState('');
  const [bankDeposit, setBankDeposit] = useState('');
  const [bankWithdraw, setBankWithdraw] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(null);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: myCrew } = useQuery({
    queryKey: ['crew', playerData?.crew_id],
    queryFn: () => base44.entities.Crew.filter({ id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
    select: d => d[0]
  });

  const { data: allCrews = [] } = useQuery({
    queryKey: ['allCrews'],
    queryFn: () => base44.entities.Crew.list('-reputation', 20),
  });

  const { data: treaties = [] } = useQuery({
    queryKey: ['treaties', playerData?.crew_id],
    queryFn: () => base44.entities.CrewTreaty.filter({
      $or: [
        { initiating_crew_id: playerData.crew_id },
        { target_crew_id: playerData.crew_id }
      ]
    }, '-created_date', 50),
    enabled: !!playerData?.crew_id,
    refetchInterval: 30000
  });

  const { data: allianceBanks = [] } = useQuery({
    queryKey: ['allianceBanks', playerData?.crew_id],
    queryFn: async () => {
      const activeTreaties = treaties.filter(t => t.status === 'active' && t.alliance_bank_id);
      const banks = await Promise.all(
        activeTreaties.map(t => base44.entities.AllianceBank.filter({ id: t.alliance_bank_id }))
      );
      return banks.flat();
    },
    enabled: treaties.length > 0
  });

  const proposeTreaty = useMutation({
    mutationFn: async () => {
      if (!targetCrewId) throw new Error('Select a target crew');
      const targetCrew = allCrews.find(c => c.id === targetCrewId);
      const isBoss = ['boss', 'underboss'].includes(playerData?.crew_role);
      if (!isBoss) throw new Error('Only the Boss or Underboss can propose treaties');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const treaty = await base44.entities.CrewTreaty.create({
        treaty_type: selectedType,
        initiating_crew_id: myCrew.id,
        initiating_crew_name: myCrew.name,
        target_crew_id: targetCrewId,
        target_crew_name: targetCrew.name,
        status: 'pending',
        terms: terms || 'Standard terms apply.',
        duration_days: 30,
        expires_at: expiresAt.toISOString(),
      });

      if (selectedType === 'full_alliance') {
        const bank = await base44.entities.AllianceBank.create({
          treaty_id: treaty.id,
          name: `${myCrew.name} & ${targetCrew.name} Alliance Fund`,
          crew_ids: [myCrew.id, targetCrewId],
          balance: 0,
          withdrawal_limit: 50000
        });
        await base44.entities.CrewTreaty.update(treaty.id, { alliance_bank_id: bank.id });
      }
      return treaty;
    },
    onSuccess: () => {
      toast.success('Treaty proposal sent!');
      queryClient.invalidateQueries({ queryKey: ['treaties'] });
      setShowNewTreaty(false);
      setTargetCrewId('');
      setTerms('');
    },
    onError: (e) => toast.error(e.message)
  });

  const respondTreaty = useMutation({
    mutationFn: async ({ treatyId, accept }) => {
      const status = accept ? 'active' : 'rejected';
      const update = { status };
      if (accept) update.signed_at = new Date().toISOString();
      await base44.entities.CrewTreaty.update(treatyId, update);
    },
    onSuccess: (_, { accept }) => {
      toast.success(accept ? 'Treaty accepted!' : 'Treaty rejected.');
      queryClient.invalidateQueries({ queryKey: ['treaties'] });
    }
  });

  const breakTreaty = useMutation({
    mutationFn: async (treatyId) => {
      await base44.entities.CrewTreaty.update(treatyId, {
        status: 'broken',
        broken_by_crew_id: myCrew?.id,
        break_reason: 'Unilaterally broken'
      });
    },
    onSuccess: () => {
      toast.warning('Treaty broken. Reputation penalty may apply.');
      queryClient.invalidateQueries({ queryKey: ['treaties'] });
    }
  });

  const bankDeposit_mut = useMutation({
    mutationFn: async ({ bankId, amount }) => {
      const bank = allianceBanks.find(b => b.id === bankId);
      if (!bank) throw new Error('Bank not found');
      if ((playerData?.crypto_balance || 0) < amount) throw new Error('Insufficient funds');
      const tx = { crew_id: myCrew.id, crew_name: myCrew.name, player_name: playerData.username, amount, type: 'deposit', note: 'Alliance deposit', timestamp: new Date().toISOString() };
      await base44.entities.AllianceBank.update(bankId, {
        balance: (bank.balance || 0) + amount,
        transactions: [...(bank.transactions || []), tx]
      });
      await base44.entities.Player.update(playerData.id, { crypto_balance: (playerData.crypto_balance || 0) - amount });
    },
    onSuccess: () => { toast.success('Deposited successfully!'); queryClient.invalidateQueries(); setBankDeposit(''); }
  });

  const bankWithdraw_mut = useMutation({
    mutationFn: async ({ bankId, amount }) => {
      const bank = allianceBanks.find(b => b.id === bankId);
      if (!bank) throw new Error('Bank not found');
      if (amount > (bank.withdrawal_limit || 50000)) throw new Error(`Max withdrawal: $${bank.withdrawal_limit?.toLocaleString()}`);
      if ((bank.balance || 0) < amount) throw new Error('Insufficient alliance funds');
      const tx = { crew_id: myCrew.id, crew_name: myCrew.name, player_name: playerData.username, amount: -amount, type: 'withdrawal', note: 'Alliance withdrawal', timestamp: new Date().toISOString() };
      await base44.entities.AllianceBank.update(bankId, {
        balance: (bank.balance || 0) - amount,
        transactions: [...(bank.transactions || []), tx]
      });
      await base44.entities.Player.update(playerData.id, { crypto_balance: (playerData.crypto_balance || 0) + amount });
    },
    onSuccess: () => { toast.success('Withdrawn successfully!'); queryClient.invalidateQueries(); setBankWithdraw(''); }
  });

  const isBoss = ['boss', 'underboss'].includes(playerData?.crew_role);
  const incomingTreaties = treaties.filter(t => t.target_crew_id === playerData?.crew_id && t.status === 'pending');
  const activeTreaties = treaties.filter(t => t.status === 'active');
  const otherCrews = allCrews.filter(c => c.id !== playerData?.crew_id);

  if (!playerData) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <Handshake className="w-8 h-8 text-purple-400" /> The Embassy
          </h1>
          <p className="text-gray-400 mt-1">Forge alliances, sign treaties, and manage diplomatic relations</p>
        </div>
        {isBoss && (
          <Button onClick={() => setShowNewTreaty(!showNewTreaty)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Propose Treaty
          </Button>
        )}
      </div>

      {/* Incoming Treaty Requests */}
      {incomingTreaties.length > 0 && (
        <Card className="glass-panel border border-yellow-500/40">
          <CardHeader><CardTitle className="text-yellow-400 flex items-center gap-2"><Clock className="w-5 h-5" /> Incoming Proposals ({incomingTreaties.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {incomingTreaties.map(t => {
              const ttype = TREATY_TYPES.find(x => x.value === t.treaty_type);
              return (
                <div key={t.id} className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-semibold">{t.initiating_crew_name}</span>
                      <span className="text-gray-400 mx-2">proposes</span>
                      <span className={`font-semibold ${ttype?.color}`}>{ttype?.label}</span>
                    </div>
                    <div className="flex gap-2">
                      {isBoss && <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => respondTreaty.mutate({ treatyId: t.id, accept: true })}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => respondTreaty.mutate({ treatyId: t.id, accept: false })}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </>}
                    </div>
                  </div>
                  {t.terms && <p className="text-sm text-gray-400 italic">"{t.terms}"</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* New Treaty Form */}
      {showNewTreaty && (
        <Card className="glass-panel border border-purple-500/40">
          <CardHeader><CardTitle className="text-white">Draft New Treaty</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Treaty Type</p>
              <div className="grid grid-cols-2 gap-3">
                {TREATY_TYPES.map(t => (
                  <button key={t.value} onClick={() => setSelectedType(t.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${selectedType === t.value ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 hover:border-purple-500/50'}`}>
                    <p className={`font-semibold text-sm ${t.color}`}>{t.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Target Crew</p>
              <select value={targetCrewId} onChange={e => setTargetCrewId(e.target.value)}
                className="w-full bg-slate-800 border border-gray-600 text-white rounded-lg p-2">
                <option value="">Select a crew...</option>
                {otherCrews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Custom Terms (optional)</p>
              <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
                placeholder="Any specific terms or conditions..."
                className="w-full bg-slate-800 border border-gray-600 text-white rounded-lg p-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => proposeTreaty.mutate()} disabled={proposeTreaty.isPending}>
                {proposeTreaty.isPending ? 'Sending...' : 'Send Proposal'}
              </Button>
              <Button variant="outline" onClick={() => setShowNewTreaty(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="log">
        <TabsList className="glass-panel border-purple-500/30">
          <TabsTrigger value="log"><ScrollText className="w-4 h-4 mr-1" />Diplomatic Log</TabsTrigger>
          <TabsTrigger value="bank"><Landmark className="w-4 h-4 mr-1" />Alliance Banks</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-3 mt-4">
          {treaties.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No treaties on record. Propose one to get started.</div>
          ) : (
            treaties.map(t => {
              const ttype = TREATY_TYPES.find(x => x.value === t.treaty_type);
              const isInitiator = t.initiating_crew_id === playerData?.crew_id;
              const otherCrew = isInitiator ? t.target_crew_name : t.initiating_crew_name;
              return (
                <Card key={t.id} className="glass-panel border border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center`}>
                          <Handshake className={`w-5 h-5 ${ttype?.color}`} />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{ttype?.label} with <span className="text-purple-300">{otherCrew}</span></p>
                          <p className="text-xs text-gray-400">{isInitiator ? 'You proposed' : 'They proposed'} · {t.expires_at ? `Expires ${new Date(t.expires_at).toLocaleDateString()}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[t.status]}>{t.status}</Badge>
                        {t.status === 'active' && isBoss && (
                          <Button size="sm" variant="destructive" onClick={() => breakTreaty.mutate(t.id)}>Break</Button>
                        )}
                      </div>
                    </div>
                    {t.terms && <p className="text-sm text-gray-400 italic mt-2 ml-13">"{t.terms}"</p>}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="bank" className="space-y-4 mt-4">
          {allianceBanks.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No alliance banks. Sign a Full Alliance treaty to create one.</div>
          ) : (
            allianceBanks.map(bank => (
              <Card key={bank.id} className="glass-panel border border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-yellow-400 flex items-center gap-2">
                    <Landmark className="w-5 h-5" /> {bank.name}
                    <span className="ml-auto text-white text-xl">${(bank.balance || 0).toLocaleString()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <input type="number" value={bankDeposit} onChange={e => setBankDeposit(e.target.value)}
                        placeholder="Amount to deposit" className="w-full bg-slate-800 border border-gray-600 text-white rounded p-2 text-sm" />
                      <Button className="w-full bg-green-700 hover:bg-green-600" onClick={() => bankDeposit_mut.mutate({ bankId: bank.id, amount: Number(bankDeposit) })} disabled={!bankDeposit}>
                        <ArrowDownLeft className="w-4 h-4 mr-1" /> Deposit
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <input type="number" value={bankWithdraw} onChange={e => setBankWithdraw(e.target.value)}
                        placeholder="Amount to withdraw" className="w-full bg-slate-800 border border-gray-600 text-white rounded p-2 text-sm" />
                      <Button className="w-full bg-red-800 hover:bg-red-700" onClick={() => bankWithdraw_mut.mutate({ bankId: bank.id, amount: Number(bankWithdraw) })} disabled={!bankWithdraw}>
                        <ArrowUpRight className="w-4 h-4 mr-1" /> Withdraw
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm font-semibold mb-2">Transaction History</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {(bank.transactions || []).slice().reverse().map((tx, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-gray-800">
                          <span className="text-gray-300">{tx.player_name} <span className="text-gray-500">({tx.crew_name})</span></span>
                          <span className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                            {tx.amount > 0 ? '+' : ''}${tx.amount?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {(bank.transactions || []).length === 0 && <p className="text-gray-600 text-xs">No transactions yet.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}