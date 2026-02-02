import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Activity, TrendingUp, Skull } from 'lucide-react';
import { toast } from 'sonner';

const eventTypeInfo = {
  heist: { label: 'Heist', icon: '💰', baseVuln: 25, baseHeat: 30, color: 'bg-red-600' },
  turf_war: { label: 'Turf War', icon: '⚔️', baseVuln: 30, baseHeat: 40, color: 'bg-orange-600' },
  mass_production: { label: 'Mass Production', icon: '🏭', baseVuln: 15, baseHeat: 20, color: 'bg-yellow-600' },
  large_transaction: { label: 'Large Deal', icon: '💼', baseVuln: 10, baseHeat: 15, color: 'bg-blue-600' },
  npc_violence: { label: 'NPC Violence', icon: '🔫', baseVuln: 35, baseHeat: 45, color: 'bg-red-700' },
  territory_takeover: { label: 'Territory Takeover', icon: '🏴', baseVuln: 40, baseHeat: 50, color: 'bg-purple-600' }
};

export default function EventDrivenLEResponse({ playerData, bases = [] }) {
  const queryClient = useQueryClient();
  const [selectedBase, setSelectedBase] = useState(bases[0]);

  const { data: events = [] } = useQuery({
    queryKey: ['criminalEvents', playerData?.id],
    queryFn: () => base44.entities.CriminalEvent.filter({ player_id: playerData.id }, '-created_date', 20),
    enabled: !!playerData?.id
  });

  const { data: raids = [] } = useQuery({
    queryKey: ['baseLERaids', playerData?.id],
    queryFn: () => base44.entities.BaseLERaid.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const triggerEventMutation = useMutation({
    mutationFn: async ({ eventType, base }) => {
      const eventInfo = eventTypeInfo[eventType];
      
      // Create criminal event
      const event = await base44.entities.CriminalEvent.create({
        player_id: playerData.id,
        event_type: eventType,
        severity: Math.random() * 50 + 50,
        location: base.location?.territory_id || 'unknown',
        related_base_id: base.id,
        vulnerability_increase: eventInfo.baseVuln + Math.random() * 20,
        heat_generated: eventInfo.baseHeat + Math.random() * 20,
        witnesses: Math.floor(Math.random() * 10),
        evidence_collected: Math.random() > 0.6
      });

      // Update base vulnerability
      const newVuln = Math.min(100, (base.vulnerability_rating || 50) + event.vulnerability_increase);
      await base44.entities.PlayerBase.update(base.id, {
        vulnerability_rating: newVuln
      });

      // Update player heat
      await base44.entities.Player.update(playerData.id, {
        heat: Math.min(100, (playerData.heat || 0) + event.heat_generated)
      });

      // If high severity, trigger LE raid planning
      if (event.severity > 70 && newVuln > 60) {
        const assetValue = base.current_storage * 10000;
        const difficultyMultiplier = 1 + (assetValue / 1000000) + (newVuln / 100);

        await base44.entities.BaseLERaid.create({
          base_id: base.id,
          player_id: playerData.id,
          trigger_heat: playerData.heat || 0,
          trigger_events: [event.id],
          detected_asset_value: assetValue,
          difficulty_multiplier: difficultyMultiplier,
          units_deployed: Math.ceil(5 * difficultyMultiplier),
          specialized_units: difficultyMultiplier > 2 ? ['SWAT', 'K9'] : ['Patrol']
        });
      }

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['criminalEvents']);
      queryClient.invalidateQueries(['baseLERaids']);
      queryClient.invalidateQueries(['playerBases']);
      toast.success('Criminal activity detected by LE!');
    }
  });

  const recentEvents = events.filter(e => e.status === 'active');

  return (
    <div className="space-y-4">
      {/* System Overview */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Activity className="w-4 h-4 text-red-400" />
            Event-Driven LE Targeting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-400">
            Major criminal activities increase base vulnerability and trigger LE investigations
          </p>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Recent Events</p>
              <p className="text-red-400 font-bold">{recentEvents.length}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Active Raids</p>
              <p className="text-orange-400 font-bold">{raids.filter(r => r.raid_status !== 'concluded').length}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Avg Vulnerability</p>
              <p className="text-yellow-400 font-bold">
                {bases.length > 0 ? Math.round(bases.reduce((s, b) => s + (b.vulnerability_rating || 0), 0) / bases.length) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulate Events */}
      <Card className="glass-panel border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Trigger Criminal Event</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <select
              value={selectedBase?.id || ''}
              onChange={(e) => setSelectedBase(bases.find(b => b.id === e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded text-xs border border-gray-700"
            >
              {bases.map(base => (
                <option key={base.id} value={base.id}>{base.base_name}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(eventTypeInfo).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => triggerEventMutation.mutate({ eventType: type, base: selectedBase })}
                  disabled={!selectedBase || triggerEventMutation.isPending}
                  className={`p-2 ${info.color} hover:opacity-80 text-white rounded text-xs font-semibold disabled:opacity-50`}
                >
                  {info.icon} {info.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Criminal Events */}
      <Card className="glass-panel border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Recent Criminal Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-gray-400 text-xs">No recent events</p>
            ) : (
              recentEvents.map(event => {
                const info = eventTypeInfo[event.event_type];
                const base = bases.find(b => b.id === event.related_base_id);
                
                return (
                  <div key={event.id} className="p-2 bg-slate-900/50 rounded border border-orange-500/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold text-xs">
                        {info?.icon} {info?.label}
                      </span>
                      <Badge className={info?.color || 'bg-gray-600'}>
                        Severity: {Math.round(event.severity)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="text-gray-400">
                        Base: <span className="text-blue-400">{base?.base_name || 'Unknown'}</span>
                      </div>
                      <div className="text-gray-400">
                        Heat: <span className="text-red-400">+{Math.round(event.heat_generated)}</span>
                      </div>
                      <div className="text-gray-400">
                        Vuln: <span className="text-orange-400">+{Math.round(event.vulnerability_increase)}</span>
                      </div>
                      <div className="text-gray-400">
                        Witnesses: <span className="text-yellow-400">{event.witnesses}</span>
                      </div>
                    </div>
                    {event.evidence_collected && (
                      <div className="mt-1 p-1 bg-red-900/30 rounded text-[10px] text-red-400">
                        ⚠️ Evidence Collected by LE
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Planned Raids */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Skull className="w-4 h-4 text-red-400" />
            Dynamic LE Raids
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {raids.filter(r => r.raid_status !== 'concluded').map(raid => {
              const base = bases.find(b => b.id === raid.base_id);
              
              return (
                <div key={raid.id} className="p-3 bg-red-900/20 rounded border border-red-500/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold text-xs">{base?.base_name}</span>
                    <Badge className="bg-red-600">{raid.raid_status.toUpperCase()}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Units</p>
                      <p className="text-red-400 font-semibold">{raid.units_deployed}</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Difficulty</p>
                      <p className="text-orange-400 font-semibold">{raid.difficulty_multiplier.toFixed(1)}x</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Assets</p>
                      <p className="text-yellow-400 font-semibold">${(raid.detected_asset_value / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Breach</p>
                      <p className="text-cyan-400 font-semibold">{Math.round(raid.breach_progress)}%</p>
                    </div>
                  </div>

                  {raid.specialized_units?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-gray-400 mb-1">Special Units</p>
                      <div className="flex gap-1">
                        {raid.specialized_units.map(unit => (
                          <Badge key={unit} className="bg-red-700 text-[10px]">{unit}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {raids.filter(r => r.raid_status !== 'concluded').length === 0 && (
              <p className="text-gray-400 text-xs">No active raids</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}