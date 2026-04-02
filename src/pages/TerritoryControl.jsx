import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, Sword, Shield, Eye, Crown, Zap, 
  TrendingUp, Users, Activity, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const CITY_SECTORS = [
  { id: 'downtown', name: 'Downtown Core', value: 15000, icon: '🏙️', income_type: 'financial' },
  { id: 'docks', name: 'Harbor Docks', value: 12000, icon: '⚓', income_type: 'industrial' },
  { id: 'eastside', name: 'East Side', value: 8000, icon: '🏚️', income_type: 'residential' },
  { id: 'northgate', name: 'North Gate', value: 10000, icon: '🏘️', income_type: 'residential' },
  { id: 'industrial', name: 'Industrial Zone', value: 18000, icon: '🏭', income_type: 'industrial' },
  { id: 'casino_strip', name: 'Casino Strip', value: 25000, icon: '🎰', income_type: 'financial' },
  { id: 'airport', name: 'Airport District', value: 20000, icon: '✈️', income_type: 'tactical' },
  { id: 'southside', name: 'Southside', value: 7000, icon: '🌆', income_type: 'residential' },
  { id: 'midtown', name: 'Midtown', value: 14000, icon: '🏢', income_type: 'financial' },
];

const CREW_COLORS = [
  '#9333EA', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6'
];

function getCrewColor(crewId, crews) {
  if (!crewId) return '#374151';
  const idx = crews.findIndex(c => c.id === crewId);
  return CREW_COLORS[idx % CREW_COLORS.length] || '#374151';
}

