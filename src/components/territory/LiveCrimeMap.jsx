import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, CircleMarker, useMap } from 'react-leaflet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  MapPin, Swords, DollarSign, Flame, Shield, AlertTriangle,
  TrendingUp, Zap, Eye, Radio
} from 'lucide-react';
import { useWantedLevel, BLOCKED_DISTRICTS_AT } from '../wanted/WantedSystem';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// 20 city blocks mapped to real NYC-area coordinates as small polygons
const CITY_BLOCKS = [
  { id: 'b01', name: 'Downtown Core',     center: [40.712, -74.006], type: 'financial',   baseIncome: 3500, heatBase: 60 },
  { id: 'b02', name: 'Harbor District',   center: [40.700, -74.016], type: 'industrial',  baseIncome: 2200, heatBase: 40 },
  { id: 'b03', name: 'North Side',        center: [40.730, -73.996], type: 'residential', baseIncome: 1800, heatBase: 25 },
  { id: 'b04', name: 'East End',          center: [40.715, -73.978], type: 'tactical',    baseIncome: 2600, heatBase: 50 },
  { id: 'b05', name: 'Southgate',         center: [40.695, -74.000], type: 'industrial',  baseIncome: 2000, heatBase: 35 },
  { id: 'b06', name: 'Westbrook',         center: [40.720, -74.020], type: 'residential', baseIncome: 1600, heatBase: 20 },
  { id: 'b07', name: 'Industrial Zone',   center: [40.705, -74.025], type: 'industrial',  baseIncome: 2800, heatBase: 45 },
  { id: 'b08', name: 'Financial Quarter', center: [40.718, -74.010], type: 'financial',   baseIncome: 4000, heatBase: 70 },
  { id: 'b09', name: 'Uptown Heights',    center: [40.740, -73.985], type: 'residential', baseIncome: 1500, heatBase: 15 },
  { id: 'b10', name: 'The Docks',         center: [40.692, -74.018], type: 'tactical',    baseIncome: 3000, heatBase: 55 },
  { id: 'b11', name: 'Old Town',          center: [40.725, -74.003], type: 'financial',   baseIncome: 2400, heatBase: 40 },
  { id: 'b12', name: 'Riverside',         center: [40.710, -74.030], type: 'residential', baseIncome: 1700, heatBase: 22 },
  { id: 'b13', name: 'Central Park Zone', center: [40.735, -73.975], type: 'tactical',    baseIncome: 2100, heatBase: 30 },
  { id: 'b14', name: 'Airport Strip',     center: [40.688, -73.990], type: 'industrial',  baseIncome: 3200, heatBase: 65 },
  { id: 'b15', name: 'Chinatown',         center: [40.715, -73.997], type: 'financial',   baseIncome: 2700, heatBase: 48 },
  { id: 'b16', name: 'Little Italy',      center: [40.720, -73.998], type: 'financial',   baseIncome: 2300, heatBase: 42 },
  { id: 'b17', name: 'Tech Corridor',     center: [40.728, -74.008], type: 'tactical',    baseIncome: 3800, heatBase: 58 },
  { id: 'b18', name: 'Stadium District',  center: [40.755, -73.993], type: 'residential', baseIncome: 1900, heatBase: 28 },
  { id: 'b19', name: 'Underground',       center: [40.708, -74.012], type: 'tactical',    baseIncome: 4500, heatBase: 80 },
  { id: 'b20', name: 'The Flats',         center: [40.700, -73.985], type: 'industrial',  baseIncome: 2000, heatBase: 32 },
];

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const POLICE_LOCK_MS = 30 * 60 * 1000;  // 30 min

function getCooldowns() {
  try { return JSON.parse(localStorage.getItem('map_cooldowns') || '{}'); } catch { return {}; }
}
function saveCooldowns(d) { localStorage.setItem('map_cooldowns', JSON.stringify(d)); }
function getHeatData() {
  try { return JSON.parse(localStorage.getItem('map_heat') || '{}'); } catch { return {}; }
}
function saveHeatData(d) { localStorage.setItem('map_heat', JSON.stringify(d)); }

function makePolygon([lat, lng], size = 0.004) {
  return [
    [lat + size, lng - size],
    [lat + size, lng + size],
    [lat - size, lng + size],
    [lat - size, lng - size],
  ];
}

function heatColor(h) {
  if (h >= 86) return '#DC2626';
  if (h >= 61) return '#EA580C';
  if (h >= 31) return '#CA8A04';
  return '#16A34A';
}

