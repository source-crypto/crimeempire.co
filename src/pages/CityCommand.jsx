import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CityIntelligenceMap from '@/components/citycommand/CityIntelligenceMap';
import CrimeHeatLegend from '@/components/citycommand/CrimeHeatLegend';
import ActiveEventsFeed from '@/components/citycommand/ActiveEventsFeed';
import CitySummaryCards from '@/components/citycommand/CitySummaryCards';
import WorldStatePanel from '@/components/missions/WorldStatePanel';
import { computeWorldState } from '@/lib/worldEventDirector';
import { Loader2, Map as MapIcon, Shield, Building2, AlertTriangle, Layers } from 'lucide-react';

const LAYER_DEFS = [
  { key: 'territories', label: 'Territories', icon: MapIcon },
  { key: 'police', label: 'Police', icon: Shield },
  { key: 'businesses', label: 'Businesses', icon: Building2 },
  { key: 'events', label: 'Events', icon: AlertTriangle },
];

export default function CityCommand() {
  const [activeLayers, setActiveLayers] = useState({ territories: true, police: true, businesses: true, events: true });

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
  const { data: territories = [] } = useQuery({ queryKey: ['territoriesAll'], queryFn: () => base44.entities.Territory.list() });
  const { data: lawEnforcement = [] } = useQuery({ queryKey: ['lawEnforcementAll'], queryFn: () => base44.entities.LawEnforcement.list() });
  const { data: properties = [] } = useQuery({ queryKey: ['propertiesAll'], queryFn: () => base44.entities.Property.list() });
  const { data: worldEvents = [] } = useQuery({ queryKey: ['worldEventsActive'], queryFn: () => base44.entities.WorldEvent.filter({ status: 'active' }, '-created_date', 30) });
  const { data: globalEvents = [] } = useQuery({ queryKey: ['globalEventsActive'], queryFn: () => base44.entities.GlobalEvent.filter({ is_active: true }) });
  const { data: economicEvents = [] } = useQuery({ queryKey: ['economicEventsActive'], queryFn: () => base44.entities.EconomicEvent.filter({ status: 'active' }) });
  const { data: factionActivities = [] } = useQuery({ queryKey: ['factionActivitiesExec'], queryFn: () => base44.entities.FactionActivity.filter({ status: 'executing' }) });
  const { data: governance = [] } = useQuery({ queryKey: ['governance'], queryFn: () => base44.entities.Governance.list() });

  const worldState = useMemo(() => computeWorldState({
    playerLevel: playerData?.level || 1, reputation, worldEvents, globalEvents, economicEvents, factionActivities, governance,
    wantedLevel: playerData?.wanted_level || reputation.law_enforcement_heat || 0,
  }), [playerData, reputation, worldEvents, globalEvents, economicEvents, factionActivities, governance]);

  if (!playerData) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
          <MapIcon className="w-7 h-7 text-cyan-400" /> City Command
        </h1>
        <p className="text-gray-400 mt-1">Living crime intelligence map — territory influence, police coverage, business status & active events over a tactical city view</p>
      </div>

      <WorldStatePanel worldState={worldState} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Card className="glass-panel border-purple-500/20">
            <CardContent className="p-3 relative">
              <CrimeHeatLegend />
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-gray-400 flex items-center gap-1 mr-1"><Layers className="w-3.5 h-3.5" /> Layers:</span>
                {LAYER_DEFS.map(l => {
                  const Icon = l.icon;
                  const on = activeLayers[l.key];
                  return (
                    <Button key={l.key} size="sm" variant={on ? 'default' : 'outline'}
                      className={on ? 'bg-purple-600 text-white' : 'text-gray-400 border-purple-500/30'}
                      onClick={() => setActiveLayers(s => ({ ...s, [l.key]: !s[l.key] }))}>
                      <Icon className="w-3.5 h-3.5 mr-1" /> {l.label}
                    </Button>
                  );
                })}
              </div>
              <CityIntelligenceMap
                territories={territories}
                lawEnforcement={lawEnforcement}
                worldEvents={worldEvents}
                activeLayers={activeLayers}
                playerCrewId={playerData.crew_id}
              />
            </CardContent>
          </Card>
          <CitySummaryCards lawEnforcement={lawEnforcement} territories={territories} properties={properties} playerCrewId={playerData.crew_id} worldState={worldState} />
        </div>

        <div className="space-y-4">
          <ActiveEventsFeed events={worldEvents} />
          <Card className="glass-panel border-cyan-500/20">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Command Notes</h3>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li>• <span className="text-cyan-300">Blue/green/orange/red dots</span> = territories by resource type; red = contested.</li>
                <li>• <span className="text-blue-300">Blue circles</span> = police patrol coverage; color by unit type.</li>
                <li>• <span className="text-red-300">Red rings</span> = active world events, located at affected territories.</li>
                <li>• <span className="text-orange-300">Crime heat blobs</span> = high-crime sectors (yellow to orange to red); hotspots = intensity above 70.</li>
                <li>• <span className="text-gray-300">Dashed circles</span> = district boundaries; <span className="text-green-300">green</span>/<span className="text-amber-300">amber</span>/<span className="text-purple-300">purple</span> dots = businesses by legitimacy.</li>
                <li>• Toggle <span className="text-cyan-300">Satellite</span> for aerial command view. Toggle layers to focus your read.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}