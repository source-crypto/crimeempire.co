import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Plus, Zap, DollarSign, Package, Link, TrendingUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Predefined enterprise chain templates
const CHAIN_TEMPLATES = [
  {
    id: 'narcotics',
    name: '💊 Narcotics Pipeline',
    color: 'from-green-900/40 to-emerald-900/20',
    border: 'border-green-500/30',
    nodes: [
      { role: 'producer',    label: 'Drug Lab',      emoji: '🧪', type: 'marijuana_farm',       produces: 'Raw Materials', rate: 200, income: 0 },
      { role: 'processor',   label: 'Chemist Den',   emoji: '⚗️', type: 'money_laundering',     produces: 'Product',       rate: 150, income: 2000 },
      { role: 'distributor', label: 'Street Network',emoji: '🏙️', type: 'counterfeiting_operation', produces: 'Revenue',  rate: 0,   income: 8000 },
    ]
  },
  {
    id: 'weapons',
    name: '🔫 Arms Trafficking Chain',
    color: 'from-red-900/40 to-orange-900/20',
    border: 'border-red-500/30',
    nodes: [
      { role: 'producer',    label: 'Materials Cache', emoji: '📦', type: 'weapons_cache',         produces: 'Raw Parts',    rate: 300, income: 0 },
      { role: 'processor',   label: 'Arms Workshop',   emoji: '🔧', type: 'arms_manufacturing',    produces: 'Weapons',      rate: 200, income: 3000 },
      { role: 'distributor', label: 'Black Market Hub', emoji: '💼', type: 'counterfeiting_operation', produces: 'Revenue', rate: 0,   income: 12000 },
    ]
  },
  {
    id: 'vehicles',
    name: '🚗 Vehicle Trafficking Ring',
    color: 'from-cyan-900/40 to-blue-900/20',
    border: 'border-cyan-500/30',
    nodes: [
      { role: 'producer',    label: 'Chop Shop',        emoji: '🔨', type: 'chop_shop',        produces: 'Parts',     rate: 250, income: 0 },
      { role: 'processor',   label: 'Rebuild Facility', emoji: '🏗️', type: 'material_production', produces: 'Vehicles',rate: 180, income: 2500 },
      { role: 'distributor', label: 'Export Network',   emoji: '🚢', type: 'money_laundering', produces: 'Revenue',   rate: 0,   income: 9500 },
    ]
  },
  {
    id: 'financial',
    name: '💰 Money Laundering Network',
    color: 'from-yellow-900/40 to-orange-900/20',
    border: 'border-yellow-500/30',
    nodes: [
      { role: 'producer',    label: 'Dirty Cash Source', emoji: '💵', type: 'counterfeiting_operation', produces: 'Dirty Money', rate: 500, income: 0 },
      { role: 'processor',   label: 'Shell Company',     emoji: '🏢', type: 'money_laundering',         produces: 'Mixed Funds', rate: 400, income: 4000 },
      { role: 'distributor', label: 'Clean Accounts',    emoji: '🏦', type: 'money_laundering',         produces: 'Clean Crypto',rate: 0,   income: 15000 },
    ]
  }
];

const ROLE_COLORS = {
  producer:    'border-green-500/50 bg-green-900/20',
  processor:   'border-blue-500/50 bg-blue-900/20',
  distributor: 'border-purple-500/50 bg-purple-900/20',
};

const ROLE_LABELS = {
  producer:    { label: 'Producer', color: 'bg-green-700' },
  processor:   { label: 'Processor', color: 'bg-blue-700' },
  distributor: { label: 'Distributor', color: 'bg-purple-700' },
};

