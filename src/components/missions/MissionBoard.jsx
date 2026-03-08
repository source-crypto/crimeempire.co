import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target, Clock, Award, Users, CheckCircle, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import AILimitBanner, { isAILimitError } from '../shared/AILimitBanner';

const FALLBACK_MISSIONS = [
  { title: 'Street Level Collection', description: 'Collect protection payments across three blocks.', narrative: 'The neighborhood owes, and you are here to collect.', mission_type: 'side_quest', difficulty: 'easy', objectives: [{ description: 'Visit Block A', completed: false, progress: 0 }, { description: 'Visit Block B', completed: false, progress: 0 }, { description: 'Return funds', completed: false, progress: 0 }], rewards: { crypto: 3000, experience: 150, reputation: 5 }, requirements: { min_level: 1, crew_required: false } },
  { title: 'Warehouse Takeover', description: 'Seize a rival gang's storage facility.', narrative: 'Intel confirms the warehouse is lightly guarded at midnight.', mission_type: 'crew_mission', difficulty: 'medium', objectives: [{ description: 'Neutralize perimeter guards', completed: false, progress: 0 }, { description: 'Breach the loading dock', completed: false, progress: 0 }, { description: 'Secure all inventory', completed: false, progress: 0 }, { description: 'Hold position for 10 minutes', completed: false, progress: 0 }], rewards: { crypto: 8000, experience: 400, reputation: 20 }, requirements: { min_level: 3, crew_required: true } },
  { title: 'Black Market Drop', description: 'Deliver a package to an anonymous buyer.', narrative: 'No questions asked. No names exchanged. Just the goods.', mission_type: 'side_quest', difficulty: 'easy', objectives: [{ description: 'Pick up the package', completed: false, progress: 0 }, { description: 'Avoid surveillance cameras', completed: false, progress: 0 }, { description: 'Complete the handoff', completed: false, progress: 0 }], rewards: { crypto: 4500, experience: 200, reputation: 8 }, requirements: { min_level: 1, crew_required: false } },
  { title: 'Corporate Espionage', description: 'Steal financial records from a rival corporation.', narrative: 'Someone powerful wants the data. They are paying very well.', mission_type: 'faction_conflict', difficulty: 'hard', objectives: [{ description: 'Infiltrate the server room', completed: false, progress: 0 }, { description: 'Extract encrypted files', completed: false, progress: 0 }, { description: 'Destroy evidence', completed: false, progress: 0 }, { description: 'Exfiltrate safely', completed: false, progress: 0 }], rewards: { crypto: 15000, experience: 700, reputation: 35 }, requirements: { min_level: 5, crew_required: false } },
];

const missionTypeColors = {
  story: 'from-purple-600 to-pink-600',
  side_quest: 'from-blue-600 to-cyan-600',
  crew_mission: 'from-orange-600 to-red-600',
  faction_conflict: 'from-red-600 to-orange-600',
  heist_preparation: 'from-green-600 to-emerald-600',
  all_to_die_for: 'from-red-700 to-purple-700'
};

const difficultyColors = {
  easy: 'bg-green-600',
  medium: 'bg-yellow-600',
  hard: 'bg-orange-600',
  extreme: 'bg-red-600'
};

export default function MissionBoard({ playerData }) {
  const [selectedMission, setSelectedMission] = useState(null);
  const queryClient = useQueryClient();

  const allToDieForMission = {
    id: 'all_to_die_for_permanent',
    title: 'All to Die For',
    description: 'The ultimate high-stakes mission: infiltrate the most heavily guarded federal facility',
    narrative: 'Intelligence suggests the government is holding critical evidence. This is the mission legends are made of—but few survive it.',
    mission_type: 'all_to_die_for',
    difficulty: 'extreme',
    status: 'available',
    objectives: [
      { description: 'Gather intel on facility', completed: false, progress: 0 },
      { description: 'Assemble elite team', completed: false, progress: 0 },
      { description: 'Breach security systems', completed: false, progress: 0 },
      { description: 'Retrieve evidence', completed: false, progress: 0 },
      { description: 'Escape with crew intact', completed: false, progress: 0 }
    ],
    rewards: { crypto: 20000, experience: 5000, reputation: 100 },
    requirements: { min_level: 20, crew_required: true },
    crew_required: true,
    generated_by_ai: false
  };

  const { data: availableMissions = [] } = useQuery({
    queryKey: ['missions', 'available', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({ status: 'available' }),
    enabled: !!playerData,
    refetchInterval: 30000
  });

  const { data: activeMissions = [] } = useQuery({
    queryKey: ['missions', 'active', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({
      assigned_to_player: playerData.id,
      status: 'active'
    }),
    enabled: !!playerData
  });

  const [aiLimitHit, setAiLimitHit] = useState(false);

  const generateMissionMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      let missionData;
      try {
        const prompt = `Generate a unique mission for a crime game player at level ${playerData.level}, playstyle: ${playerData.playstyle}. Return JSON with: title, description, narrative, mission_type (story/side_quest/crew_mission/faction_conflict), difficulty (easy/medium/hard/extreme), objectives array, rewards object (crypto, experience, reputation), requirements object (min_level, crew_required).`;
        missionData = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' }, description: { type: 'string' }, narrative: { type: 'string' },
              mission_type: { type: 'string' }, difficulty: { type: 'string' },
              objectives: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, completed: { type: 'boolean' }, progress: { type: 'number' } } } },
              rewards: { type: 'object', properties: { crypto: { type: 'number' }, experience: { type: 'number' }, reputation: { type: 'number' } } },
              requirements: { type: 'object', properties: { min_level: { type: 'number' }, crew_required: { type: 'boolean' } } }
            }
          }
        });
      } catch (err) {
        if (isAILimitError(err)) {
          setAiLimitHit(true);
          // Use a random fallback mission scaled to player level
          const pool = FALLBACK_MISSIONS.filter(m => (m.requirements.min_level || 1) <= (playerData.level || 1));
          missionData = pool[Math.floor(Math.random() * pool.length)] || FALLBACK_MISSIONS[0];
          // Scale rewards with player level
          const scale = 1 + (playerData.level - 1) * 0.15;
          missionData = { ...missionData, rewards: { ...missionData.rewards, crypto: Math.floor(missionData.rewards.crypto * scale), experience: Math.floor(missionData.rewards.experience * scale) } };
        } else {
          throw err;
        }
      }

      const mission = await base44.entities.Mission.create({
        ...missionData,
        status: 'available',
        expires_at: expiresAt.toISOString(),
        generated_by_ai: true,
        context_data: { player_level: playerData.level, playstyle: playerData.playstyle }
      });

      return mission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success('New mission added!');
    },
    onError: (err) => toast.error(err.message || 'Failed to generate mission')
  });

  const acceptMissionMutation = useMutation({
    mutationFn: async (mission) => {
      await base44.entities.Mission.update(mission.id, {
        assigned_to_player: playerData.id,
        assigned_to_crew: playerData.crew_id,
        status: 'active'
      });

      if (playerData.crew_id) {
        await base44.entities.CrewActivity.create({
          crew_id: playerData.crew_id,
          activity_type: 'heist_completed',
          title: 'Mission Accepted',
          description: `${playerData.username} accepted: ${mission.title}`,
          player_id: playerData.id,
          player_username: playerData.username
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success('Mission accepted!');
      setSelectedMission(null);
    }
  });

  const completeMissionMutation = useMutation({
    mutationFn: async (mission) => {
      await base44.entities.Mission.update(mission.id, {
        status: 'completed'
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + (mission.rewards?.crypto || 0),
        experience: playerData.experience + (mission.rewards?.experience || 0),
        total_earnings: playerData.total_earnings + (mission.rewards?.crypto || 0)
      });

      if (playerData.crew_id && mission.rewards?.reputation) {
        const crews = await base44.entities.Crew.filter({ id: playerData.crew_id });
        if (crews[0]) {
          await base44.entities.Crew.update(crews[0].id, {
            reputation: crews[0].reputation + mission.rewards.reputation
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      queryClient.invalidateQueries(['player']);
      toast.success('Mission completed!');
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-purple-400" />
              Mission Board
            </CardTitle>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => generateMissionMutation.mutate()}
              disabled={generateMissionMutation.isPending}
            >
              {generateMissionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Mission
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="available" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="all_to_die_for">
            All to Die For
          </TabsTrigger>
          <TabsTrigger value="available">
            Available ({availableMissions.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeMissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all_to_die_for">
          <Card className="glass-panel border-red-500/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-red-400 mb-2">{allToDieForMission.title}</h3>
                  <p className="text-white mb-2">{allToDieForMission.description}</p>
                  <p className="text-gray-400 italic">{allToDieForMission.narrative}</p>
                </div>
                <Badge className="bg-red-700 text-lg px-4 py-2">
                  {allToDieForMission.difficulty.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="text-white font-semibold">Objectives:</h4>
                {allToDieForMission.objectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-300">
                    <div className="w-6 h-6 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center text-xs text-red-400">
                      {idx + 1}
                    </div>
                    <span>{obj.description}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-slate-900/50 rounded-lg border border-green-500/30">
                  <p className="text-xs text-gray-400">Crypto Reward</p>
                  <p className="text-2xl font-bold text-green-400">${allToDieForMission.rewards.crypto.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/30">
                  <p className="text-xs text-gray-400">Experience</p>
                  <p className="text-2xl font-bold text-purple-400">{allToDieForMission.rewards.experience.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-blue-500/30">
                  <p className="text-xs text-gray-400">Reputation</p>
                  <p className="text-2xl font-bold text-blue-400">+{allToDieForMission.rewards.reputation}</p>
                </div>
              </div>

              {playerData && playerData.level < allToDieForMission.requirements.min_level && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded mb-4 text-yellow-300 text-sm">
                  ⚠️ Requires Level {allToDieForMission.requirements.min_level} (You: Level {playerData.level})
                </div>
              )}

              {playerData && !playerData.crew_id && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded mb-4 text-red-300 text-sm">
                  ⚠️ Crew Required
                </div>
              )}

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-red-700 to-purple-700 hover:from-red-800 hover:to-purple-800 text-white font-bold"
                onClick={() => {
                  const canAccept = playerData && 
                    playerData.level >= allToDieForMission.requirements.min_level && 
                    playerData.crew_id;
                  if (canAccept) {
                    acceptMissionMutation.mutate(allToDieForMission);
                  }
                }}
                disabled={
                  !playerData || 
                  playerData.level < allToDieForMission.requirements.min_level || 
                  !playerData.crew_id ||
                  acceptMissionMutation.isPending
                }
              >
                {playerData && playerData.level < allToDieForMission.requirements.min_level
                  ? 'Requirements Not Met'
                  : !playerData.crew_id
                  ? 'Crew Required'
                  : 'Accept Mission'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableMissions.map((mission) => {
              const canAccept = mission.requirements?.min_level <= playerData.level &&
                (!mission.requirements?.crew_required || playerData.crew_id);

              return (
                <Card key={mission.id} className="glass-panel border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-1">{mission.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {mission.description}
                        </p>
                      </div>
                      <Badge className={difficultyColors[mission.difficulty]}>
                        {mission.difficulty}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4 text-green-400" />
                        <span className="text-white">
                          ${(mission.rewards?.crypto || 0).toLocaleString()}
                        </span>
                        <span className="text-purple-400 ml-2">
                          {mission.rewards?.experience || 0} XP
                        </span>
                      </div>
                      {mission.expires_at && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          Expires in 48h
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className={`w-full bg-gradient-to-r ${
                        missionTypeColors[mission.mission_type]
                      }`}
                      onClick={() => acceptMissionMutation.mutate(mission)}
                      disabled={!canAccept || acceptMissionMutation.isPending}
                    >
                      {canAccept ? 'Accept Mission' : 'Requirements Not Met'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="space-y-4">
            {activeMissions.map((mission) => (
              <Card key={mission.id} className="glass-panel border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white mb-1">{mission.title}</h3>
                      <p className="text-sm text-gray-400">{mission.narrative}</p>
                    </div>
                    <Badge className={difficultyColors[mission.difficulty]}>
                      {mission.difficulty}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-semibold text-white">Objectives:</h4>
                    {mission.objectives?.map((obj, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle
                          className={`w-4 h-4 ${
                            obj.completed ? 'text-green-400' : 'text-gray-600'
                          }`}
                        />
                        <span className={obj.completed ? 'text-gray-400 line-through' : 'text-white'}>
                          {obj.description}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                    onClick={() => completeMissionMutation.mutate(mission)}
                    disabled={completeMissionMutation.isPending}
                  >
                    Complete Mission
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}