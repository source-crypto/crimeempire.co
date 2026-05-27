import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TechTreeNode from '../components/techtree/TechTreeNode';
import {
  Cpu, Shield, Truck, Scale, Swords, Eye, TrendingUp, Loader2, Zap, Lock
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Static tech tree definition ───────────────────────────────────────────
const TECH_NODES = [
  // INFILTRATION
  { node_id: 'inf_1', node_name: 'Lockpick Mastery',        category: 'infiltration', tier: 1, max_level: 3, cost_per_level: 25000,  icon: '🔓', prerequisites: [],               description: 'Advanced lock-picking tools reduce infiltration time and increase success rates.',   bonuses: { infiltration_speed: 0.15, heist_success: 0.1 } },
  { node_id: 'inf_2', node_name: 'Signal Jammers',           category: 'infiltration', tier: 2, max_level: 3, cost_per_level: 50000,  icon: '📡', prerequisites: ['inf_1'],         description: 'Military-grade jammers disable alarm systems and cameras during operations.',        bonuses: { alarm_bypass: 0.25, heat_reduction: 5 } },
  { node_id: 'inf_3', node_name: 'Stealth Suits',            category: 'infiltration', tier: 2, max_level: 3, cost_per_level: 60000,  icon: '🥷', prerequisites: ['inf_1'],         description: 'Custom stealth suits with thermal masking reduce detection chance.',                bonuses: { stealth_bonus: 0.2, capture_resistance: 0.15 } },
  { node_id: 'inf_4', node_name: 'Quantum Bypass',           category: 'infiltration', tier: 3, max_level: 2, cost_per_level: 150000, icon: '⚡', prerequisites: ['inf_2','inf_3'], description: 'Cutting-edge tech that bypasses biometric and digital security systems.',          bonuses: { vault_crack_speed: 0.4, digital_lock_bypass: true } },

  // TRANSPORT
  { node_id: 'trp_1', node_name: 'Turbo Engines',            category: 'transport', tier: 1, max_level: 3, cost_per_level: 20000,  icon: '🚀', prerequisites: [],               description: 'High-performance engine mods make getaway vehicles 30% faster.',                   bonuses: { vehicle_speed: 0.3, escape_success: 0.15 } },
  { node_id: 'trp_2', node_name: 'Armored Plating',          category: 'transport', tier: 2, max_level: 3, cost_per_level: 45000,  icon: '🛡️', prerequisites: ['trp_1'],         description: 'Military-grade plating protects vehicles from pursuit and ambushes.',              bonuses: { vehicle_armor: 40, hijack_resistance: 0.3 } },
  { node_id: 'trp_3', node_name: 'Smuggler Compartments',    category: 'transport', tier: 2, max_level: 3, cost_per_level: 35000,  icon: '📦', prerequisites: ['trp_1'],         description: 'Hidden compartments in crew vehicles increase smuggling capacity by 50%.',         bonuses: { smuggling_capacity: 0.5, detection_reduction: 0.2 } },
  { node_id: 'trp_4', node_name: 'Air Transport Network',    category: 'transport', tier: 3, max_level: 2, cost_per_level: 200000, icon: '🚁', prerequisites: ['trp_2','trp_3'], description: 'Private helicopter fleet enables rapid crew deployment across all territories.',    bonuses: { deployment_range: 999, territory_income: 0.1 } },

  // LEGAL DEFENSE
  { node_id: 'leg_1', node_name: 'Retainer Network',         category: 'legal', tier: 1, max_level: 3, cost_per_level: 30000,  icon: '⚖️', prerequisites: [],               description: 'A network of on-call lawyers reduces heat buildup from all operations.',            bonuses: { heat_decay: 0.2, lawyer_speed: 0.25 } },
  { node_id: 'leg_2', node_name: 'Evidence Suppression',     category: 'legal', tier: 2, max_level: 3, cost_per_level: 55000,  icon: '🗂️', prerequisites: ['leg_1'],         description: 'Contacts inside the DA\'s office help disappear evidence before trial.',           bonuses: { arrest_immunity: 0.2, case_dismissal: 0.15 } },
  { node_id: 'leg_3', node_name: 'Corrupt Judges',           category: 'legal', tier: 2, max_level: 3, cost_per_level: 75000,  icon: '👨‍⚖️', prerequisites: ['leg_1'],        description: 'Bribed judicial contacts guarantee favorable rulings and early releases.',         bonuses: { sentence_reduction: 0.5, bail_discount: 0.4 } },
  { node_id: 'leg_4', node_name: 'Political Immunity',       category: 'legal', tier: 3, max_level: 2, cost_per_level: 250000, icon: '🏛️', prerequisites: ['leg_2','leg_3'], description: 'High-level political contacts grant near-immunity from law enforcement.',          bonuses: { wanted_level_cap: 3, police_raid_immunity: 0.35 } },

  // COMBAT
  { node_id: 'cbt_1', node_name: 'Combat Training',          category: 'combat', tier: 1, max_level: 3, cost_per_level: 20000,  icon: '🥊', prerequisites: [],               description: 'Elite martial arts and firearms training boosts all crew combat stats.',           bonuses: { crew_combat: 0.2, battle_win_rate: 0.1 } },
  { node_id: 'cbt_2', node_name: 'Black Market Weapons',     category: 'combat', tier: 2, max_level: 3, cost_per_level: 40000,  icon: '🔫', prerequisites: ['cbt_1'],         description: 'Access to illegal military-grade weapons gives combat advantages.',               bonuses: { weapon_damage: 0.3, intimidation: 0.25 } },
  { node_id: 'cbt_3', node_name: 'Mercenary Contracts',      category: 'combat', tier: 2, max_level: 3, cost_per_level: 60000,  icon: '💀', prerequisites: ['cbt_1'],         description: 'Elite mercenaries augment crew strength in territory battles.',                  bonuses: { reinforcement_strength: 0.4, defense_bonus: 20 } },
  { node_id: 'cbt_4', node_name: 'Military Arsenal',         category: 'combat', tier: 3, max_level: 2, cost_per_level: 180000, icon: '💣', prerequisites: ['cbt_2','cbt_3'], description: 'Access to military explosives and heavy weapons dominates any conflict.',         bonuses: { area_damage: 0.5, territory_siege_speed: 0.4 } },

  // INTELLIGENCE
  { node_id: 'int_1', node_name: 'Informant Network',        category: 'intelligence', tier: 1, max_level: 3, cost_per_level: 25000,  icon: '👁️', prerequisites: [],              description: 'Street-level informants provide early warnings of police operations.',            bonuses: { raid_warning: true, intel_accuracy: 0.2 } },
  { node_id: 'int_2', node_name: 'Surveillance Systems',     category: 'intelligence', tier: 2, max_level: 3, cost_per_level: 50000,  icon: '📷', prerequisites: ['int_1'],        description: 'City-wide camera feeds give real-time intelligence on rival movements.',         bonuses: { rival_tracking: true, ambush_prevention: 0.3 } },
  { node_id: 'int_3', node_name: 'Hacker Collective',        category: 'intelligence', tier: 2, max_level: 3, cost_per_level: 65000,  icon: '💻', prerequisites: ['int_1'],        description: 'Elite hackers breach police databases and track investigations.',               bonuses: { case_file_access: true, evidence_destroy: 0.25 } },
  { node_id: 'int_4', node_name: 'AI Predictive Analysis',   category: 'intelligence', tier: 3, max_level: 2, cost_per_level: 175000, icon: '🤖', prerequisites: ['int_2','int_3'], description: 'AI systems predict law enforcement moves and rival crew actions.',             bonuses: { operation_success: 0.15, enemy_prediction: true } },

  // ECONOMY
  { node_id: 'eco_1', node_name: 'Money Laundering v2',      category: 'economy', tier: 1, max_level: 3, cost_per_level: 30000,  icon: '💵', prerequisites: [],               description: 'Advanced laundering networks increase clean income rate by 20%.',               bonuses: { laundering_rate: 0.2, heat_per_dollar: -0.1 } },
  { node_id: 'eco_2', node_name: 'Shell Corporation Web',    category: 'economy', tier: 2, max_level: 3, cost_per_level: 60000,  icon: '🏢', prerequisites: ['eco_1'],         description: 'Layers of shell companies make financial tracking nearly impossible.',          bonuses: { income_protection: 0.3, audit_immunity: 0.4 } },
  { node_id: 'eco_3', node_name: 'Crypto Network',           category: 'economy', tier: 2, max_level: 3, cost_per_level: 55000,  icon: '₿',  prerequisites: ['eco_1'],         description: 'Untraceable crypto transactions and mixing services protect wealth.',           bonuses: { transaction_anonymity: true, wealth_safety: 0.25 } },
  { node_id: 'eco_4', node_name: 'Offshore Empire',          category: 'economy', tier: 3, max_level: 2, cost_per_level: 220000, icon: '🌐', prerequisites: ['eco_2','eco_3'], description: 'Offshore banks in 3 countries keep crew wealth completely untouchable.',        bonuses: { asset_protection: 0.5, passive_income: 50000 } },
];

const CATEGORY_META = {
  infiltration: { label: 'Infiltration',   icon: Zap,       color: 'text-purple-400' },
  transport:    { label: 'Transport',       icon: Truck,     color: 'text-cyan-400' },
  legal:        { label: 'Legal Defense',  icon: Scale,     color: 'text-green-400' },
  combat:       { label: 'Combat',          icon: Swords,    color: 'text-red-400' },
  intelligence: { label: 'Intelligence',   icon: Eye,       color: 'text-yellow-400' },
  economy:      { label: 'Economy',         icon: TrendingUp,color: 'text-emerald-400' },
};

export default function CrewTechTreePage() {
  const [activeCategory, setActiveCategory] = useState('infiltration');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: crew } = useQuery({
    queryKey: ['crew', playerData?.crew_id],
    queryFn: () => base44.entities.Crew.filter({ id: playerData.crew_id }).then(r => r[0]),
    enabled: !!playerData?.crew_id,
  });

  const { data: unlockedNodes = [], isLoading } = useQuery({
    queryKey: ['crewTechTree', playerData?.crew_id],
    queryFn: () => base44.entities.CrewTechTree.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (node) => {
      const cost = node.cost_per_level * node.level;
      if (playerData.crypto_balance < cost) throw new Error('Insufficient funds');

      const existing = unlockedNodes.find(n => n.node_id === node.node_id);

      if (existing) {
        await base44.entities.CrewTechTree.update(existing.id, {
          level: existing.level + 1,
          status: existing.level + 1 >= node.max_level ? 'unlocked' : 'available',
          total_invested: (existing.total_invested || 0) + cost,
        });
      } else {
        await base44.entities.CrewTechTree.create({
          crew_id: playerData.crew_id,
          node_id: node.node_id,
          node_name: node.node_name,
          category: node.category,
          tier: node.tier,
          level: 1,
          max_level: node.max_level,
          cost_per_level: node.cost_per_level,
          status: node.max_level === 1 ? 'unlocked' : 'available',
          total_invested: cost,
          prerequisites: node.prerequisites,
          bonuses: node.bonuses,
          description: node.description,
          icon: node.icon,
          unlocked_at: new Date().toISOString(),
        });
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewTechTree']);
      queryClient.invalidateQueries(['player']);
      toast.success('Tech upgrade purchased!');
    },
    onError: (e) => toast.error(e.message),
  });

  // Compute enriched node list with current status
  const getEnrichedNodes = (category) => {
    return TECH_NODES.filter(n => n.category === category).map(n => {
      const saved = unlockedNodes.find(u => u.node_id === n.node_id);
      const level = saved?.level ?? 0;
      const prereqsMet = n.prerequisites.every(p => {
        const savedPrereq = unlockedNodes.find(u => u.node_id === p);
        return savedPrereq && savedPrereq.level >= 1;
      });
      const status = level >= n.max_level ? 'unlocked'
        : level > 0 ? 'available'
        : prereqsMet ? 'available'
        : 'locked';

      return { ...n, level, status, total_invested: saved?.total_invested ?? 0 };
    });
  };

  const totalInvested = unlockedNodes.reduce((s, n) => s + (n.total_invested || 0), 0);
  const totalUnlocked = unlockedNodes.filter(n => n.level >= 1).length;

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!playerData.crew_id) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <Lock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Join a crew to access the Tech Tree</p>
          <p className="text-gray-500 text-sm mt-2">Crew upgrades benefit all members permanently</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Crew Tech Tree
          </h1>
          <p className="text-gray-400 mt-1">
            Invest wealth into permanent upgrades for <span className="text-purple-300">{crew?.name || 'your crew'}</span>
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div className="glass-panel border border-purple-500/20 rounded-lg px-4 py-2">
            <p className="text-xs text-gray-400">Your Balance</p>
            <p className="text-lg font-bold text-cyan-400">${playerData.crypto_balance?.toLocaleString()}</p>
          </div>
          <div className="glass-panel border border-purple-500/20 rounded-lg px-4 py-2">
            <p className="text-xs text-gray-400">Nodes Unlocked</p>
            <p className="text-lg font-bold text-purple-400">{totalUnlocked} / {TECH_NODES.length}</p>
          </div>
          <div className="glass-panel border border-purple-500/20 rounded-lg px-4 py-2">
            <p className="text-xs text-gray-400">Total Invested</p>
            <p className="text-lg font-bold text-green-400">${totalInvested.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="glass-panel border border-purple-500/20 h-auto flex flex-wrap gap-1 p-1">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const nodesInCat = TECH_NODES.filter(n => n.category === key);
            const unlockedInCat = unlockedNodes.filter(n => nodesInCat.some(t => t.node_id === n.node_id) && n.level >= 1).length;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2 data-[state=active]:bg-purple-600/40"
              >
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <span>{meta.label}</span>
                <Badge className="bg-gray-700 text-gray-300 text-xs">{unlockedInCat}/{nodesInCat.length}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(CATEGORY_META).map(category => (
          <TabsContent key={category} value={category} className="mt-4">
            <div className="space-y-6">
              {/* Tier groups */}
              {[1, 2, 3].map(tier => {
                const tierNodes = getEnrichedNodes(category).filter(n => n.tier === tier);
                if (tierNodes.length === 0) return null;
                return (
                  <div key={tier}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-purple-500/20" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Tier {tier} {tier === 3 ? '— Elite' : tier === 2 ? '— Advanced' : '— Basic'}
                      </span>
                      <div className="h-px flex-1 bg-purple-500/20" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {tierNodes.map(node => (
                        <TechTreeNode
                          key={node.node_id}
                          node={node}
                          onUpgrade={upgradeMutation.mutate}
                          isPending={upgradeMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Active Bonuses Summary */}
      {unlockedNodes.length > 0 && (
        <Card className="glass-panel border-cyan-500/20">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Active Crew Bonuses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {unlockedNodes.map(saved => {
                const template = TECH_NODES.find(t => t.node_id === saved.node_id);
                if (!template || saved.level < 1) return null;
                return (
                  <div key={saved.id} className="p-3 rounded-lg bg-slate-900/40 border border-purple-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{template.icon}</span>
                      <span className="text-sm font-semibold text-white truncate">{template.node_name}</span>
                    </div>
                    <Badge className="text-xs bg-purple-700">Lv {saved.level}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}