function heatLabel(h) {
  if (h >= 86) return { label: 'RAID RISK 🚨', color: 'bg-red-700' };
  if (h >= 61) return { label: 'Monitored 👁️', color: 'bg-orange-700' };
  if (h >= 31) return { label: 'Patrols 🚓', color: 'bg-yellow-700' };
  return { label: 'Safe ✅', color: 'bg-green-700' };
}

function typeIcon(type) {
  return { financial: '💰', industrial: '🏭', tactical: '⚔️', residential: '🏘️' }[type] || '📍';
}

// Police patrol dots that move on a timer
function PolicePatrols({ blocks, heatData }) {
  const [positions, setPositions] = useState(() =>
    blocks.filter(b => (heatData[b.id] || b.heatBase) > 30).slice(0, 5).map(b => ({
      id: b.id,
      pos: [b.center[0] + (Math.random() - 0.5) * 0.005, b.center[1] + (Math.random() - 0.5) * 0.005],
      isRaid: (heatData[b.id] || b.heatBase) > 85
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prev => prev.map(p => ({
        ...p,
        pos: [p.pos[0] + (Math.random() - 0.5) * 0.003, p.pos[1] + (Math.random() - 0.5) * 0.003]
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {positions.map(p => (
        <CircleMarker
          key={p.id + p.pos[0]}
          center={p.pos}
          radius={p.isRaid ? 8 : 5}
          pathOptions={{
            color: p.isRaid ? '#EF4444' : '#3B82F6',
            fillColor: p.isRaid ? '#DC2626' : '#2563EB',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>{p.isRaid ? '🚨 RAID UNIT' : '🚓 Patrol Unit'}</Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export default function LiveCrimeMap({ playerData, crewData }) {
  const queryClient = useQueryClient();
  const [heatData, setHeatData] = useState(getHeatData);
  const { level: wantedLevel, triggerAction: triggerWanted } = useWantedLevel();
  const blockedDistricts = BLOCKED_DISTRICTS_AT[wantedLevel] || [];
  const [cooldowns, setCooldowns] = useState(getCooldowns);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [attackLog, setAttackLog] = useState([]);

  const { data: territories = [] } = useQuery({
    queryKey: ['allTerritories'],
    queryFn: () => base44.entities.Territory.list('-created_date', 50),
    refetchInterval: 15000
  });

  const { data: allCrews = [] } = useQuery({
    queryKey: ['allCrews'],
    queryFn: () => base44.entities.Crew.list('-reputation', 20),
    staleTime: 60000
  });

  const crewColorMap = {};
  allCrews.forEach((c, i) => {
    crewColorMap[c.id] = c.color || ['#9333EA', '#DC2626', '#2563EB', '#D97706', '#16A34A'][i % 5];
  });

  // Merge block static data with DB territory ownership
  const enrichedBlocks = CITY_BLOCKS.map(block => {
    const territory = territories.find(t => t.name === block.name);
    const heat = heatData[block.id] !== undefined ? heatData[block.id] : block.heatBase;
    const incomePenalty = heat > 60 ? (heat - 60) / 100 : 0;
    const actualIncome = Math.floor(block.baseIncome * (1 - incomePenalty));
    return {
      ...block,
      territory,
      heat,
      actualIncome,
      ownerCrewId: territory?.controlling_crew_id || null,
      isOwned: territory?.controlling_crew_id === playerData?.crew_id,
      isContested: territory?.is_contested || false,
      isUnclaimed: !territory,
    };
  });

  const ownedBlocks = enrichedBlocks.filter(b => b.isOwned);
  const totalDailyIncome = ownedBlocks.reduce((s, b) => s + b.actualIncome, 0);

  function getCooldownMins(blockId) {
    const cd = cooldowns[blockId];
    if (!cd || Date.now() >= cd) return null;
    return Math.ceil((cd - Date.now()) / 60000);
  }

  function isPoliceBlocked(blockId) {
    const lock = cooldowns[`police_${blockId}`];
    return lock && Date.now() < lock;
  }

  function raiseHeat(blockId, amount) {
    const updated = { ...heatData, [blockId]: Math.min(100, (heatData[blockId] || 0) + amount) };
    setHeatData(updated);
    saveHeatData(updated);
  }

  function lowerHeat(blockId, amount) {
    const updated = { ...heatData, [blockId]: Math.max(0, (heatData[blockId] || 0) - amount) };
    setHeatData(updated);
    saveHeatData(updated);
  }

  const claimMutation = useMutation({
    mutationFn: async (block) => {
      if (!playerData?.crew_id) throw new Error('Join a crew first');
      const cd = getCooldowns();
      if (cd[block.id] && Date.now() < cd[block.id]) throw new Error(`Cooldown: ${Math.ceil((cd[block.id] - Date.now()) / 60000)}m`);
      if (blockedDistricts.includes(block.name)) throw new Error(`${block.name} is blockaded by law enforcement!`);
      await base44.entities.Territory.create({
        name: block.name,
        controlling_crew_id: playerData.crew_id,
        control_percentage: 100,
        revenue_multiplier: 1 + (block.baseIncome / 5000),
        resource_type: block.type,
        is_contested: false
      });
      await base44.entities.Player.update(playerData.id, {
        territory_count: (playerData.territory_count || 0) + 1
      });
      triggerWanted('territory_capture');
      raiseHeat(block.id, 15);
    },
    onSuccess: (_, block) => {
      queryClient.invalidateQueries(['allTerritories']);
      toast.success(`${block.name} claimed! Heat +15`);
      setSelectedBlock(null);
    },
    onError: err => toast.error(err.message)
  });

  const attackMutation = useMutation({
    mutationFn: async (block) => {
      if (!playerData?.crew_id) throw new Error('Join a crew first');
      if (block.ownerCrewId === playerData.crew_id) throw new Error('Already yours');
      const cd = getCooldowns();
      if (cd[block.id] && Date.now() < cd[block.id]) throw new Error(`Cooldown active`);
      if (isPoliceBlocked(block.id)) throw new Error('Police lockdown! Try later.');

      if (blockedDistricts.includes(block.name)) throw new Error(`${block.name} is blockaded — cannot attack during police lockdown!`);
      const heatPenalty = block.heat * 0.3;
      const wantedPenalty = wantedLevel * 5; // high wanted = more police interfere
      const attackPower = (playerData.strength_score || 10) + ((playerData.skills?.combat || 0) * 5);
      const defPower = 40 + Math.random() * 30;
      const successChance = Math.max(5, Math.min(90, 50 + attackPower - defPower - heatPenalty - wantedPenalty));
      const success = Math.random() * 100 < successChance;

      // Always raise heat on attack + raise wanted level
      triggerWanted('territory_attack');
      raiseHeat(block.id, success ? 25 : 15);

      // Set cooldown
      const newCd = { ...cd, [block.id]: Date.now() + COOLDOWN_MS };
      // If heat > 85, add police lock
      if ((heatData[block.id] || 0) + 25 > 85) {
        newCd[`police_${block.id}`] = Date.now() + POLICE_LOCK_MS;
      }
      saveCooldowns(newCd);
      setCooldowns(newCd);

      if (success) {
        await base44.entities.Territory.update(block.territory.id, {
          controlling_crew_id: playerData.crew_id,
          control_percentage: 100,
          is_contested: false
        });
        await base44.entities.Player.update(playerData.id, {
          territory_count: (playerData.territory_count || 0) + 1
        });
      }

      setAttackLog(prev => [{
        block: block.name,
        success,
        chance: successChance.toFixed(0),
        time: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 9)]);

      return { success, successChance };
    },
    onSuccess: ({ success }) => {
      queryClient.invalidateQueries(['allTerritories']);
      if (success) toast.success('Territory captured! 2hr cooldown set.');
      else toast.error('Attack repelled. Heat raised. 2hr cooldown.');
      setSelectedBlock(null);
    },
    onError: err => toast.error(err.message)
  });

  const collectIncomeMutation = useMutation({
    mutationFn: async () => {
      const lastClaim = parseInt(localStorage.getItem('map_income_claimed') || '0');
      if (Date.now() - lastClaim < 3600000) throw new Error('Already collected this hour');
      if (ownedBlocks.length === 0) throw new Error('No territories owned');
      const hourly = Math.floor(totalDailyIncome / 24);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + hourly,
        total_earnings: (playerData.total_earnings || 0) + hourly
      });
      localStorage.setItem('map_income_claimed', Date.now().toString());
      return hourly;
    },
    onSuccess: (amount) => {
      queryClient.invalidateQueries(['player']);
      toast.success(`💰 Collected $${amount.toLocaleString()} territory income!`);
    },
    onError: err => toast.error(err.message)
  });

  const reduceHeatMutation = useMutation({
    mutationFn: async (block) => {
      const cost = 5000;
      if ((playerData.crypto_balance || 0) < cost) throw new Error('Need $5,000 to bribe police');
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
      lowerHeat(block.id, 30);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
      toast.success('Police bribed! Heat -30');
      setSelectedBlock(null);
    },
    onError: err => toast.error(err.message)
  });

  const sel = selectedBlock ? enrichedBlocks.find(b => b.id === selectedBlock) : null;
  const selHeatInfo = sel ? heatLabel(sel.heat) : null;

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/30 text-center">
          <MapPin className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{ownedBlocks.length}/20</p>
          <p className="text-xs text-gray-400">Territories</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-900/40 to-orange-900/20 border border-yellow-500/30 text-center">
          <DollarSign className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">${totalDailyIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Daily Passive</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-red-900/40 to-orange-900/20 border border-red-500/30 text-center">
          <Flame className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-400">
            {ownedBlocks.length > 0 ? Math.round(ownedBlocks.reduce((s, b) => s + b.heat, 0) / ownedBlocks.length) : 0}%
          </p>
          <p className="text-xs text-gray-400">Avg Heat</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-900/40 to-blue-900/20 border border-cyan-500/30 text-center">
          <Button
            size="sm"
            className="w-full text-xs bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
            onClick={() => collectIncomeMutation.mutate()}
            disabled={collectIncomeMutation.isPending || ownedBlocks.length === 0}
          >
            <DollarSign className="w-3 h-3 mr-1" />Collect Income
          </Button>
          <p className="text-xs text-gray-400 mt-1">Hourly</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs text-gray-400 px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-600 inline-block border border-purple-400" /> Your Crew</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block border border-red-400" /> Enemy</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600 inline-block border border-gray-400" /> Unclaimed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Patrol</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Raid</span>
        <span className="ml-auto flex items-center gap-2">
          <span>Heat: </span>
          <span className="text-green-400">●Safe</span>
          <span className="text-yellow-400">●Patrols</span>
          <span className="text-orange-400">●Monitored</span>
          <span className="text-red-400">●RAID</span>
        </span>
      </div>

      {/* Map + Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leaflet Map */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-purple-500/30" style={{ height: 520 }}>
          <MapContainer
            center={[40.718, -74.002]}
            zoom={13}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />

            {/* Territory polygons */}
            {enrichedBlocks.map(block => {
              const isSelected = selectedBlock === block.id;
              let fillColor = '#374151'; // unclaimed
              let borderColor = '#6B7280';

              if (block.isOwned) {
                fillColor = '#7C3AED';
                borderColor = '#A855F7';
              } else if (block.ownerCrewId) {
                fillColor = crewColorMap[block.ownerCrewId] || '#DC2626';
                borderColor = '#EF4444';
              }

              // Heat overlay blend
              const heatOpacity = block.heat > 60 ? 0.5 : block.heat > 30 ? 0.35 : 0.25;
              const heatFill = block.heat > 85 ? '#DC2626' : block.heat > 60 ? '#EA580C' : fillColor;

              return (
                <Polygon
                  key={block.id}
                  positions={makePolygon(block.center, 0.004)}
                  pathOptions={{
                    color: isSelected ? '#FFFFFF' : borderColor,
                    fillColor: heatFill,
                    fillOpacity: heatOpacity + (isSelected ? 0.2 : 0),
                    weight: isSelected ? 3 : block.isContested ? 2 : 1.5,
                    dashArray: block.isContested ? '5,5' : null,
                  }}
                  eventHandlers={{ click: () => setSelectedBlock(block.id) }}
                >
                  <Popup>
                    <div className="text-sm font-bold">{typeIcon(block.type)} {block.name}</div>
                    <div>Heat: <strong style={{ color: heatColor(block.heat) }}>{block.heat}%</strong></div>
                    <div>Income: ${block.actualIncome.toLocaleString()}/day</div>
                    {block.isOwned && <div style={{ color: '#a855f7' }}>✓ Your Territory</div>}
                  </Popup>
                </Polygon>
              );
            })}

            {/* Police patrols */}
            <PolicePatrols blocks={CITY_BLOCKS} heatData={heatData} />
          </MapContainer>
        </div>

        {/* Right Info Panel */}
        <div className="space-y-3">
          {sel ? (
            <Card className="glass-panel border-purple-500/30">
              <CardHeader className="border-b border-purple-500/20 pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  {typeIcon(sel.type)} {sel.name}
                  <Badge className={selHeatInfo.color + ' ml-auto text-xs'}>{selHeatInfo.label}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Heat Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> Heat Level</span>
                    <span style={{ color: heatColor(sel.heat) }}>{sel.heat}%</span>
                  </div>
                  <Progress value={sel.heat} className="h-2"
                    style={{ '--tw-progress-bar-color': heatColor(sel.heat) }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-black/30">
                    <p className="text-gray-400">Daily Income</p>
                    <p className="text-green-400 font-bold">${sel.actualIncome.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30">
                    <p className="text-gray-400">District</p>
                    <p className="text-purple-400 capitalize">{sel.type}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30">
                    <p className="text-gray-400">Status</p>
                    <p className="text-white text-xs">
                      {sel.isOwned ? '🟣 Yours' : sel.ownerCrewId ? '🔴 Enemy' : '⬜ Free'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30">
                    <p className="text-gray-400">Police</p>
                    <p className={isPoliceBlocked(sel.id) ? 'text-red-400 text-xs' : 'text-green-400 text-xs'}>
                      {isPoliceBlocked(sel.id) ? '🚔 Locked' : sel.heat > 85 ? '🚨 Raiding' : sel.heat > 50 ? '🚓 Patrolling' : '✅ Clear'}
                    </p>
                  </div>
                </div>

                {getCooldownMins(sel.id) && (
                  <div className="p-2 rounded-lg bg-orange-900/30 border border-orange-500/30 text-xs text-orange-300 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Capture cooldown: {getCooldownMins(sel.id)}m remaining
                  </div>
                )}

                <div className="space-y-2">
                  {sel.isUnclaimed && (
                    <Button
                      size="sm" className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-xs"
                      onClick={() => claimMutation.mutate(sel)}
                      disabled={claimMutation.isPending || !playerData?.crew_id}
                    >
                      <MapPin className="w-3 h-3 mr-1" />Claim Territory
                    </Button>
                  )}
                  {!sel.isUnclaimed && !sel.isOwned && (
                    <Button
                      size="sm"
                      className={`w-full text-xs ${getCooldownMins(sel.id) || isPoliceBlocked(sel.id) ? 'bg-gray-700' : 'bg-gradient-to-r from-red-600 to-orange-600'}`}
                      onClick={() => attackMutation.mutate(sel)}
                      disabled={attackMutation.isPending || !!getCooldownMins(sel.id) || isPoliceBlocked(sel.id) || !playerData?.crew_id}
                    >
                      <Swords className="w-3 h-3 mr-1" />
                      {getCooldownMins(sel.id) ? `Cooldown ${getCooldownMins(sel.id)}m` :
                       isPoliceBlocked(sel.id) ? 'Police Blocked' : 'Attack Territory'}
                    </Button>
                  )}
                  {sel.isOwned && sel.heat > 30 && (
                    <Button
                      size="sm" className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 text-xs"
                      onClick={() => reduceHeatMutation.mutate(sel)}
                      disabled={reduceHeatMutation.isPending}
                    >
                      <Shield className="w-3 h-3 mr-1" />Bribe Police — $5,000 (Heat -30)
                    </Button>
                  )}
                  {sel.isOwned && (
                    <div className="p-2 rounded-lg bg-green-900/20 border border-green-500/20 text-xs text-green-300 text-center">
                      Earning ${Math.floor(sel.actualIncome / 24).toLocaleString()}/hr passive
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-panel border-purple-500/20">
              <CardContent className="p-6 text-center text-gray-400">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Click any territory on the map to view details and take action</p>
              </CardContent>
            </Card>
          )}

          {/* Attack Log */}
          {attackLog.length > 0 && (
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20 pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  Combat Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 max-h-40 overflow-y-auto">
                {attackLog.map((log, i) => (
                  <div key={i} className={`text-xs flex items-center justify-between p-1.5 rounded ${log.success ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                    <span className={log.success ? 'text-green-400' : 'text-red-400'}>
                      {log.success ? '✓' : '✗'} {log.block}
                    </span>
                    <span className="text-gray-500">{log.chance}% • {log.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* My Territories Mini List */}
          {ownedBlocks.length > 0 && (
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20 pb-2">
                <CardTitle className="text-white text-sm">Your Empire ({ownedBlocks.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 max-h-40 overflow-y-auto">
                {ownedBlocks.map(b => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-xs p-1.5 rounded bg-purple-900/20 cursor-pointer hover:bg-purple-900/40"
                    onClick={() => setSelectedBlock(b.id)}
                  >
                    <span className="text-white">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ color: heatColor(b.heat) }}>{b.heat}%🔥</span>
                      <span className="text-green-400">${b.actualIncome.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}