import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserX, DollarSign, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const infiltrationMethods = {
  bribery: { label: 'Bribery', icon: '💰', cost: 50000, baseSucChance: 40 },
  blackmail: { label: 'Blackmail', icon: '📸', cost: 30000, baseSucChance: 35 },
  undercover_agent: { label: 'Undercover Agent', icon: '🕵️', cost: 75000, baseSucChance: 50 },
  surveillance: { label: 'Surveillance', icon: '👁️', cost: 20000, baseSucChance: 60 }
};

export default function NPCInfiltrationSystem({ selectedBase, playerData }) {
  const queryClient = useQueryClient();
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  const { data: managers = [] } = useQuery({
    queryKey: ['npcManagers', selectedBase?.id],
    queryFn: async () => {
      const facilities = await base44.entities.BaseFacility.filter({ base_id: selectedBase.id });
      const allManagers = await base44.entities.NPCFacilityManager.list();
      return allManagers.filter(m => facilities.some(f => f.id === m.facility_id));
    },
    enabled: !!selectedBase?.id
  });

  const { data: infiltrations = [] } = useQuery({
    queryKey: ['npcInfiltrations', playerData?.id],
    queryFn: () => base44.entities.NPCInfiltration.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const attemptInfiltrationMutation = useMutation({
    mutationFn: async ({ manager, method }) => {
      const methodInfo = infiltrationMethods[method];
      
      // Calculate success chance based on NPC loyalty, morale, and method
      const loyaltyFactor = (100 - manager.loyalty) / 100;
      const moraleFactor = (100 - manager.morale) / 100;
      const successChance = Math.min(95, methodInfo.baseSucChance + (loyaltyFactor * 30) + (moraleFactor * 20));

      const success = Math.random() * 100 < successChance;

      const infiltration = await base44.entities.NPCInfiltration.create({
        npc_manager_id: manager.id,
        player_id: playerData.id,
        infiltration_type: method,
        status: success ? 'successful' : 'failed',
        success_chance: successChance,
        bribe_amount: method === 'bribery' ? methodInfo.cost : undefined,
        information_leaked: success ? [
          { info_type: 'facility_operations', severity: Math.random() * 100, leaked_at: new Date().toISOString() },
          { info_type: 'base_vulnerabilities', severity: Math.random() * 80, leaked_at: new Date().toISOString() }
        ] : [],
        npc_loyalty_before: manager.loyalty,
        npc_loyalty_after: success ? Math.max(0, manager.loyalty - 30) : manager.loyalty,
        discovered_by_player: false,
        started_at: new Date().toISOString(),
        resolved_at: new Date().toISOString()
      });

      // If successful, reduce NPC loyalty
      if (success) {
        await base44.entities.NPCFacilityManager.update(manager.id, {
          loyalty: Math.max(0, manager.loyalty - 30),
          morale: Math.max(0, manager.morale - 15)
        });

        // Increase base vulnerability based on leaked info
        const base = await base44.entities.PlayerBase.filter({ id: selectedBase.id });
        if (base[0]) {
          await base44.entities.PlayerBase.update(selectedBase.id, {
            vulnerability_rating: Math.min(100, (base[0].vulnerability_rating || 50) + 20)
          });
        }
      }

      return { success, infiltration };
    },
    onSuccess: ({ success }) => {
      queryClient.invalidateQueries(['npcInfiltrations']);
      queryClient.invalidateQueries(['npcManagers']);
      queryClient.invalidateQueries(['playerBases']);
      
      if (success) {
        toast.error('LE successfully infiltrated an NPC!');
      } else {
        toast.success('Infiltration attempt failed!');
      }
    }
  });

  const activeInfiltrations = infiltrations.filter(i => i.status === 'successful' && !i.discovered_by_player);

  return (
    <div className="space-y-4">
      {/* System Overview */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <UserX className="w-4 h-4 text-purple-400" />
            NPC Infiltration & Bribery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-400">
            LE attempts to compromise your NPCs through bribes, blackmail, or undercover ops
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Active Infiltrations</p>
              <p className="text-red-400 font-bold">{activeInfiltrations.length}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Compromised NPCs</p>
              <p className="text-orange-400 font-bold">
                {managers.filter(m => m.loyalty < 30).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulate Infiltration */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Simulate LE Infiltration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {managers.map(manager => (
              <div key={manager.id} className="p-2 bg-slate-900/50 rounded border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs">
                    <p className="text-white font-semibold">{manager.npc_name}</p>
                    <p className="text-gray-400 text-[10px]">{manager.role}</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge className={manager.loyalty < 30 ? 'bg-red-600' : manager.loyalty < 60 ? 'bg-orange-600' : 'bg-green-600'}>
                      Loyalty: {manager.loyalty}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(infiltrationMethods).slice(0, 2).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => attemptInfiltrationMutation.mutate({ manager, method: type })}
                      disabled={attemptInfiltrationMutation.isPending}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-semibold disabled:opacity-50"
                    >
                      {info.icon} {info.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Infiltrations */}
      <Card className="glass-panel border-yellow-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Compromised NPCs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeInfiltrations.length === 0 ? (
              <p className="text-gray-400 text-xs">No active infiltrations detected</p>
            ) : (
              activeInfiltrations.map(inf => {
                const manager = managers.find(m => m.id === inf.npc_manager_id);
                
                return (
                  <div
                    key={inf.id}
                    onClick={() => setExpandedAttempt(expandedAttempt === inf.id ? null : inf.id)}
                    className="p-2 bg-red-900/30 rounded border border-red-500/40 cursor-pointer hover:bg-red-900/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold text-xs">
                        {manager?.npc_name || 'Unknown NPC'}
                      </span>
                      <Badge className="bg-red-600 text-[10px] capitalize">
                        {inf.infiltration_type}
                      </Badge>
                    </div>

                    {expandedAttempt === inf.id && (
                      <div className="mt-2 space-y-1 text-[10px]">
                        <div className="grid grid-cols-2 gap-1">
                          <div className="p-1 bg-slate-800/50 rounded">
                            <p className="text-gray-400">Success Chance</p>
                            <p className="text-green-400 font-semibold">{Math.round(inf.success_chance)}%</p>
                          </div>
                          <div className="p-1 bg-slate-800/50 rounded">
                            <p className="text-gray-400">Loyalty Lost</p>
                            <p className="text-red-400 font-semibold">-{inf.npc_loyalty_before - inf.npc_loyalty_after}%</p>
                          </div>
                        </div>

                        {/* Leaked Information */}
                        {inf.information_leaked?.length > 0 && (
                          <div className="p-1.5 bg-red-900/50 rounded">
                            <p className="text-red-400 font-semibold mb-1">Information Leaked:</p>
                            {inf.information_leaked.map((leak, idx) => (
                              <div key={idx} className="text-gray-300 capitalize">
                                • {leak.info_type.replace(/_/g, ' ')} (Severity: {Math.round(leak.severity)})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}