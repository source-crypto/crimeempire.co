import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WorldStatePanel from '@/components/missions/WorldStatePanel';
import DirectorMissionCard from '@/components/missions/DirectorMissionCard';
import { computeWorldState, generateSlate } from '@/lib/missionDirector';
import { Loader2, Brain, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function MissionDirector() {
  const queryClient = useQueryClient();
  const [slate, setSlate] = useState(null);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0] || null; },
    enabled: !!user?.email,
  });

  const { data: reputation = {} } = useQuery({
    queryKey: ['playerReputation', playerData?.id],
    queryFn: async () => { const r = await base44.entities.PlayerReputation.filter({ player_id: playerData.id }); return r[0] || {}; },
    enabled: !!playerData?.id,
  });
  const { data: worldEvents = [] } = useQuery({ queryKey: ['worldEventsActive'], queryFn: () => base44.entities.WorldEvent.filter({ status: 'active' }, '-created_date', 20) });
  const { data: globalEvents = [] } = useQuery({ queryKey: ['globalEventsActive'], queryFn: () => base44.entities.GlobalEvent.filter({ is_active: true }) });
  const { data: economicEvents = [] } = useQuery({ queryKey: ['economicEventsActive'], queryFn: () => base44.entities.EconomicEvent.filter({ status: 'active' }) });
  const { data: factionActivities = [] } = useQuery({ queryKey: ['factionActivitiesExec'], queryFn: () => base44.entities.FactionActivity.filter({ status: 'executing' }) });
  const { data: governance = [] } = useQuery({ queryKey: ['governance'], queryFn: () => base44.entities.Governance.list() });
  const { data: completedMissions = [] } = useQuery({
    queryKey: ['completedMissionsDir', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({ assigned_to_player: playerData.id, status: 'completed' }),
    enabled: !!playerData?.id,
  });
  const { data: activeDirector } = useQuery({
    queryKey: ['aiMissionDirector', playerData?.id],
    queryFn: async () => { const d = await base44.entities.AIMissionDirector.filter({ player_id: playerData.id }); return d[0] || null; },
    enabled: !!playerData?.id,
  });

  const worldState = useMemo(() => computeWorldState({
    playerLevel: playerData?.level || 1,
    reputation, worldEvents, globalEvents, economicEvents, factionActivities, governance,
    wantedLevel: playerData?.wanted_level || reputation.law_enforcement_heat || 0,
  }), [playerData, reputation, worldEvents, globalEvents, economicEvents, factionActivities, governance]);

  const generateMutation = useMutation({
    mutationFn: async () => generateSlate(worldState, playerData?.level || 1),
    onSuccess: (s) => { setSlate(s); toast.success(`Director generated ${s.length} missions from live world state`); },
    onError: (e) => toast.error(e.message),
  });

  const acceptMutation = useMutation({
    mutationFn: async (spec) => {
      const expires = new Date(); expires.setHours(expires.getHours() + 48);
      const mission = await base44.entities.Mission.create({
        title: spec.title, description: spec.narrative, narrative: spec.narrative,
        mission_type: spec.mission_type, difficulty: spec.difficulty,
        objectives: spec.objectives, rewards: spec.rewards, requirements: spec.requirements,
        assigned_to_player: playerData.id, assigned_to_crew: playerData.crew_id,
        status: 'active', generated_by_ai: true,
        context_data: { world_state: spec.worldState, archetype: spec.archetype_id, diff_score: spec.diffScore },
        expires_at: expires.toISOString(),
      });
      await base44.entities.MissionModifier.create({
        mission_id: mission.id, player_id: playerData.id,
        original_difficulty: 'medium', adjusted_difficulty: spec.difficulty,
        original_reward: 4000, adjusted_reward: spec.rewards.crypto,
        difficulty_factors: spec.factorList,
        enforcement_escalation: spec.worldState.policePresence > 70,
        applied_at: new Date().toISOString(),
      });
      const active = activeDirector?.active_missions || [];
      const suggestions = (activeDirector?.mission_suggestions || []).slice(0, 5);
      suggestions.unshift({ mission_type: spec.mission_type, difficulty: spec.difficulty, reward: spec.rewards.crypto, urgency: spec.diffScore });
      const payload = {
        player_id: playerData.id,
        active_missions: [...active, mission.id],
        current_market_conditions: {
          demand_spike: spec.worldState.economicCondition,
          pricing_shift: spec.worldState.boomEvents - spec.worldState.crashEvents,
          enforcement_activity: spec.worldState.policePresence,
        },
        reputation_factor: spec.worldState.repTier,
        mission_suggestions: suggestions.slice(0, 6),
        performance_rating: activeDirector?.performance_rating ?? 50,
        missions_completed: activeDirector?.missions_completed ?? completedMissions.length,
        missions_failed: activeDirector?.missions_failed ?? 0,
        average_success_rate: activeDirector?.average_success_rate ?? 50,
        difficulty_modifier: Math.max(0.5, Math.min(2, spec.diffScore / 50)),
        next_difficulty_adjustment: new Date(Date.now() + 3600000).toISOString(),
      };
      if (activeDirector?.id) await base44.entities.AIMissionDirector.update(activeDirector.id, payload);
      else await base44.entities.AIMissionDirector.create(payload);
      return spec.title;
    },
    onSuccess: (title) => {
      queryClient.invalidateQueries(['aiMissionDirector']);
      queryClient.invalidateQueries(['missions']);
      toast.success(`Accepted: ${title}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!playerData) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Brain className="w-7 h-7 text-cyan-400" /> AI Mission Director
          </h1>
          <p className="text-gray-400 mt-1">Missions generated dynamically from live world state — time, weather, police, economy, territory & faction activity</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-600 to-blue-600" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Directing...</> : <><Zap className="w-4 h-4 mr-2" /> Generate Mission Slate</>}
        </Button>
      </div>

      <WorldStatePanel worldState={worldState} />

      {slate ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slate.map((spec, i) => (
            <DirectorMissionCard key={i} spec={spec} onAccept={() => acceptMutation.mutate(spec)} disabled={acceptMutation.isPending} />
          ))}
        </div>
      ) : (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-10 text-center">
            <Target className="w-14 h-14 mx-auto mb-3 text-gray-500 opacity-40" />
            <h3 className="text-xl font-bold text-white mb-1">No Active Slate</h3>
            <p className="text-gray-400">The Director reads live world conditions to shape missions. Generate a slate to see what the city offers right now.</p>
          </CardContent>
        </Card>
      )}

      {activeDirector && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-white text-base">Director State</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Active Missions</p><p className="text-cyan-400 font-bold">{activeDirector.active_missions?.length || 0}</p></div>
            <div><p className="text-xs text-gray-400">Difficulty Mod</p><p className="text-purple-400 font-bold">{(activeDirector.difficulty_modifier ?? 1).toFixed(2)}x</p></div>
            <div><p className="text-xs text-gray-400">Success Rate</p><p className="text-green-400 font-bold">{activeDirector.average_success_rate ?? 50}%</p></div>
            <div><p className="text-xs text-gray-400">Rep Factor</p><p className="text-yellow-400 font-bold">{activeDirector.reputation_factor ?? 1}x</p></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}