export default function TerritoryControl() {
  const queryClient = useQueryClient();
  const [selectedSector, setSelectedSector] = useState(null);
  const [deployMode, setDeployMode] = useState('attack');
  const [liveEvents, setLiveEvents] = useState([]);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const p = await base44.entities.Player.filter({ created_by: user.email }); return p[0]; },
    enabled: !!user
  });
  const { data: myCrew } = useQuery({
    queryKey: ['myCrew', playerData?.crew_id],
    queryFn: () => base44.entities.Crew.filter({ id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
    select: d => d[0]
  });
  const { data: allCrews = [] } = useQuery({
    queryKey: ['allCrews'],
    queryFn: () => base44.entities.Crew.list('-total_power', 20),
    refetchInterval: 20000
  });
  const { data: territories = [], refetch: refetchTerritories } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list('-control_percentage', 50),
    refetchInterval: 10000
  });
  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', playerData?.crew_id],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id
  });

  // Real-time territory changes
  useEffect(() => {
    const unsub = base44.entities.Territory.subscribe((event) => {
      if (event.type === 'update') {
        setLiveEvents(prev => [{
          message: `⚔️ Territory ${event.data?.name} updated — control shifted!`,
          ts: new Date().toLocaleTimeString(),
          id: event.id
        }, ...prev.slice(0, 9)]);
        refetchTerritories();
      }
    });
    return unsub;
  }, []);

  // Map each CITY_SECTOR to its db Territory record
  function getSectorTerritory(sectorId) {
    return territories.find(t => t.name?.toLowerCase().includes(sectorId) || t.id === sectorId);
  }

  const attackSector = useMutation({
    mutationFn: async () => {
      if (!selectedSector) throw new Error('Select a sector');
      if (!myCrew) throw new Error('You must be in a crew to capture territory');

      const sector = CITY_SECTORS.find(s => s.id === selectedSector);
      const existingTerritory = getSectorTerritory(selectedSector);
      const myPower = myCrew?.total_power || 10;
      const defensePower = existingTerritory?.defense_bonus || 0;
      const successChance = Math.min(90, Math.max(10, (myPower / (myPower + defensePower + 20)) * 100));
      const success = Math.random() * 100 < successChance;

      const income = success ? Math.floor(sector.value * 0.1) : 0;

      if (existingTerritory) {
        await base44.entities.Territory.update(existingTerritory.id, {
          controlling_crew_id: success ? myCrew.id : existingTerritory.controlling_crew_id,
          control_percentage: success ? Math.min(100, (existingTerritory.control_percentage || 50) + 20) : Math.max(0, (existingTerritory.control_percentage || 50) - 10),
          is_contested: !success,
        });
      } else {
        await base44.entities.Territory.create({
          name: sector.name,
          controlling_crew_id: success ? myCrew.id : null,
          control_percentage: success ? 60 : 0,
          revenue_multiplier: 1.2,
          defense_bonus: 10,
          is_contested: false,
          resource_type: sector.income_type,
        });
      }

      if (success && income > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: (playerData.crypto_balance || 0) + income,
          territory_count: (playerData.territory_count || 0) + 1,
          endgame_points: (playerData.endgame_points || 0) + 100,
        });
        await base44.entities.Crew.update(myCrew.id, {
          territory_count: (myCrew.territory_count || 0) + 1,
          total_power: (myCrew.total_power || 0) + 5,
        });
      }

      return { success, income, sector };
    },
    onSuccess: ({ success, income, sector }) => {
      if (success) toast.success(`✅ ${sector.name} captured! +$${income.toLocaleString()}`);
      else toast.error(`❌ Attack on ${sector.name} failed — defenders held.`);
      queryClient.invalidateQueries();
      refetchPlayer();
    },
    onError: (e) => toast.error(e.message)
  });

  const reinforceSector = useMutation({
    mutationFn: async () => {
      if (!selectedSector) throw new Error('Select a sector');
      const cost = 3000;
      if ((playerData?.crypto_balance || 0) < cost) throw new Error(`Need $${cost.toLocaleString()} to reinforce`);
      const territory = getSectorTerritory(selectedSector);
      if (!territory) throw new Error('Your crew does not own this sector');
      if (territory.controlling_crew_id !== myCrew?.id) throw new Error('You do not control this sector');

      await base44.entities.Territory.update(territory.id, {
        defense_bonus: (territory.defense_bonus || 0) + 15,
        control_percentage: Math.min(100, (territory.control_percentage || 50) + 10),
      });
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) - cost
      });
    },
    onSuccess: () => { toast.success('🛡️ Sector reinforced!'); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(e.message)
  });

  // Compute empire stats
  const myTerritories = territories.filter(t => t.controlling_crew_id === myCrew?.id);
  const totalPassiveIncome = myTerritories.reduce((acc, t) => {
    const sector = CITY_SECTORS.find(s => t.name?.includes(s.name.split(' ')[0]));
    return acc + (sector?.value || 5000) * 0.05;
  }, 0);

  if (!playerData) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-green-500/20 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <MapPin className="w-8 h-8 text-green-400" /> Territory Control
          </h1>
          <p className="text-gray-400 mt-1">Capture sectors, deploy crew, dominate the city — real-time influence map</p>
        </div>
        <div className="flex gap-4 text-center">
          <div><p className="text-xs text-gray-400">Sectors Held</p><p className="text-2xl font-bold text-green-400">{myTerritories.length}</p></div>
          <div><p className="text-xs text-gray-400">Passive Income/hr</p><p className="text-2xl font-bold text-yellow-400">${Math.floor(totalPassiveIncome).toLocaleString()}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* City Map Grid */}
        <div className="lg:col-span-2">
          <Card className="glass-panel border border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" /> City Influence Map
                <span className="ml-auto text-xs text-gray-400 animate-pulse flex items-center gap-1"><Activity className="w-3 h-3" />Live</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {CITY_SECTORS.map(sector => {
                  const territory = getSectorTerritory(sector.id);
                  const ownerCrew = allCrews.find(c => c.id === territory?.controlling_crew_id);
                  const isOwned = territory?.controlling_crew_id === myCrew?.id;
                  const isContested = territory?.is_contested;
                  const crewColor = getCrewColor(territory?.controlling_crew_id, allCrews);
                  const isSelected = selectedSector === sector.id;
                  const control = territory?.control_percentage || 0;

                  return (
                    <button key={sector.id} onClick={() => setSelectedSector(isSelected ? null : sector.id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected ? 'scale-105 shadow-lg shadow-purple-500/30' : 'hover:scale-102'
                      } ${isOwned ? 'border-green-500' : isContested ? 'border-red-500 animate-pulse' : 'border-gray-600'}`}
                      style={{ background: territory?.controlling_crew_id ? `${crewColor}22` : '#1e293b' }}>

                      {isContested && <span className="absolute top-1 right-1 text-xs">⚔️</span>}
                      {isOwned && <span className="absolute top-1 right-1 text-xs">👑</span>}

                      <p className="text-2xl mb-1">{sector.icon}</p>
                      <p className="text-white font-semibold text-sm leading-tight">{sector.name}</p>
                      <p className="text-xs text-gray-400 mt-1">${sector.value.toLocaleString()}/capture</p>

                      {ownerCrew ? (
                        <p className="text-xs mt-1 font-semibold truncate" style={{ color: crewColor }}>{ownerCrew.name}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Unclaimed</p>
                      )}

                      {territory && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>Control</span><span>{control}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-gray-700">
                            <div className="h-full rounded-full transition-all" style={{ width: `${control}%`, background: crewColor }} />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Crew Legend */}
              <div className="mt-4 flex flex-wrap gap-2">
                {allCrews.slice(0, 6).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ background: CREW_COLORS[i % CREW_COLORS.length] }} />
                    <span className="text-gray-300">{c.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full bg-gray-600" />
                  <span className="text-gray-400">Unclaimed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Live Events */}
          <Card className="glass-panel border border-cyan-500/20">
            <CardHeader><CardTitle className="text-cyan-400 text-sm flex items-center gap-2"><Activity className="w-4 h-4 animate-pulse" />Live Territory Feed</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-1 max-h-32 overflow-y-auto">
              {liveEvents.length === 0 ? <p className="text-gray-500 text-xs">Monitoring city sectors in real-time...</p> : (
                liveEvents.map((e, i) => (
                  <div key={i} className="text-xs flex justify-between">
                    <span className="text-gray-300">{e.message}</span>
                    <span className="text-gray-600 ml-1 flex-shrink-0">{e.ts}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Sector Actions */}
          {selectedSector ? (() => {
            const sector = CITY_SECTORS.find(s => s.id === selectedSector);
            const territory = getSectorTerritory(selectedSector);
            const ownerCrew = allCrews.find(c => c.id === territory?.controlling_crew_id);
            const isOwned = territory?.controlling_crew_id === myCrew?.id;
            return (
              <Card className="glass-panel border border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <span className="text-xl">{sector?.icon}</span> {sector?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Value</span><span className="text-yellow-400">${sector?.value?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="text-white capitalize">{sector?.income_type}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Controller</span><span className="text-white">{ownerCrew?.name || 'Unclaimed'}</span></div>
                    {territory && <div className="flex justify-between"><span className="text-gray-400">Defense</span><span className="text-cyan-400">{territory.defense_bonus || 0}</span></div>}
                    {territory && (
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Control</span><span>{territory.control_percentage || 0}%</span></div>
                        <Progress value={territory.control_percentage || 0} className="h-2" />
                      </div>
                    )}
                  </div>

                  {myCrew ? (
                    <div className="space-y-2">
                      {!isOwned && (
                        <Button className="w-full bg-red-700 hover:bg-red-600 text-sm" onClick={() => attackSector.mutate()} disabled={attackSector.isPending}>
                          <Sword className="w-4 h-4 mr-2" />{attackSector.isPending ? 'Attacking...' : 'Launch Takeover'}
                        </Button>
                      )}
                      {isOwned && (
                        <Button className="w-full bg-blue-700 hover:bg-blue-600 text-sm" onClick={() => reinforceSector.mutate()} disabled={reinforceSector.isPending}>
                          <Shield className="w-4 h-4 mr-2" />{reinforceSector.isPending ? 'Reinforcing...' : 'Reinforce ($3,000)'}
                        </Button>
                      )}
                      {isOwned && <Badge className="bg-green-700 w-full flex justify-center py-1">👑 You control this sector</Badge>}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center">Join a crew to capture territories</p>
                  )}
                </CardContent>
              </Card>
            );
          })() : (
            <Card className="glass-panel border border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
                <MapPin className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Click a sector to view details and take action</p>
              </CardContent>
            </Card>
          )}

          {/* Empire Stats */}
          {myCrew && (
            <Card className="glass-panel border border-green-500/20">
              <CardHeader><CardTitle className="text-green-400 text-sm flex items-center gap-2"><Crown className="w-4 h-4" />{myCrew.name}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Sectors</span><span className="text-white">{myTerritories.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Power</span><span className="text-yellow-400">{myCrew.total_power || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Passive/hr</span><span className="text-green-400">${Math.floor(totalPassiveIncome).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Members</span><span className="text-white">{myCrew.member_count || 0}</span></div>
              </CardContent>
            </Card>
          )}

          {/* Global Leaderboard */}
          <Card className="glass-panel border border-yellow-500/20">
            <CardHeader><CardTitle className="text-yellow-400 text-sm">Territory Leaderboard</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {allCrews.slice(0, 5).map((crew, i) => {
                const crewTerr = territories.filter(t => t.controlling_crew_id === crew.id).length;
                return (
                  <div key={crew.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-4">#{i + 1}</span>
                      <div className="w-3 h-3 rounded-full" style={{ background: CREW_COLORS[i % CREW_COLORS.length] }} />
                      <span className="text-white truncate max-w-24">{crew.name}</span>
                    </div>
                    <Badge className="bg-slate-700 text-xs">{crewTerr} sectors</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}