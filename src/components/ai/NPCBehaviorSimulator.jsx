import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Activity, Heart, AlertTriangle } from 'lucide-react';

const activities = [
  'Working',
  'Resting',
  'Eating',
  'Social Time',
  'Training',
  'Planning',
  'Commuting',
  'Off-duty'
];

export default function NPCBehaviorSimulator({ enterpriseNPCs = [] }) {
  const queryClient = useQueryClient();
  const [expandedNPC, setExpandedNPC] = useState(null);

  const { data: npcRoutines = [] } = useQuery({
    queryKey: ['npcRoutines', enterpriseNPCs.map(n => n.id).join(',')],
    queryFn: async () => {
      if (enterpriseNPCs.length === 0) return [];
      const routines = [];
      for (const npc of enterpriseNPCs) {
        const r = await base44.entities.NPCRoutine.filter({ npc_id: npc.id });
        if (r.length === 0) {
          await base44.entities.NPCRoutine.create({
            npc_id: npc.id,
            enterprise_id: npc.enterprise_id,
            daily_schedule: generateDailySchedule(),
            current_activity: 'Working',
            location: 'Office'
          });
          routines.push((await base44.entities.NPCRoutine.filter({ npc_id: npc.id }))[0]);
        } else {
          routines.push(r[0]);
        }
      }
      return routines;
    },
    enabled: enterpriseNPCs.length > 0,
    refetchInterval: 30000
  });

  const { data: npcInteractions = [] } = useQuery({
    queryKey: ['npcInteractions', enterpriseNPCs.map(n => n.id).join(',')],
    queryFn: async () => {
      if (enterpriseNPCs.length < 2) return [];
      return base44.entities.NPCInteraction.list();
    },
    enabled: enterpriseNPCs.length > 0
  });

  const simulateBehaviorMutation = useMutation({
    mutationFn: async (npc) => {
      const routine = npcRoutines.find(r => r.npc_id === npc.id);
      if (!routine) return;

      const hour = new Date().getHours();
      const scheduleItem = routine.daily_schedule.find(s => s.hour === hour) || 
                          routine.daily_schedule[Math.floor(Math.random() * routine.daily_schedule.length)];

      let newStress = routine.stress_level;
      let newEfficiency = routine.work_efficiency;

      if (scheduleItem.activity === 'Working') {
        newStress = Math.min(100, newStress + 5);
        newEfficiency = Math.max(50, newEfficiency - 3);
      } else if (scheduleItem.activity === 'Resting') {
        newStress = Math.max(0, newStress - 15);
        newEfficiency = Math.min(100, newEfficiency + 5);
      } else if (scheduleItem.activity === 'Social Time') {
        newStress = Math.max(0, newStress - 8);
      }

      const socialNeeds = Math.max(0, routine.social_needs - (Math.random() * 10));

      await base44.entities.NPCRoutine.update(routine.id, {
        current_activity: scheduleItem.activity,
        location: scheduleItem.location,
        stress_level: newStress,
        work_efficiency: newEfficiency,
        social_needs: socialNeeds,
        last_rest: scheduleItem.activity === 'Resting' ? new Date().toISOString() : routine.last_rest
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['npcRoutines']);
    }
  });

  const createRelationshipMutation = useMutation({
    mutationFn: async (npcs) => {
      const [npcA, npcB] = npcs;
      const existing = npcInteractions.find(
        i => (i.npc_a_id === npcA.id && i.npc_b_id === npcB.id) ||
             (i.npc_a_id === npcB.id && i.npc_b_id === npcA.id)
      );

      if (existing) {
        await base44.entities.NPCInteraction.update(existing.id, {
          interaction_count: existing.interaction_count + 1,
          relationship_score: Math.max(-100, Math.min(100, existing.relationship_score + (Math.random() * 10 - 5))),
          last_interaction: new Date().toISOString()
        });
      } else {
        await base44.entities.NPCInteraction.create({
          npc_a_id: npcA.id,
          npc_b_id: npcB.id,
          interaction_count: 1,
          last_interaction: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['npcInteractions']);
    }
  });

  const generateDailySchedule = () => {
    return [
      { hour: 6, activity: 'Commuting', location: 'Transit', priority: 1 },
      { hour: 9, activity: 'Working', location: 'Office', priority: 3 },
      { hour: 12, activity: 'Eating', location: 'Break Room', priority: 2 },
      { hour: 14, activity: 'Working', location: 'Office', priority: 3 },
      { hour: 17, activity: 'Social Time', location: 'Common Area', priority: 1 },
      { hour: 18, activity: 'Commuting', location: 'Transit', priority: 1 },
      { hour: 22, activity: 'Resting', location: 'Home', priority: 2 }
    ];
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Users className="w-4 h-4 text-cyan-400" />
            NPC Daily Routines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {npcRoutines.map((routine) => {
              const npc = enterpriseNPCs.find(n => n.id === routine.npc_id);
              if (!npc) return null;

              const isExpanded = expandedNPC === routine.id;
              const stressColor = routine.stress_level > 70 ? 'bg-red-600' : 
                                 routine.stress_level > 40 ? 'bg-yellow-600' : 'bg-green-600';
              const efficiencyColor = routine.work_efficiency > 80 ? 'bg-green-600' :
                                     routine.work_efficiency > 50 ? 'bg-yellow-600' : 'bg-red-600';

              return (
                <div
                  key={routine.id}
                  onClick={() => setExpandedNPC(isExpanded ? null : routine.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isExpanded ? 'border-cyan-500/50 bg-slate-900/50' : 'border-cyan-500/20 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-sm">{npc.npc_name}</h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Activity className="w-3 h-3" />
                        {routine.current_activity} @ {routine.location}
                      </p>
                    </div>
                    <Badge className="bg-cyan-600 text-xs">{npc.skill_level}/10</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Stress</p>
                      <div className={`h-1 ${stressColor} rounded mt-1`} style={{width: `${routine.stress_level}%`}} />
                      <p className="text-gray-300 mt-1 font-semibold">{Math.round(routine.stress_level)}%</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Efficiency</p>
                      <div className={`h-1 ${efficiencyColor} rounded mt-1`} style={{width: `${routine.work_efficiency}%`}} />
                      <p className="text-gray-300 mt-1 font-semibold">{Math.round(routine.work_efficiency)}%</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Social Need</p>
                      <div className="h-1 bg-purple-600 rounded mt-1" style={{width: `${routine.social_needs}%`}} />
                      <p className="text-gray-300 mt-1 font-semibold">{Math.round(routine.social_needs)}%</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-cyan-500/20 space-y-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Today's Schedule:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {routine.daily_schedule.slice(0, 4).map((item, idx) => (
                            <p key={idx} className="text-xs text-gray-300">
                              {item.hour}:00 - {item.activity}
                            </p>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => simulateBehaviorMutation.mutate(npc)}
                        className="w-full mt-2 px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs"
                      >
                        Simulate Hour
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* NPC Relationships */}
      {npcInteractions.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <Heart className="w-4 h-4 text-purple-400" />
              Social Dynamics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {npcInteractions.slice(0, 5).map((interaction) => {
                const npcA = enterpriseNPCs.find(n => n.id === interaction.npc_a_id);
                const npcB = enterpriseNPCs.find(n => n.id === interaction.npc_b_id);
                if (!npcA || !npcB) return null;

                const typeColor = 
                  interaction.relationship_type === 'ally' ? 'text-green-400' :
                  interaction.relationship_type === 'hostile' ? 'text-red-400' :
                  'text-yellow-400';

                return (
                  <div key={interaction.id} className="p-2 bg-slate-900/50 rounded border border-purple-500/20 text-xs">
                    <p className="text-white">
                      {npcA.npc_name} <span className={typeColor}>↔</span> {npcB.npc_name}
                    </p>
                    <p className="text-gray-400">
                      Interactions: {interaction.interaction_count} | Score: 
                      <span className={interaction.relationship_score > 0 ? 'text-green-400 ml-1' : 'text-red-400 ml-1'}>
                        {interaction.relationship_score > 0 ? '+' : ''}{interaction.relationship_score}
                      </span>
                    </p>
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