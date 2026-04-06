import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Swords, MapPin, Users, Flame, Trophy, Clock, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';

const WAR_STATE_STYLES = {
  active:   { color: 'text-red-400',   bg: 'border-red-500/30',   label: '⚔️ WAR' },
  ended:    { color: 'text-gray-400',  bg: 'border-gray-500/20',  label: '✅ ENDED' },
  lockdown: { color: 'text-orange-400',bg: 'border-orange-500/30',label: '🔒 LOCKDOWN' },
};

export default function GangWar() {
  const [declaring, setDeclaring] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser,
  });

  const { data: activeWars = [], refetch: refetchWars } = useQuery({
    queryKey: ['allWars'],
    queryFn: () => base44.entities.TerritoryWar.list('-created_date', 20),
    refetchInterval: 15000,
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list('-created_date', 50),
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.Crew.list('-reputation', 20),
  });

  const contestedTerritories = territories.filter(t => t.is_contested);
  const peacefulTerritories = territories.filter(t => !t.is_contested && t.controlling_crew_id);
  const currentWars = activeWars.filter(w => w.status === 'active');
  const recentWars = activeWars.filter(w => w.status === 'ended').slice(0, 5);

  const myCrewId = playerData?.crew_id;
  const myCrewName = crews.find(c => c.id === myCrewId)?.name || 'Unknown';

  const declareWar = async (territory) => {
    if (!myCrewId) {
      toast.error('You must be in a crew to declare war.');
      return;
    }
    if (territory.controlling_crew_id === myCrewId) {
      toast.error('You already control this territory!');
      return;
    }
    const existingWar = currentWars.find(w => w.territory_id === territory.id);
    if (existingWar) {
      toast.error('A war is already active for this territory.');
      return;
    }
    const defenderCrew = crews.find(c => c.id === territory.controlling_crew_id);

    setDeclaring(true);
    await base44.entities.TerritoryWar.create({
      territory_id: territory.id,
      territory_name: territory.name,
      attacker_crew_id: myCrewId,
      attacker_crew_name: myCrewName,
      defender_crew_id: territory.controlling_crew_id,
      defender_crew_name: defenderCrew?.name || 'Unknown',
      war_score_attacker: 0,
      war_score_defender: 0,
      attacker_influence_pct: 0,
      defender_influence_pct: 100,
      ticks_elapsed: 0,
      max_ticks: 6,
      status: 'active',
      started_at: new Date().toISOString(),
    });

    // Mark territory as contested
    await base44.entities.Territory.update(territory.id, { is_contested: true });

    // Trigger global event
    await base44.entities.GlobalEvent.create({
      title: `⚔️ War Declared: ${territory.name}`,
      description: `${myCrewName} has declared war on ${defenderCrew?.name || 'Unknown'} for control of ${territory.name}!`,
      event_type: 'gang_war',
      icon: '⚔️',
      effect_type: 'territory_war',
      effect_value: 1,
      duration_hours: 1,
      is_active: true,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    toast.success(`⚔️ War declared on ${territory.name}! The world tick engine will resolve this in 6 ticks (1 hour).`);
    setDeclaring(false);
    setSelectedTerritory(null);
    refetchWars();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel border border-red-500/30 p-6 rounded-xl">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Swords className="w-7 h-7 text-red-400" />
          Gang War Command
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Declare wars, track battles. World Tick Engine resolves every 10 min.
        </p>
        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="text-red-400 font-bold text-2xl">{currentWars.length}</p>
            <p className="text-gray-500 text-xs">Active Wars</p>
          </div>
          <div className="text-center">
            <p className="text-orange-400 font-bold text-2xl">{contestedTerritories.length}</p>
            <p className="text-gray-500 text-xs">Contested Zones</p>
          </div>
          <div className="text-center">
            <p className="text-purple-400 font-bold text-2xl">{peacefulTerritories.length}</p>
            <p className="text-gray-500 text-xs">Peaceful Zones</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Wars */}
        <div className="space-y-4">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400" /> Active Wars
          </h2>
          {currentWars.length === 0 ? (
            <Card className="glass-panel border border-red-500/10">
              <CardContent className="p-6 text-center text-gray-500">No active wars — peace reigns (for now)</CardContent>
            </Card>
          ) : currentWars.map(war => {
            const total = (war.war_score_attacker || 0) + (war.war_score_defender || 0) || 1;
            const attackPct = Math.round((war.war_score_attacker / total) * 100);
            const ticksLeft = (war.max_ticks || 6) - (war.ticks_elapsed || 0);
            const isMyWar = war.attacker_crew_id === myCrewId || war.defender_crew_id === myCrewId;

            return (
              <Card key={war.id} className={`glass-panel border ${isMyWar ? 'border-red-400/40' : 'border-red-500/20'}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold">📍 {war.territory_name}</p>
                    <div className="flex items-center gap-2">
                      {isMyWar && <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 text-xs">YOUR WAR</Badge>}
                      <Badge className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs">
                        <Clock className="w-3 h-3 mr-1 inline" />{ticksLeft} ticks
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-red-400">⚔️ {war.attacker_crew_name}</span>
                    <span className="text-blue-400">🛡️ {war.defender_crew_name}</span>
                  </div>

                  <div className="relative h-5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-700" style={{ width: `${attackPct}%` }} />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                      {attackPct}% vs {100 - attackPct}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-red-400 font-bold">{war.war_score_attacker || 0}</p>
                      <p className="text-gray-500">Atk Score</p>
                    </div>
                    <div>
                      <p className="text-yellow-400 font-bold">${((war.economic_damage || 0) / 1000).toFixed(0)}k</p>
                      <p className="text-gray-500">Econ DMG</p>
                    </div>
                    <div>
                      <p className="text-blue-400 font-bold">{war.war_score_defender || 0}</p>
                      <p className="text-gray-500">Def Score</p>
                    </div>
                  </div>

                  <Progress value={(war.ticks_elapsed / (war.max_ticks || 6)) * 100} className="h-1" />
                  <p className="text-gray-500 text-xs text-center">
                    Tick {war.ticks_elapsed || 0} / {war.max_ticks || 6} — Engine resolves automatically
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Declare War Panel */}
        <div className="space-y-4">
          <h2 className="text-white font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" /> Declare War
          </h2>
          {!myCrewId ? (
            <Card className="glass-panel border border-yellow-500/20">
              <CardContent className="p-6 text-center text-yellow-400">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p>Join a crew to declare war on territories.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {peacefulTerritories.filter(t => t.controlling_crew_id !== myCrewId).map(t => {
                const defenderCrew = crews.find(c => c.id === t.controlling_crew_id);
                const hasActiveWar = currentWars.some(w => w.territory_id === t.id);
                return (
                  <Card
                    key={t.id}
                    className={`glass-panel border cursor-pointer transition-all ${
                      selectedTerritory?.id === t.id
                        ? 'border-red-400/60 bg-red-900/10'
                        : 'border-purple-500/20 hover:border-red-400/30'
                    } ${hasActiveWar ? 'opacity-50' : ''}`}
                    onClick={() => !hasActiveWar && setSelectedTerritory(selectedTerritory?.id === t.id ? null : t)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{t.name}</p>
                        <p className="text-gray-400 text-xs">{defenderCrew?.name || 'Independent'} · {t.resource_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasActiveWar && <Badge className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs">WAR ACTIVE</Badge>}
                        <Badge className={`text-xs capitalize border ${
                          t.resource_type === 'financial' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' :
                          t.resource_type === 'industrial' ? 'bg-orange-900/20 text-orange-400 border-orange-500/30' :
                          'bg-blue-900/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {t.resource_type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedTerritory && (
            <Card className="glass-panel border border-red-400/40 bg-red-900/10">
              <CardContent className="p-4 space-y-3">
                <p className="text-white font-bold">⚔️ Declare War on: {selectedTerritory.name}</p>
                <p className="text-gray-400 text-sm">
                  The World Tick Engine will process this war every 10 minutes over 6 ticks (1 hour).
                  The crew with the higher score at the end takes control.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => declareWar(selectedTerritory)}
                    disabled={declaring}
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    {declaring ? 'Declaring...' : 'Declare War'}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTerritory(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Wars */}
      {recentWars.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" /> Recent Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentWars.map(war => (
              <Card key={war.id} className="glass-panel border border-gray-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium text-sm">📍 {war.territory_name}</p>
                    <Badge className="bg-gray-600/20 text-gray-400 border border-gray-500/30 text-xs">Ended</Badge>
                  </div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className={war.winner_crew_id === war.attacker_crew_id ? 'text-green-400 font-bold' : 'text-gray-400'}>
                      {war.winner_crew_id === war.attacker_crew_id ? '🏆' : ''} {war.attacker_crew_name}
                    </span>
                    <span className="text-gray-500">vs</span>
                    <span className={war.winner_crew_id === war.defender_crew_id ? 'text-green-400 font-bold' : 'text-gray-400'}>
                      {war.defender_crew_name} {war.winner_crew_id === war.defender_crew_id ? '🏆' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{war.war_score_attacker} — {war.war_score_defender} after {war.ticks_elapsed} ticks</p>
                  {war.ended_at && <p className="text-xs text-gray-600 mt-1">{new Date(war.ended_at).toLocaleString()}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}