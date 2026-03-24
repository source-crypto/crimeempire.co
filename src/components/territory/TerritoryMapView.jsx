import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, DollarSign, Clock, Swords, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const BLOCK_NAMES = [
  'Downtown Core', 'Harbor District', 'North Side', 'East End', 'Southgate',
  'Westbrook', 'Industrial Zone', 'Financial Quarter', 'Uptown Heights', 'The Docks',
  'Old Town', 'Riverside', 'Central Park Zone', 'Airport Strip', 'Chinatown',
  'Little Italy', 'Tech Corridor', 'Stadium District', 'Underground', 'The Flats'
];

const INCOME_PER_TERRITORY = 2500; // per day

function getCooldowns() {
  try { return JSON.parse(localStorage.getItem('territory_cooldowns') || '{}'); } catch { return {}; }
}
function saveCooldowns(data) {
  localStorage.setItem('territory_cooldowns', JSON.stringify(data));
}

const CREW_COLORS = [
  '#9333EA', '#DC2626', '#2563EB', '#16A34A', '#D97706', '#DB2777',
  '#0891B2', '#7C3AED', '#CA8A04', '#475569'
];

export default function TerritoryMapView({ playerData, crewData }) {
  const queryClient = useQueryClient();
  const [cooldowns, setCooldowns] = useState(getCooldowns);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const { data: allTerritories = [] } = useQuery({
    queryKey: ['allTerritories'],
    queryFn: () => base44.entities.Territory.list('-created_date', 50),
    refetchInterval: 30000
  });

  const { data: allCrews = [] } = useQuery({
    queryKey: ['allCrews'],
    queryFn: () => base44.entities.Crew.list('-reputation', 20),
    staleTime: 60000
  });

  // Build a crew → color map
  const crewColorMap = {};
  allCrews.forEach((crew, i) => {
    crewColorMap[crew.id] = crew.color || CREW_COLORS[i % CREW_COLORS.length];
  });

  // Build full map grid: 20 blocks
  const mapBlocks = BLOCK_NAMES.map((name, i) => {
    const territory = allTerritories.find(t => t.name === name);
    return territory || {
      id: `unclaimed_${i}`,
      name,
      controlling_crew_id: null,
      is_contested: false,
      control_percentage: 0,
      revenue_multiplier: 1,
      resource_type: ['financial', 'industrial', 'tactical', 'residential'][i % 4],
      unclaimed: true
    };
  });

  const myTerritories = allTerritories.filter(t => t.controlling_crew_id === playerData?.crew_id);
  const dailyIncome = myTerritories.length * INCOME_PER_TERRITORY;

  const claimTerritoryMutation = useMutation({
    mutationFn: async (block) => {
      if (!playerData?.crew_id) throw new Error('Join a crew first');
      const cd = getCooldowns();
      if (cd[block.name] && Date.now() < cd[block.name]) {
        const remaining = Math.ceil((cd[block.name] - Date.now()) / 60000);
        throw new Error(`On cooldown: ${remaining}min remaining`);
      }
      if (!block.unclaimed) throw new Error('Use Attack Territory for claimed land');

      const territory = await base44.entities.Territory.create({
        name: block.name,
        controlling_crew_id: playerData.crew_id,
        control_percentage: 100,
        revenue_multiplier: 1 + Math.random() * 0.5,
        resource_type: block.resource_type,
        is_contested: false
      });
      await base44.entities.Player.update(playerData.id, {
        territory_count: (playerData.territory_count || 0) + 1
      });
      return territory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allTerritories']);
      queryClient.invalidateQueries(['player']);
      toast.success('Territory claimed!');
      setSelectedBlock(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const attackMutation = useMutation({
    mutationFn: async (block) => {
      if (!playerData?.crew_id) throw new Error('Join a crew first');
      if (block.controlling_crew_id === playerData.crew_id) throw new Error('You already own this territory');
      const cd = getCooldowns();
      if (cd[block.name] && Date.now() < cd[block.name]) {
        const remaining = Math.ceil((cd[block.name] - Date.now()) / 60000);
        throw new Error(`Cooldown: ${remaining}min remaining`);
      }

      const success = Math.random() < 0.5 + (playerData.strength_score || 10) / 200;
      // Set 2-hour cooldown
      const updated = { ...cd, [block.name]: Date.now() + 7200000 };
      saveCooldowns(updated);
      setCooldowns(updated);

      if (success) {
        await base44.entities.Territory.update(block.id, {
          controlling_crew_id: playerData.crew_id,
          control_percentage: 100,
          is_contested: false
        });
        await base44.entities.Player.update(playerData.id, {
          territory_count: (playerData.territory_count || 0) + 1
        });
        return { success: true };
      } else {
        return { success: false };
      }
    },
    onSuccess: ({ success }) => {
      queryClient.invalidateQueries(['allTerritories']);
      queryClient.invalidateQueries(['player']);
      if (success) toast.success('Territory captured! 2hr recapture cooldown set.');
      else toast.error('Attack failed! Territory defended. Try again in 2 hours.');
      setSelectedBlock(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const claimIncomeMutation = useMutation({
    mutationFn: async () => {
      if (myTerritories.length === 0) throw new Error('No territories owned');
      const lastClaim = localStorage.getItem('territory_income_claimed');
      if (lastClaim && Date.now() - parseInt(lastClaim) < 3600000) {
        throw new Error('Income already collected this hour');
      }
      const income = myTerritories.length * Math.floor(INCOME_PER_TERRITORY / 24);
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + income,
        total_earnings: (playerData.total_earnings || 0) + income
      });
      localStorage.setItem('territory_income_claimed', Date.now().toString());
      return income;
    },
    onSuccess: (income) => {
      queryClient.invalidateQueries(['player']);
      toast.success(`Collected $${income.toLocaleString()} territory income!`);
    },
    onError: (err) => toast.error(err.message)
  });

  function getBlockColor(block) {
    if (!block.controlling_crew_id) return '#374151'; // unclaimed gray
    if (block.controlling_crew_id === playerData?.crew_id) return '#7C3AED'; // own = purple
    return crewColorMap[block.controlling_crew_id] || '#DC2626';
  }

  function getCooldownRemaining(blockName) {
    const cd = cooldowns[blockName];
    if (!cd || Date.now() >= cd) return null;
    return Math.ceil((cd - Date.now()) / 60000);
  }

  return (
    <div className="space-y-4">
      {/* Income Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/30 text-center">
          <MapPin className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{myTerritories.length}</p>
          <p className="text-xs text-gray-400">Territories</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-900/40 to-orange-900/20 border border-yellow-500/30 text-center">
          <DollarSign className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">${dailyIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Daily Passive</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-900/40 to-blue-900/20 border border-cyan-500/30 text-center">
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-xs"
            onClick={() => claimIncomeMutation.mutate()}
            disabled={claimIncomeMutation.isPending || myTerritories.length === 0}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Collect Income
          </Button>
          <p className="text-xs text-gray-400 mt-1">Hourly collection</p>
        </div>
      </div>

      {/* Map Grid */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="w-5 h-5 text-purple-400" />
            City Territory Map
            <div className="ml-auto flex gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-600 inline-block" /> Your Crew</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block" /> Enemy</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600 inline-block" /> Unclaimed</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
            {mapBlocks.map((block, i) => {
              const color = getBlockColor(block);
              const isOwned = block.controlling_crew_id === playerData?.crew_id;
              const cdMins = getCooldownRemaining(block.name);
              const isSelected = selectedBlock?.name === block.name;

              return (
                <button
                  key={block.name}
                  onClick={() => setSelectedBlock(isSelected ? null : block)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all hover:scale-105 ${
                    isSelected ? 'ring-2 ring-white scale-105' : ''
                  } ${block.is_contested ? 'animate-pulse' : ''}`}
                  style={{
                    borderColor: color + '60',
                    backgroundColor: color + '30',
                    color: isOwned ? '#c4b5fd' : '#9ca3af'
                  }}
                >
                  <div className="truncate">{block.name.split(' ')[0]}</div>
                  {cdMins && <div className="text-orange-400 text-[10px]">⏱ {cdMins}m</div>}
                  {block.is_contested && <div className="text-red-400 text-[10px]">⚔️</div>}
                  {isOwned && <div className="text-purple-300 text-[10px]">★</div>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Block Detail */}
      {selectedBlock && (
        <Card className="glass-panel border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-bold">{selectedBlock.name}</h3>
                <p className="text-xs text-gray-400 capitalize">{selectedBlock.resource_type} district</p>
              </div>
              <div className="text-right">
                {selectedBlock.unclaimed ? (
                  <Badge className="bg-gray-600">Unclaimed</Badge>
                ) : selectedBlock.controlling_crew_id === playerData?.crew_id ? (
                  <Badge className="bg-purple-700">Your Territory</Badge>
                ) : (
                  <Badge className="bg-red-700">Enemy Territory</Badge>
                )}
              </div>
            </div>

            {!selectedBlock.unclaimed && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Control</span>
                  <span>{selectedBlock.control_percentage || 0}%</span>
                </div>
                <Progress value={selectedBlock.control_percentage || 0} className="h-2" />
              </div>
            )}

            <div className="flex gap-2 flex-wrap text-xs text-gray-400 mb-4">
              <span><TrendingUp className="w-3 h-3 inline mr-1" />{(selectedBlock.revenue_multiplier || 1).toFixed(1)}x revenue</span>
              <span><DollarSign className="w-3 h-3 inline mr-1" />+${INCOME_PER_TERRITORY.toLocaleString()}/day if owned</span>
            </div>

            <div className="flex gap-2">
              {selectedBlock.unclaimed && (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600"
                  onClick={() => claimTerritoryMutation.mutate(selectedBlock)}
                  disabled={claimTerritoryMutation.isPending || !playerData?.crew_id}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  Claim Territory
                </Button>
              )}
              {!selectedBlock.unclaimed && selectedBlock.controlling_crew_id !== playerData?.crew_id && (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600"
                  onClick={() => attackMutation.mutate(selectedBlock)}
                  disabled={attackMutation.isPending || !!getCooldownRemaining(selectedBlock.name) || !playerData?.crew_id}
                >
                  <Swords className="w-3 h-3 mr-1" />
                  {getCooldownRemaining(selectedBlock.name)
                    ? `Cooldown: ${getCooldownRemaining(selectedBlock.name)}m`
                    : 'Attack Territory'}
                </Button>
              )}
              {!selectedBlock.unclaimed && selectedBlock.controlling_crew_id === playerData?.crew_id && (
                <div className="flex-1 text-center text-xs text-purple-400 py-2">
                  You control this territory. Earn ${(INCOME_PER_TERRITORY / 24).toFixed(0)}/hr passive.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}