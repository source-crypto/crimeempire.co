import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WorldStatePanel from '@/components/missions/WorldStatePanel';
import DirectorEventCard from '@/components/worldevents/DirectorEventCard';
import { computeWorldState, evaluateEvents } from '@/lib/worldEventDirector';
import { Loader2, Activity, Zap, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function WorldEventDirector() {
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

  const worldState = useMemo(() => computeWorldState({
    playerLevel: playerData?.level || 1, reputation, worldEvents, globalEvents, economicEvents, factionActivities, governance,
    wantedLevel: playerData?.wanted_level || reputation.law_enforcement_heat || 0,
  }), [playerData, reputation, worldEvents, globalEvents, economicEvents, factionActivities, governance]);

  const evaluateMutation = useMutation({
    mutationFn: async () => evaluateEvents(worldState),
    onSuccess: (s) => { setSlate(s); toast.success(`Director identified ${s.length} event opportunities`); },
    onError: (e) => toast.error(e.message),
  });

  const triggerMutation = useMutation({
    mutationFn: async (spec) => {
      const now = new Date();
      const hours = spec.severity === 'catastrophic' ? 4 : spec.severity === 'major' ? 3 : spec.severity === 'moderate' ? 2 : 1;
      const ends = new Date(now.getTime() + hours * 3600000);
      await base44.entities.WorldEvent.create({
        event_name: spec.title,
        event_type: spec.worldType,
        description: spec.narrative,
        narrative: spec.narrative,
        severity: spec.severity,
        market_impact: { price_modifier: spec.market.price, demand_change: spec.market.demand, supply_change: spec.market.supply },
        gameplay_effects: { wanted_level_increase: spec.effects.wanted, heat_modifier: spec.effects.heat, revenue_modifier: spec.effects.revenue, defense_modifier: spec.effects.defense },
        status: 'active',
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
        ai_generated: true,
      });
      await base44.entities.GlobalEvent.create({
        title: spec.title,
        description: spec.narrative,
        event_type: spec.globalType,
        icon: '📡',
        effect_type: spec.globalType,
        effect_value: spec.market.price,
        duration_hours: hours,
        is_active: true,
        expires_at: ends.toISOString(),
      });
      return spec.title;
    },
    onSuccess: (title) => {
      queryClient.invalidateQueries(['worldEventsActive']);
      queryClient.invalidateQueries(['globalEventsActive']);
      toast.success(`Triggered: ${title}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!playerData) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-red-400 bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="w-7 h-7 text-red-400" /> World Event Director
          </h1>
          <p className="text-gray-400 mt-1">Triggers disruptions, infrastructure failures, economic shifts & major investigations from live world conditions</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-red-600" onClick={() => evaluateMutation.mutate()} disabled={evaluateMutation.isPending}>
          {evaluateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning...</> : <><Zap className="w-4 h-4 mr-2" /> Evaluate World</>}
        </Button>
      </div>

      <WorldStatePanel worldState={worldState} />

      <Card className="glass-panel border-red-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Radio className="w-5 h-5 text-red-400 animate-pulse" />
          <div>
            <p className="text-sm text-white font-semibold">{worldEvents.length} active world events</p>
            <p className="text-xs text-gray-400">Triggered events persist and shape missions, markets & police response.</p>
          </div>
        </CardContent>
      </Card>

      {slate ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slate.map((spec, i) => (
            <DirectorEventCard key={i} spec={spec} onTrigger={() => triggerMutation.mutate(spec)} disabled={triggerMutation.isPending} />
          ))}
        </div>
      ) : (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-10 text-center">
            <Activity className="w-14 h-14 mx-auto mb-3 text-gray-500 opacity-40" />
            <h3 className="text-xl font-bold text-white mb-1">World Stable</h3>
            <p className="text-gray-400">The Director monitors live conditions for destabilizing opportunities. Evaluate the world to surface triggerable events.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}