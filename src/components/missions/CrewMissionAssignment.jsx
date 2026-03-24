import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle, XCircle, Shield, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';

const SKILL_BONUSES = {
  combat:      { label: 'Combat',      color: 'text-red-400',    icon: '⚔️' },
  stealth:     { label: 'Stealth',     color: 'text-purple-400', icon: '🕵️' },
  driving:     { label: 'Driving',     color: 'text-cyan-400',   icon: '🚗' },
  hacking:     { label: 'Hacking',     color: 'text-green-400',  icon: '💻' },
  leadership:  { label: 'Leadership',  color: 'text-yellow-400', icon: '👑' },
  negotiation: { label: 'Negotiation', color: 'text-blue-400',   icon: '🤝' },
};

export default function CrewMissionAssignment({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedMission, setSelectedMission] = useState(null);

  const { data: crewMissions = [] } = useQuery({
    queryKey: ['missions', 'crew_active', playerData?.crew_id],
    queryFn: () => base44.entities.Mission.filter(
      { assigned_to_crew: playerData.crew_id, status: 'active', mission_type: 'crew_mission' },
      '-created_date',
      20
    ),
    enabled: !!playerData?.crew_id,
    refetchInterval: 20000
  });

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', playerData?.crew_id],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
    refetchInterval: 30000
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['crewPlayers', playerData?.crew_id],
    queryFn: () => base44.entities.Player.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ mission, player }) => {
      const currentParticipants = mission.participants || [];
      const alreadyAssigned = currentParticipants.some(p => p.player_id === player.id);
      if (alreadyAssigned) throw new Error(`${player.username} is already on this mission`);

      await base44.entities.Mission.update(mission.id, {
        participants: [
          ...currentParticipants,
          { player_id: player.id, username: player.username, role: player.crew_role || 'soldier', contribution_score: 0 }
        ]
      });
    },
    onSuccess: (_, { player, mission }) => {
      queryClient.invalidateQueries(['missions']);
      toast.success(`${player.username} assigned to ${mission.title}`);
    },
    onError: (err) => toast.error(err.message)
  });

  const removeMutation = useMutation({
    mutationFn: async ({ mission, playerId }) => {
      await base44.entities.Mission.update(mission.id, {
        participants: (mission.participants || []).filter(p => p.player_id !== playerId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success('Member removed from mission');
    },
    onError: (err) => toast.error(err.message)
  });

  function getTopSkills(player) {
    const skills = player.skills || {};
    return Object.entries(skills)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }

  function isAssigned(mission, playerId) {
    return (mission.participants || []).some(p => p.player_id === playerId);
  }

  if (!playerData?.crew_id) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>You need to be in a crew to manage crew mission assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mission List */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            Active Crew Missions ({crewMissions.length})
          </h3>
          {crewMissions.length === 0 ? (
            <div className="p-6 rounded-xl border border-gray-700/30 bg-gray-900/20 text-center text-gray-400">
              No active crew missions. Accept crew missions from the Mission Board.
            </div>
          ) : (
            crewMissions.map((mission) => {
              const slots = mission.requirements?.crew_required ? 4 : 2;
              const assigned = (mission.participants || []).length;
              const isFull = assigned >= slots;
              return (
                <div
                  key={mission.id}
                  onClick={() => setSelectedMission(selectedMission?.id === mission.id ? null : mission)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedMission?.id === mission.id
                      ? 'border-orange-500/60 bg-orange-900/20'
                      : 'border-orange-500/20 bg-slate-900/40 hover:border-orange-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-semibold text-sm">{mission.title}</h4>
                    <Badge className={isFull ? 'bg-green-700' : 'bg-orange-700'}>
                      {assigned}/{slots} assigned
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{mission.description}</p>
                  <Progress value={(assigned / slots) * 100} className="h-1.5" />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {(mission.participants || []).map((p) => (
                      <Badge key={p.player_id} className="bg-slate-700 text-xs">
                        {p.username}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Crew Members Panel */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Crew Members ({allPlayers.length})
            {selectedMission && (
              <Badge className="ml-auto bg-orange-700 text-xs">Assigning to: {selectedMission.title}</Badge>
            )}
          </h3>
          {allPlayers.length === 0 ? (
            <div className="p-6 rounded-xl border border-gray-700/30 bg-gray-900/20 text-center text-gray-400">
              No crew members found.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {allPlayers.map((player) => {
                const topSkills = getTopSkills(player);
                const onMission = selectedMission ? isAssigned(selectedMission, player.id) : false;
                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl border transition-all ${
                      onMission
                        ? 'border-green-500/40 bg-green-900/10'
                        : 'border-purple-500/20 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold text-sm">{player.username}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          {player.crew_role || 'member'} · Lv {player.level || 1}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {onMission && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {selectedMission && (
                          onMission ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-400 hover:bg-red-900/20 text-xs h-7"
                              onClick={() => removeMutation.mutate({ mission: selectedMission, playerId: player.id })}
                              disabled={removeMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-orange-700 hover:bg-orange-600 text-xs h-7"
                              onClick={() => assignMutation.mutate({ mission: selectedMission, player })}
                              disabled={assignMutation.isPending}
                            >
                              Assign
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                    {topSkills.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {topSkills.map(([skill, val]) => {
                          const cfg = SKILL_BONUSES[skill];
                          if (!cfg) return null;
                          return (
                            <span key={skill} className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                              {cfg.icon} {cfg.label}: {val}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                      <span><Shield className="w-3 h-3 inline mr-1 text-gray-600" />Str: {player.strength_score || 0}</span>
                      <span><Zap className="w-3 h-3 inline mr-1 text-gray-600" />XP: {(player.experience || 0).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!selectedMission && crewMissions.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          Click a mission on the left to assign or remove crew members.
        </p>
      )}
    </div>
  );
}