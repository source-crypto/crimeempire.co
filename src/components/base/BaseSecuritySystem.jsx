import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Shield, AlertTriangle, Eye, Lock, Radio, Zap, 
  Bell, CheckCircle, XCircle, Crosshair, Activity,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const SECURITY_SYSTEMS = [
  {
    id: 'perimeter_sensors',
    name: 'Perimeter Sensors',
    description: 'Detect approaching threats up to 500m',
    cost: 18000,
    defense_bonus: 20,
    alert_speed: 'instant',
    icon: Radio,
    color: 'blue'
  },
  {
    id: 'ai_turrets',
    name: 'AI Auto-Turrets',
    description: 'Automated defense against rival player raids',
    cost: 45000,
    defense_bonus: 40,
    alert_speed: 'auto-response',
    icon: Crosshair,
    color: 'red'
  },
  {
    id: 'emp_field',
    name: 'EMP Defense Field',
    description: 'Disables attacker electronics during breach',
    cost: 35000,
    defense_bonus: 30,
    alert_speed: 'on-breach',
    icon: Zap,
    color: 'yellow'
  },
  {
    id: 'panic_room',
    name: 'Panic Room',
    description: 'Secure vault protects 50% of assets during raids',
    cost: 55000,
    defense_bonus: 50,
    alert_speed: 'passive',
    icon: Lock,
    color: 'purple'
  },
  {
    id: 'counter_intel',
    name: 'Counter-Intelligence',
    description: 'Blocks enemy reconnaissance and spy drones',
    cost: 28000,
    defense_bonus: 25,
    alert_speed: 'passive',
    icon: Eye,
    color: 'green'
  },
  {
    id: 'alarm_network',
    name: 'Alarm Network',
    description: 'Instant alerts when security is breached',
    cost: 12000,
    defense_bonus: 10,
    alert_speed: 'instant',
    icon: Bell,
    color: 'orange'
  }
];

const THREAT_EVENTS = [
  { id: 'rival_scout', name: 'Rival Scout Detected', severity: 'low', description: 'Enemy player performing reconnaissance on your base' },
  { id: 'le_patrol', name: 'LE Patrol Nearby', severity: 'medium', description: 'Law enforcement patrol has been spotted near your perimeter' },
  { id: 'rival_raid', name: 'Rival Raid Attempt', severity: 'high', description: 'Enemy player is attempting to breach your base' },
  { id: 'le_raid', name: 'Law Enforcement Raid', severity: 'critical', description: 'Full LE raid underway — all defenses engaged!' }
];

const severityColors = {
  low: 'border-yellow-500/40 bg-yellow-900/10 text-yellow-400',
  medium: 'border-orange-500/40 bg-orange-900/10 text-orange-400',
  high: 'border-red-500/40 bg-red-900/10 text-red-400',
  critical: 'border-red-700/60 bg-red-900/30 text-red-300'
};

