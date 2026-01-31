import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Briefcase, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const npcRoles = {
  workshop_manager: { name: 'Workshop Manager', icon: '🔧', baseWage: 6000 },
  security_chief: { name: 'Security Chief', icon: '🛡️', baseWage: 8000 },
  storage_master: { name: 'Storage Master', icon: '📦', baseWage: 4000 },
  lab_director: { name: 'Lab Director', icon: '🧪', baseWage: 7500 },
  quartermaster: { name: 'Quartermaster', icon: '📋', baseWage: 5000 },
  medic: { name: 'Medic', icon: '⚕️', baseWage: 5500 },
  gunsmith: { name: 'Gunsmith', icon: '🔫', baseWage: 7000 },
  hacker: { name: 'Hacker', icon: '💻', baseWage: 8500 }
};

export default function NPCFacilityManager({ selectedBase, playerData }) {
  const queryClient = useQueryClient();
  const [expandedNPC, setExpandedNPC] = useState(null);

  const { data: facilities = [] } = useQuery({
    queryKey: ['baseFacilities', selectedBase?.id],
    queryFn: () => base44.entities.BaseFacility.filter({ base_id: selectedBase.id }),
    enabled: !!selectedBase?.id
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['npcManagers', selectedBase?.id],
    queryFn: async () => {
      const allManagers = await base44.entities.NPCFacilityManager.list();
      return allManagers.filter(m => facilities.some(f => f.id === m.facility_id));
    },
    enabled: !!selectedBase?.id
  });

  const assignNPCMutation = useMutation({
    mutationFn: async (facility) => {
      const roles = Object.keys(npcRoles);
      const assignedRoles = managers.map(m => m.role);
      const availableRole = roles.find(r => !assignedRoles.includes(r));

      if (!availableRole) {
        throw new Error('All role types assigned');
      }

      const npcName = `${npcRoles[availableRole].name} #${Math.random().toString(36).substr(2, 5)}`;

      await base44.entities.NPCFacilityManager.create({
        facility_id: facility.id,
        npc_id: `npc_${Math.random().toString(36).substr(2, 9)}`,
        npc_name: npcName,
        role: availableRole,
        skill_level: Math.floor(Math.random() * 5) + 1,
        wage: npcRoles[availableRole].baseWage
      });

      await base44.entities.BaseFacility.update(facility.id, {
        assigned_npc_id: npcName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['npcManagers']);
      queryClient.invalidateQueries(['baseFacilities']);
      toast.success('NPC assigned!');
    },
    onError: (error) => toast.error(error.message)
  });

  const updateMoraleMutation = useMutation({
    mutationFn: async (manager) => {
      const newMorale = Math.min(100, manager.morale + 10);
      await base44.entities.NPCFacilityManager.update(manager.id, {
        morale: newMorale
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['npcManagers']);
      toast.success('Morale boosted!');
    }
  });

  const totalWages = managers.reduce((sum, m) => sum + (m.wage || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Users className="w-4 h-4 text-blue-400" />
            NPC Workforce
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-slate-800/50 rounded">
            <p className="text-gray-400">NPCs</p>
            <p className="text-blue-400 font-bold">{managers.length}/{facilities.length}</p>
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <p className="text-gray-400">Weekly Wages</p>
            <p className="text-yellow-400 font-bold">${totalWages.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <p className="text-gray-400">Avg Morale</p>
            <p className={`font-bold ${managers.length > 0 && managers.reduce((s, m) => s + m.morale, 0) / managers.length > 60 ? 'text-green-400' : 'text-orange-400'}`}>
              {managers.length > 0 ? Math.round(managers.reduce((s, m) => s + m.morale, 0) / managers.length) : 0}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Assign NPCs */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Available Facilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {facilities.map((facility) => {
              const manager = managers.find(m => m.facility_id === facility.id);
              return (
                <div key={facility.id} className="p-2 bg-slate-900/50 rounded flex items-center justify-between">
                  <div className="text-xs">
                    <p className="text-white font-semibold">{facility.facility_name}</p>
                    <p className="text-gray-400 text-[10px]">{facility.facility_type}</p>
                  </div>
                  {manager ? (
                    <Badge className="bg-blue-600">{manager.npc_name}</Badge>
                  ) : (
                    <button
                      onClick={() => assignNPCMutation.mutate(facility)}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                    >
                      Assign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* NPC Details */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Manager Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {managers.map((manager) => (
              <div key={manager.id} className="space-y-2">
                <div
                  onClick={() => setExpandedNPC(expandedNPC === manager.id ? null : manager.id)}
                  className="p-2 bg-slate-900/50 rounded cursor-pointer hover:bg-slate-900/70"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <p className="text-white font-semibold">{npcRoles[manager.role]?.icon} {manager.npc_name}</p>
                      <p className="text-gray-400">{npcRoles[manager.role]?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-semibold text-xs">Skill: {manager.skill_level}/10</p>
                      <p className="text-gray-400 text-[10px]">Morale: {manager.morale}%</p>
                    </div>
                  </div>
                </div>

                {expandedNPC === manager.id && (
                  <div className="ml-2 space-y-2 text-xs border-l border-purple-500/30 pl-2">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Morale</span>
                        <span>{manager.morale}%</span>
                      </div>
                      <Progress value={manager.morale} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Loyalty</span>
                        <span>{manager.loyalty}%</span>
                      </div>
                      <Progress value={manager.loyalty} className="h-1.5" />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateMoraleMutation.mutate(manager)}
                        className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-[10px]"
                      >
                        +Morale ($2k)
                      </button>
                      <div className="px-2 py-1 bg-slate-800/50 rounded text-[10px] text-gray-400">
                        ${manager.wage.toLocaleString()}/week
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}