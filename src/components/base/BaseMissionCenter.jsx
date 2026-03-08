import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Target, Zap, Clock, DollarSign, Shield, Lock, Star, 
  Play, ChevronRight, AlertTriangle, Trophy, Crosshair
} from 'lucide-react';
import { toast } from 'sonner';

const BASE_MISSION_TYPES = [
  {
    id: 'heist_planning',
    name: 'Heist Planning Session',
    description: 'Use your Intelligence Center to plan the perfect heist',
    requiredFacility: 'intelligence',
    reward: { crypto: 8000, xp: 250 },
    duration: 45,
    risk: 'medium',
    icon: Target,
    color: 'blue',
    threat: 30
  },
  {
    id: 'arms_deal',
    name: 'Arms Manufacturing Run',
    description: 'Use your Workshop to produce weapons for a client',
    requiredFacility: 'workshop',
    reward: { crypto: 12000, xp: 350 },
    duration: 90,
    risk: 'high',
    icon: Crosshair,
    color: 'red',
    threat: 60
  },
  {
    id: 'black_market_supply',
    name: 'Black Market Supply Op',
    description: 'Move contraband through your Storage Vault',
    requiredFacility: 'storage',
    reward: { crypto: 6000, xp: 180 },
    duration: 30,
    risk: 'low',
    icon: Lock,
    color: 'purple',
    threat: 15
  },
  {
    id: 'research_mission',
    name: 'Research & Development',
    description: 'Lab-based synthesis creates rare chemical products',
    requiredFacility: 'laboratory',
    reward: { crypto: 15000, xp: 500 },
    duration: 120,
    risk: 'high',
    icon: Zap,
    color: 'yellow',
    threat: 70
  },
  {
    id: 'defense_contract',
    name: 'Security Contract',
    description: 'Your Armory enables profitable protection contracts',
    requiredFacility: 'armory',
    reward: { crypto: 10000, xp: 300 },
    duration: 60,
    risk: 'medium',
    icon: Shield,
    color: 'green',
    threat: 40
  },
  {
    id: 'medical_ops',
    name: 'Medical Facility Op',
    description: 'Underground medical services for criminal organizations',
    requiredFacility: 'medical',
    reward: { crypto: 7500, xp: 220 },
    duration: 50,
    risk: 'low',
    icon: Star,
    color: 'pink',
    threat: 20
  }
];

const riskColors = { low: 'text-green-400', medium: 'text-yellow-400', high: 'text-red-400' };
const facilityColors = {
  blue: 'border-blue-500/30 bg-blue-900/10',
  red: 'border-red-500/30 bg-red-900/10',
  purple: 'border-purple-500/30 bg-purple-900/10',
  yellow: 'border-yellow-500/30 bg-yellow-900/10',
  green: 'border-green-500/30 bg-green-900/10',
  pink: 'border-pink-500/30 bg-pink-900/10'
};

