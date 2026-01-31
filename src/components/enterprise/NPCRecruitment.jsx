import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Zap, User, Lock } from 'lucide-react';
import { toast } from 'sonner';

const npcTypes = {
  manager: { icon: '👔', label: 'Manager', bonus: 'production' },
  scientist: { icon: '🔬', label: 'Scientist', bonus: 'research' },
  enforcer: { icon: '💪', label: 'Enforcer', bonus: 'defense' },
  negotiator: { icon: '🤝', label: 'Negotiator', bonus: 'deals' },
  hacker: { icon: '💻', label: 'Hacker', bonus: 'systems' },
  dealer: { icon: '💰', label: 'Dealer', bonus: 'sales' }
};

const rarityColors = {
  common: 'bg-gray-600',
  uncommon: 'bg-green-600',
  rare: 'bg-blue-600',
  epic: 'bg-purple-600',
  legendary: 'bg-yellow-600'
};

const baseNPCs = [
  {
    npc_name: 'Marcus Chen',
    npc_type: 'manager',
    specialization: 'Operations',
    skill_level: 5,
    rarity: 'rare',
    trait: 'Efficient',
    production_bonus: 15,
    salary_cost_hourly: 500,
    recruit_cost: 10000
  },
  {
    npc_name: 'Dr. Elena Volkov',
    npc_type: 'scientist',
    specialization: 'Drug Synthesis',
    skill_level: 7,
    rarity: 'epic',
    trait: 'Perfectionist',
    production_bonus: 25,
    salary_cost_hourly: 800,
    recruit_cost: 25000
  },
  {
    npc_name: 'Viktor Kozlov',
    npc_type: 'enforcer',
    specialization: 'Territory Defense',
    skill_level: 6,
    rarity: 'epic',
    trait: 'Brutal',
    production_bonus: 20,
    salary_cost_hourly: 600,
    recruit_cost: 18000
  },
  {
    npc_name: 'Sarah Mitchell',
    npc_type: 'negotiator',
    specialization: 'Black Market Trading',
    skill_level: 5,
    rarity: 'rare',
    trait: 'Persuasive',
    production_bonus: 12,
    salary_cost_hourly: 400,
    recruit_cost: 12000
  },
  {
    npc_name: 'Jackson "Cipher" Lee',
    npc_type: 'hacker',
    specialization: 'Network Security',
    skill_level: 8,
    rarity: 'legendary',
    trait: 'Genius',
    production_bonus: 30,
    salary_cost_hourly: 1200,
    recruit_cost: 50000
  },
  {
    npc_name: 'Franco Rossi',
    npc_type: 'dealer',
    specialization: 'Street Networks',
    skill_level: 4,
    rarity: 'common',
    trait: 'Connected',
    production_bonus: 8,
    salary_cost_hourly: 250,
    recruit_cost: 5000
  }
];

export default function NPCRecruitment({ enterpriseData, playerData }) {
  const queryClient = useQueryClient();
  const [selectedNPC, setSelectedNPC] = useState(null);

  const { data: recruitedNPCs = [] } = useQuery({
    queryKey: ['enterpriseNPCs', enterpriseData?.id],
    queryFn: () => base44.entities.EnterpriseNPC.filter({ enterprise_id: enterpriseData.id }),
    enabled: !!enterpriseData?.id
  });

  const recruitMutation = useMutation({
    mutationFn: async (npcTemplate) => {
      if (!playerData || playerData.crypto_balance < npcTemplate.recruit_cost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.EnterpriseNPC.create({
        enterprise_id: enterpriseData.id,
        npc_name: npcTemplate.npc_name,
        npc_type: npcTemplate.npc_type,
        specialization: npcTemplate.specialization,
        skill_level: npcTemplate.skill_level,
        rarity: npcTemplate.rarity,
        trait: npcTemplate.trait,
        production_bonus: npcTemplate.production_bonus,
        salary_cost_hourly: npcTemplate.salary_cost_hourly,
        employment_start_date: new Date().toISOString()
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - npcTemplate.recruit_cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseNPCs']);
      queryClient.invalidateQueries(['player']);
      toast.success('NPC recruited successfully!');
      setSelectedNPC(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const isNPCRecruited = (npcName) => recruitedNPCs.some(n => n.npc_name === npcName);

  return (
    <div className="space-y-6">
      {/* Recruited NPCs */}
      {recruitedNPCs.length > 0 && (
        <Card className="glass-panel border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-green-400" />
              Staff ({recruitedNPCs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recruitedNPCs.map((npc) => {
                const typeInfo = npcTypes[npc.npc_type];
                return (
                  <div key={npc.id} className={`p-4 rounded-lg bg-slate-900/50 border-l-4 border-green-500`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <div>
                            <h4 className="text-white font-semibold">{npc.npc_name}</h4>
                            <p className="text-xs text-gray-400">{npc.specialization}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={rarityColors[npc.rarity]}>{npc.rarity}</Badge>
                          <span className="text-xs text-yellow-400">Skill: {npc.skill_level}/10</span>
                          <span className="text-xs text-purple-400">+{npc.production_bonus}% output</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <p>Loyalty: {npc.loyalty}%</p>
                        <p className="text-red-400">-${npc.salary_cost_hourly}/hr</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available NPCs for Recruitment */}
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="w-5 h-5 text-cyan-400" />
            Recruit Specialists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {baseNPCs.map((npc) => {
              const typeInfo = npcTypes[npc.npc_type];
              const isRecruited = isNPCRecruited(npc.npc_name);
              const canRecruit = playerData && playerData.crypto_balance >= npc.recruit_cost;

              return (
                <div
                  key={npc.npc_name}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isRecruited
                      ? 'bg-green-900/20 border-green-500/30'
                      : 'bg-slate-900/50 border-cyan-500/30 hover:border-cyan-500/50'
                  }`}
                  onClick={() => setSelectedNPC(selectedNPC === npc.npc_name ? null : npc.npc_name)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{typeInfo.icon}</span>
                        <div>
                          <h4 className="text-white font-semibold">{npc.npc_name}</h4>
                          <p className="text-xs text-gray-400">{npc.specialization}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <Badge className={rarityColors[npc.rarity]}>{npc.rarity}</Badge>
                        <Badge variant="outline" className="text-xs">
                          ⚡ {npc.skill_level}/10
                        </Badge>
                        <Badge variant="outline" className="text-xs text-green-400">
                          +{npc.production_bonus}%
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        <span className="text-purple-400">Trait:</span> {npc.trait}
                      </p>
                    </div>

                    <div className="text-right">
                      {isRecruited ? (
                        <Badge className="bg-green-600">Recruited</Badge>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-cyan-400">
                            ${npc.recruit_cost.toLocaleString()}
                          </div>
                          {selectedNPC === npc.npc_name && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                recruitMutation.mutate(npc);
                              }}
                              disabled={!canRecruit || recruitMutation.isPending}
                              className="bg-cyan-600 hover:bg-cyan-700 text-xs h-8"
                            >
                              {canRecruit ? 'Recruit' : <Lock className="w-3 h-3" />}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}