export default function BaseSecuritySystem({ currentBase, playerData }) {
  const queryClient = useQueryClient();
  const [alertMode, setAlertMode] = useState('standby'); // standby, elevated, lockdown
  const [activeThreats, setActiveThreats] = useState([]);
  const [expandedSystem, setExpandedSystem] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const { data: baseDefense = {} } = useQuery({
    queryKey: ['baseDefense', currentBase?.id],
    queryFn: async () => {
      const defenses = await base44.entities.BaseDefense.filter({ base_id: currentBase.id });
      return defenses[0] || {};
    },
    enabled: !!currentBase?.id
  });

  const { data: leRaids = [] } = useQuery({
    queryKey: ['baseLERaids', currentBase?.id],
    queryFn: () => base44.entities.BaseLERaid.filter({ base_id: currentBase.id }),
    enabled: !!currentBase?.id
  });

  const installedSystems = baseDefense.security_systems || [];

  const installSystemMutation = useMutation({
    mutationFn: async (system) => {
      if (playerData.crypto_balance < system.cost) {
        throw new Error('Insufficient funds');
      }

      const newSystems = [...installedSystems, system.id];
      const newDefenseRating = Math.min(100, (baseDefense.defense_rating || 0) + system.defense_bonus);

      if (baseDefense.id) {
        await base44.entities.BaseDefense.update(baseDefense.id, {
          security_systems: newSystems,
          defense_rating: newDefenseRating
        });
      } else {
        await base44.entities.BaseDefense.create({
          base_id: currentBase.id,
          player_id: playerData.id,
          security_systems: newSystems,
          defense_rating: newDefenseRating,
          guard_count: 2
        });
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - system.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseDefense']);
      queryClient.invalidateQueries(['player']);
      toast.success('Security system installed!');
    },
    onError: (err) => toast.error(err.message)
  });

  const simulateThreatMutation = useMutation({
    mutationFn: async (threat) => {
      const defenseRating = baseDefense.defense_rating || 0;
      const severityMap = { low: 20, medium: 40, high: 70, critical: 90 };
      const threatStrength = severityMap[threat.severity];
      const defended = defenseRating >= threatStrength;

      const raid = await base44.entities.BaseLERaid.create({
        base_id: currentBase.id,
        player_id: playerData.id,
        raid_status: 'concluded',
        trigger_heat: threatStrength,
        units_deployed: Math.floor(threatStrength / 15),
        defense_effectiveness: defenseRating,
        estimated_outcome: defended ? 'resistance' : 'success',
        concluded_at: new Date().toISOString()
      });

      if (!defended) {
        // Assets seized — reduce player balance slightly
        const seized = Math.floor(playerData.crypto_balance * 0.05);
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: Math.max(0, playerData.crypto_balance - seized)
        });
        toast.error(`${threat.name}: Defense failed! $${seized.toLocaleString()} seized.`);
      } else {
        toast.success(`${threat.name}: Threat neutralized by your defenses!`);
      }

      setActiveThreats(prev => [
        ...prev, 
        { ...threat, defended, time: new Date().toLocaleTimeString(), id: Math.random() }
      ].slice(-5));

      return { defended, raid };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseLERaids']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const setAlertLevelMutation = useMutation({
    mutationFn: async (level) => {
      const costMap = { standby: 0, elevated: 2000, lockdown: 8000 };
      const cost = costMap[level];

      if (cost > 0 && playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds for this alert level');
      }

      if (cost > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance - cost
        });
      }

      setAlertMode(level);
    },
    onSuccess: (_, level) => {
      queryClient.invalidateQueries(['player']);
      toast.success(`Security status: ${level.toUpperCase()}`);
    },
    onError: (err) => toast.error(err.message)
  });

  const defenseRating = baseDefense.defense_rating || 0;
  const alertColors = {
    standby: 'bg-green-700',
    elevated: 'bg-yellow-700',
    lockdown: 'bg-red-700 animate-pulse'
  };

  return (
    <div className="space-y-4">
      {/* Alert Status Panel */}
      <div className="p-4 rounded-xl border border-slate-600/30 bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-bold">Security Status</span>
            <Badge className={alertColors[alertMode]}>
              {alertMode.toUpperCase()}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Defense Rating</p>
            <p className="text-lg font-bold text-cyan-400">{Math.round(defenseRating)}%</p>
          </div>
        </div>

        <Progress value={defenseRating} className="h-3 mb-3" />

        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="text-center p-2 rounded bg-black/20">
            <p className="text-gray-400">Systems</p>
            <p className="text-white font-bold">{installedSystems.length}</p>
          </div>
          <div className="text-center p-2 rounded bg-black/20">
            <p className="text-gray-400">Guards</p>
            <p className="text-white font-bold">{baseDefense.guard_count || 0}</p>
          </div>
          <div className="text-center p-2 rounded bg-black/20">
            <p className="text-gray-400">Raids Stopped</p>
            <p className="text-green-400 font-bold">{leRaids.filter(r => r.estimated_outcome === 'resistance').length}</p>
          </div>
        </div>

        {/* Alert Level Controls */}
        <div className="flex gap-2">
          {['standby', 'elevated', 'lockdown'].map(level => (
            <Button
              key={level}
              size="sm"
              variant={alertMode === level ? 'default' : 'outline'}
              className={`flex-1 text-xs capitalize ${
                alertMode === level 
                  ? level === 'lockdown' ? 'bg-red-700' : level === 'elevated' ? 'bg-yellow-700' : 'bg-green-700'
                  : 'border-gray-600 text-gray-400 hover:text-white'
              }`}
              onClick={() => setAlertLevelMutation.mutate(level)}
              disabled={alertMode === level}
            >
              {level === 'elevated' ? '⚠️' : level === 'lockdown' ? '🔴' : '🟢'}
              {' '}{level}
            </Button>
          ))}
        </div>
      </div>

      {/* Security Systems */}
      <div>
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400" />
          Security Systems
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SECURITY_SYSTEMS.map((system) => {
            const Icon = system.icon;
            const isInstalled = installedSystems.includes(system.id);

            return (
              <div
                key={system.id}
                className={`p-3 rounded-xl border transition-all ${
                  isInstalled 
                    ? 'border-green-500/40 bg-green-900/10' 
                    : 'border-gray-600/30 bg-slate-900/30'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={`p-1.5 rounded-lg ${isInstalled ? 'bg-green-700' : 'bg-gray-700'}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-semibold">{system.name}</p>
                      {isInstalled && <CheckCircle className="w-3 h-3 text-green-400" />}
                    </div>
                    <p className="text-xs text-gray-400">{system.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge className="bg-slate-700 text-xs">+{system.defense_bonus}% def</Badge>
                    <Badge className="bg-slate-700 text-xs">{system.alert_speed}</Badge>
                  </div>
                  {isInstalled ? (
                    <Badge className="bg-green-700">Active</Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-purple-700 hover:bg-purple-600 text-xs"
                      onClick={() => installSystemMutation.mutate(system)}
                      disabled={installSystemMutation.isPending || playerData.crypto_balance < system.cost}
                    >
                      ${(system.cost / 1000).toFixed(0)}k
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Threat Simulator */}
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-900/5">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowSimulator(!showSimulator)}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-white font-semibold text-sm">Threat Simulator</span>
            <Badge className="bg-red-900 text-red-300 text-xs">Test Defenses</Badge>
          </div>
          {showSimulator ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>

        {showSimulator && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-400">Trigger simulated attacks to test your security systems. Real consequences apply!</p>
            <div className="grid grid-cols-1 gap-2">
              {THREAT_EVENTS.map((threat) => (
                <div key={threat.id} className={`p-3 rounded-lg border ${severityColors[threat.severity].split(' ').slice(0, 2).join(' ')}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${severityColors[threat.severity].split(' ')[2]}`}>{threat.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{threat.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`ml-3 border-current text-xs ${severityColors[threat.severity].split(' ')[2]}`}
                      onClick={() => simulateThreatMutation.mutate(threat)}
                      disabled={simulateThreatMutation.isPending}
                    >
                      Simulate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Threat Log */}
      {activeThreats.length > 0 && (
        <div className="p-3 rounded-xl border border-slate-600/30 bg-slate-900/30">
          <h4 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Recent Threat Log
          </h4>
          <div className="space-y-1">
            {activeThreats.slice().reverse().map((threat, i) => (
              <div key={threat.id} className="flex items-center justify-between p-2 rounded bg-black/20 text-xs">
                <span className="text-gray-300">{threat.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{threat.time}</span>
                  {threat.defended 
                    ? <CheckCircle className="w-3 h-3 text-green-400" />
                    : <XCircle className="w-3 h-3 text-red-400" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}