// Visual SVG flow arrow between nodes
function FlowArrow({ active }) {
  return (
    <div className="flex items-center justify-center w-8 shrink-0">
      <div className={`flex flex-col items-center gap-0.5 ${active ? 'opacity-100' : 'opacity-30'}`}>
        <div className={`w-6 h-0.5 ${active ? 'bg-gradient-to-r from-cyan-400 to-purple-400' : 'bg-gray-600'}`} />
        <div className={`w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent ${active ? 'border-l-purple-400' : 'border-l-gray-600'}`} style={{ marginLeft: 2 }} />
        {active && (
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function ChainFlowChart({ template, enterprises, onActivate }) {
  // Match player's enterprises to chain nodes by type
  const linkedNodes = template.nodes.map(node => {
    const matched = enterprises.find(e => e.type === node.type && e.is_active);
    return { ...node, enterprise: matched, active: !!matched };
  });

  const allActive = linkedNodes.every(n => n.active);
  const chainMultiplier = allActive ? 1.5 : linkedNodes.filter(n => n.active).length * 0.4;
  const chainIncome = template.nodes.reduce((s, n) => s + n.income, 0);
  const activeIncome = Math.floor(chainIncome * chainMultiplier);

  return (
    <Card className={`glass-panel bg-gradient-to-br ${template.color} ${template.border}`}>
      <CardHeader className="border-b border-white/10 pb-3">
        <CardTitle className="text-white text-base flex items-center justify-between">
          <span>{template.name}</span>
          <div className="flex items-center gap-2">
            {allActive ? (
              <Badge className="bg-green-700 animate-pulse text-xs">⚡ CHAIN ACTIVE</Badge>
            ) : (
              <Badge className="bg-gray-700 text-xs">{linkedNodes.filter(n => n.active).length}/{linkedNodes.length} linked</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Flow Diagram */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
          {linkedNodes.map((node, idx) => (
            <React.Fragment key={node.role}>
              {idx > 0 && <FlowArrow active={linkedNodes[idx - 1].active && node.active} />}
              <div className={`shrink-0 p-3 rounded-xl border text-center min-w-[110px] transition-all ${ROLE_COLORS[node.role]} ${node.active ? 'opacity-100' : 'opacity-50'}`}>
                <div className="text-2xl mb-1">{node.emoji}</div>
                <p className="text-white text-xs font-semibold">{node.label}</p>
                <Badge className={`${ROLE_LABELS[node.role].color} text-[10px] mt-1`}>{ROLE_LABELS[node.role].label}</Badge>
                {node.active ? (
                  <div className="mt-2 text-xs">
                    <div className="text-green-400">✓ Linked</div>
                    {node.income > 0 && <div className="text-yellow-400">+${node.income.toLocaleString()}/day</div>}
                    {node.rate > 0 && <div className="text-cyan-400">{node.rate} units/hr</div>}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">
                    <div>Need: {node.type.replace(/_/g, ' ')}</div>
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Chain Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
          <div className="p-2 rounded-lg bg-black/30">
            <p className="text-gray-400">Chain Bonus</p>
            <p className="text-yellow-400 font-bold">{(chainMultiplier * 100).toFixed(0)}%</p>
          </div>
          <div className="p-2 rounded-lg bg-black/30">
            <p className="text-gray-400">Daily Income</p>
            <p className="text-green-400 font-bold">${activeIncome.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-black/30">
            <p className="text-gray-400">Max Potential</p>
            <p className="text-cyan-400 font-bold">${Math.floor(chainIncome * 1.5).toLocaleString()}</p>
          </div>
        </div>

        {/* Progress toward full chain */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Chain Completion</span>
            <span>{Math.round((linkedNodes.filter(n => n.active).length / linkedNodes.length) * 100)}%</span>
          </div>
          <Progress value={(linkedNodes.filter(n => n.active).length / linkedNodes.length) * 100} className="h-2" />
        </div>

        {!allActive && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Link className="w-3 h-3" />
            Build missing enterprise types to complete this chain and earn full bonuses
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function EnterpriseChainDashboard({ enterprises = [], playerData }) {
  const queryClient = useQueryClient();
  const [collectingChain, setCollectingChain] = useState(null);

  const collectChainIncome = useMutation({
    mutationFn: async (template) => {
      const lastKey = `chain_income_${template.id}`;
      const lastClaim = parseInt(localStorage.getItem(lastKey) || '0');
      if (Date.now() - lastClaim < 3600000) throw new Error('Chain income already collected this hour');

      const linkedCount = template.nodes.filter(node =>
        enterprises.find(e => e.type === node.type && e.is_active)
      ).length;
      const allActive = linkedCount === template.nodes.length;
      const multiplier = allActive ? 1.5 : linkedCount * 0.4;
      const income = Math.floor(template.nodes.reduce((s, n) => s + n.income, 0) * multiplier / 24);

      if (income <= 0) throw new Error('No linked enterprises in this chain');

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + income,
        total_earnings: (playerData.total_earnings || 0) + income
      });
      localStorage.setItem(lastKey, Date.now().toString());
      return { income, template: template.name };
    },
    onSuccess: ({ income, template }) => {
      queryClient.invalidateQueries(['player']);
      toast.success(`💰 Chain income: +$${income.toLocaleString()} from ${template}`);
      setCollectingChain(null);
    },
    onError: err => {
      toast.error(err.message);
      setCollectingChain(null);
    }
  });

  // Summary stats
  const totalChainIncome = CHAIN_TEMPLATES.reduce((sum, template) => {
    const linkedCount = template.nodes.filter(node =>
      enterprises.find(e => e.type === node.type && e.is_active)
    ).length;
    const multiplier = linkedCount === template.nodes.length ? 1.5 : linkedCount * 0.4;
    return sum + Math.floor(template.nodes.reduce((s, n) => s + n.income, 0) * multiplier);
  }, 0);

  const completeChains = CHAIN_TEMPLATES.filter(template =>
    template.nodes.every(node => enterprises.find(e => e.type === node.type && e.is_active))
  ).length;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/30 text-center">
          <Link className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{completeChains}/{CHAIN_TEMPLATES.length}</p>
          <p className="text-xs text-gray-400">Complete Chains</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-900/40 to-orange-900/20 border border-yellow-500/30 text-center">
          <DollarSign className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">${totalChainIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Chain Daily Income</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-900/40 to-blue-900/20 border border-cyan-500/30 text-center">
          <TrendingUp className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-cyan-400">x{completeChains > 0 ? '1.5' : '1.0'}</p>
          <p className="text-xs text-gray-400">Chain Multiplier</p>
        </div>
      </div>

      {/* How it works */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 text-xs text-gray-400">
        <p className="text-white font-semibold mb-1 flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-yellow-400" />How Enterprise Chains Work</p>
        <p>Chain 3 enterprises together (<span className="text-green-400">Producer → Processor → Distributor</span>) to unlock a <span className="text-yellow-400">1.5x income multiplier</span>. Partial chains still earn bonuses. Each chain generates passive crypto hourly.</p>
      </div>

      {/* Chain Cards */}
      <div className="space-y-4">
        {CHAIN_TEMPLATES.map(template => (
          <div key={template.id} className="space-y-2">
            <ChainFlowChart
              template={template}
              enterprises={enterprises}
              onActivate={() => {}}
            />
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-yellow-700 to-orange-700 hover:from-yellow-600 hover:to-orange-600 text-xs"
              onClick={() => {
                setCollectingChain(template.id);
                collectChainIncome.mutate(template);
              }}
              disabled={collectChainIncome.isPending && collectingChain === template.id}
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Collect Chain Income
              {collectChainIncome.isPending && collectingChain === template.id && (
                <RefreshCw className="w-3 h-3 ml-1 animate-spin" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {enterprises.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Create enterprises to start building chains</p>
          <p className="text-xs mt-1">Go to Enterprises page → New Enterprise to get started</p>
        </div>
      )}
    </div>
  );
}