export default function BaseMissionCenter({ currentBase, baseFacilities = [], playerData }) {
  const queryClient = useQueryClient();
  const [activeMissions, setActiveMissions] = useState({});
  const [missionProgress, setMissionProgress] = useState({});

  const installedTypes = baseFacilities.map(f => f.facility_type);

  const startMissionMutation = useMutation({
    mutationFn: async (mission) => {
      if (!installedTypes.includes(mission.requiredFacility)) {
        throw new Error(`Requires ${mission.requiredFacility} facility`);
      }

      const missionRecord = await base44.entities.Mission.create({
        title: mission.name,
        description: mission.description,
        mission_type: 'base_operation',
        difficulty: mission.risk,
        status: 'active',
        reward_crypto: mission.reward.crypto,
        reward_experience: mission.reward.xp,
        base_id: currentBase.id,
        player_id: playerData.id,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + mission.duration * 60000).toISOString()
      });

      // Simulate progress
      setActiveMissions(prev => ({ ...prev, [mission.id]: { ...mission, dbId: missionRecord.id, startTime: Date.now() } }));
      setMissionProgress(prev => ({ ...prev, [mission.id]: 0 }));

      const interval = setInterval(() => {
        setMissionProgress(prev => {
          const current = (prev[mission.id] || 0) + (100 / (mission.duration * 2));
          if (current >= 100) {
            clearInterval(interval);
            return { ...prev, [mission.id]: 100 };
          }
          return { ...prev, [mission.id]: current };
        });
      }, 500);

      return missionRecord;
    },
    onSuccess: (_, mission) => {
      toast.success(`${mission.name} started!`);
      queryClient.invalidateQueries(['missions']);
    },
    onError: (err) => toast.error(err.message)
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (mission) => {
      const activeMission = activeMissions[mission.id];
      if (!activeMission) return;

      // Check if base heat triggers LE response
      const heatRisk = mission.threat > 50 && Math.random() < 0.3;
      if (heatRisk) {
        await base44.entities.BaseLERaid.create({
          base_id: currentBase.id,
          player_id: playerData.id,
          trigger_heat: mission.threat,
          units_deployed: Math.floor(mission.threat / 20),
          raid_status: 'planning'
        });
        toast.warning('Mission complete — but LE has been alerted to your base!');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + mission.reward.crypto,
        experience: (playerData.experience || 0) + mission.reward.xp
      });

      if (activeMission.dbId) {
        await base44.entities.Mission.update(activeMission.dbId, { status: 'completed' });
      }

      setActiveMissions(prev => {
        const next = { ...prev };
        delete next[mission.id];
        return next;
      });
      setMissionProgress(prev => {
        const next = { ...prev };
        delete next[mission.id];
        return next;
      });

      return mission.reward;
    },
    onSuccess: (reward, mission) => {
      if (reward) toast.success(`+$${reward.crypto.toLocaleString()} earned!`);
      queryClient.invalidateQueries(['player']);
    },
    onError: (err) => toast.error(err.message)
  });

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-bold">Base Mission Center</h3>
        </div>
        <p className="text-gray-400 text-sm">Host exclusive missions from your base. Installed facilities unlock new operation types.</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Badge className="bg-slate-700 text-gray-300">
            {installedTypes.length} Facilities Active
          </Badge>
          <Badge className="bg-blue-700">
            {BASE_MISSION_TYPES.filter(m => installedTypes.includes(m.requiredFacility)).length} Missions Unlocked
          </Badge>
          {Object.keys(activeMissions).length > 0 && (
            <Badge className="bg-green-700 animate-pulse">
              {Object.keys(activeMissions).length} Active
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BASE_MISSION_TYPES.map((mission) => {
          const Icon = mission.icon;
          const isUnlocked = installedTypes.includes(mission.requiredFacility);
          const isActive = !!activeMissions[mission.id];
          const progress = missionProgress[mission.id] || 0;
          const isComplete = progress >= 100;

          return (
            <div
              key={mission.id}
              className={`p-4 rounded-xl border transition-all ${
                isUnlocked 
                  ? facilityColors[mission.color] 
                  : 'border-gray-700/30 bg-gray-900/20 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${isUnlocked ? 'bg-gradient-to-br from-purple-600 to-cyan-600' : 'bg-gray-700'}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-semibold text-sm">{mission.name}</h4>
                    {!isUnlocked && <Lock className="w-3 h-3 text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{mission.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="text-center">
                  <p className="text-gray-500">Reward</p>
                  <p className="text-yellow-400 font-bold">${(mission.reward.crypto / 1000).toFixed(0)}k</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Duration</p>
                  <p className="text-cyan-400 font-bold">{mission.duration}m</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Risk</p>
                  <p className={`font-bold capitalize ${riskColors[mission.risk]}`}>{mission.risk}</p>
                </div>
              </div>

              {!isUnlocked ? (
                <div className="text-center py-1">
                  <p className="text-xs text-gray-500">Requires: <span className="text-gray-300 capitalize">{mission.requiredFacility}</span></p>
                </div>
              ) : isActive ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{isComplete ? 'Ready to claim!' : 'In Progress...'}</span>
                    <span className="text-cyan-400">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {isComplete && (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
                      onClick={() => claimRewardMutation.mutate(mission)}
                      disabled={claimRewardMutation.isPending}
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      Claim ${mission.reward.crypto.toLocaleString()}
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                  onClick={() => startMissionMutation.mutate(mission)}
                  disabled={startMissionMutation.isPending}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Launch Mission
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}