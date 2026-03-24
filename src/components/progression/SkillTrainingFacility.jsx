import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Clock, Zap, Shield, Car, DollarSign, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

const SKILL_TREES = [
  {
    id: 'hacking',
    label: 'Hacking',
    icon: Brain,
    color: 'green',
    colorClass: 'border-green-500/30 bg-green-900/10',
    badgeClass: 'bg-green-700',
    levels: [
      { level: 1, cost_sp: 1, cost_crypto: 2000, hours: 1, buff: '+10% mission payout from intel ops', stat: 'hacking' },
      { level: 2, cost_sp: 2, cost_crypto: 8000, hours: 4, buff: '+20% heist bypass success', stat: 'hacking' },
      { level: 3, cost_sp: 3, cost_crypto: 20000, hours: 12, buff: '+35% hacking missions & -20% LE detection', stat: 'hacking' },
      { level: 4, cost_sp: 5, cost_crypto: 50000, hours: 24, buff: '+50% all digital operations', stat: 'hacking' },
    ]
  },
  {
    id: 'combat',
    label: 'Combat',
    icon: Shield,
    color: 'red',
    colorClass: 'border-red-500/30 bg-red-900/10',
    badgeClass: 'bg-red-700',
    levels: [
      { level: 1, cost_sp: 1, cost_crypto: 3000, hours: 2, buff: '+10% strength score', stat: 'combat' },
      { level: 2, cost_sp: 2, cost_crypto: 10000, hours: 6, buff: '+20% PvP battle win rate', stat: 'combat' },
      { level: 3, cost_sp: 3, cost_crypto: 25000, hours: 18, buff: '+30% raid defense & +15% attack power', stat: 'combat' },
      { level: 4, cost_sp: 5, cost_crypto: 60000, hours: 48, buff: '+50% combat, unlock elite crew role', stat: 'combat' },
    ]
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    icon: DollarSign,
    color: 'yellow',
    colorClass: 'border-yellow-500/30 bg-yellow-900/10',
    badgeClass: 'bg-yellow-700',
    levels: [
      { level: 1, cost_sp: 1, cost_crypto: 2500, hours: 1, buff: '+10% black market buy price discount', stat: 'negotiation' },
      { level: 2, cost_sp: 2, cost_crypto: 9000, hours: 5, buff: '+20% trade deal payouts', stat: 'negotiation' },
      { level: 3, cost_sp: 3, cost_crypto: 22000, hours: 14, buff: '+30% faction diplomacy success', stat: 'negotiation' },
      { level: 4, cost_sp: 5, cost_crypto: 55000, hours: 36, buff: '+50% all deal values & crew income share', stat: 'negotiation' },
    ]
  },
  {
    id: 'stealth',
    label: 'Stealth',
    icon: Zap,
    color: 'purple',
    colorClass: 'border-purple-500/30 bg-purple-900/10',
    badgeClass: 'bg-purple-700',
    levels: [
      { level: 1, cost_sp: 1, cost_crypto: 2000, hours: 1, buff: '-10% wanted level gain per mission', stat: 'stealth' },
      { level: 2, cost_sp: 2, cost_crypto: 8000, hours: 4, buff: '+20% heist stealth success rate', stat: 'stealth' },
      { level: 3, cost_sp: 3, cost_crypto: 20000, hours: 12, buff: '+35% smuggling success, -30% LE attention', stat: 'stealth' },
      { level: 4, cost_sp: 5, cost_crypto: 50000, hours: 24, buff: '+50% stealth, near-invisible to authorities', stat: 'stealth' },
    ]
  },
  {
    id: 'driving',
    label: 'Driving',
    icon: Car,
    color: 'cyan',
    colorClass: 'border-cyan-500/30 bg-cyan-900/10',
    badgeClass: 'bg-cyan-700',
    levels: [
      { level: 1, cost_sp: 1, cost_crypto: 1500, hours: 1, buff: '+15% escape mission success rate', stat: 'driving' },
      { level: 2, cost_sp: 2, cost_crypto: 6000, hours: 3, buff: '+25% vehicle performance in heists', stat: 'driving' },
      { level: 3, cost_sp: 3, cost_crypto: 15000, hours: 10, buff: '+40% delivery & transport mission rewards', stat: 'driving' },
      { level: 4, cost_sp: 5, cost_crypto: 40000, hours: 20, buff: '+60% vehicle stats, unlock getaway specialist', stat: 'driving' },
    ]
  },
  {
    id: 'leadership',
    label: 'Leadership',
    icon: Users,
    color: 'orange',
    colorClass: 'border-orange-500/30 bg-orange-900/10',
    badgeClass: 'bg-orange-700',
    levels: [
      { level: 1, cost_sp: 1, cost_crypto: 3000, hours: 2, buff: '+10% crew mission rewards', stat: 'leadership' },
      { level: 2, cost_sp: 2, cost_crypto: 10000, hours: 6, buff: '+20% crew member efficiency', stat: 'leadership' },
      { level: 3, cost_sp: 3, cost_crypto: 25000, hours: 16, buff: '+30% territory income & crew reputation', stat: 'leadership' },
      { level: 4, cost_sp: 5, cost_crypto: 65000, hours: 48, buff: '+50% crew stats, unlock boss abilities', stat: 'leadership' },
    ]
  }
];

function getActiveTrainings() {
  try { return JSON.parse(localStorage.getItem('skill_trainings') || '{}'); } catch { return {}; }
}

function saveTrainings(data) {
  localStorage.setItem('skill_trainings', JSON.stringify(data));
}

export default function SkillTrainingFacility({ playerData }) {
  const queryClient = useQueryClient();
  const [trainings, setTrainings] = useState(getActiveTrainings);
  const [selected, setSelected] = useState(SKILL_TREES[0].id);

  const tree = SKILL_TREES.find(t => t.id === selected);
  const currentSkillLevel = playerData?.skills?.[selected] || 0;

  function getTrainingStatus(skillId) {
    const t = trainings[skillId];
    if (!t) return null;
    const elapsed = Date.now() - t.startedAt;
    const totalMs = t.hours * 3600000;
    const done = elapsed >= totalMs;
    return { ...t, done, progress: Math.min(100, (elapsed / totalMs) * 100) };
  }

  const startTraining = useMutation({
    mutationFn: async ({ tree, levelDef }) => {
      if ((playerData.skill_points || 0) < levelDef.cost_sp) throw new Error('Not enough skill points');
      if ((playerData.crypto_balance || 0) < levelDef.cost_crypto) throw new Error('Not enough crypto');
      if (trainings[tree.id] && !trainings[tree.id].done) throw new Error('Training already in progress');

      await base44.entities.Player.update(playerData.id, {
        skill_points: playerData.skill_points - levelDef.cost_sp,
        crypto_balance: playerData.crypto_balance - levelDef.cost_crypto
      });

      const updated = {
        ...trainings,
        [tree.id]: {
          skillId: tree.id,
          level: levelDef.level,
          hours: levelDef.hours,
          buff: levelDef.buff,
          stat: levelDef.stat,
          startedAt: Date.now()
        }
      };
      saveTrainings(updated);
      setTrainings(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
      toast.success('Training started! Check back when complete.');
    },
    onError: (err) => toast.error(err.message)
  });

  const claimTraining = useMutation({
    mutationFn: async ({ tree, training }) => {
      const currentSkills = playerData.skills || {};
      await base44.entities.Player.update(playerData.id, {
        skills: { ...currentSkills, [tree.id]: training.level }
      });
      const updated = { ...trainings };
      delete updated[tree.id];
      saveTrainings(updated);
      setTrainings(updated);
    },
    onSuccess: (_, { tree, training }) => {
      queryClient.invalidateQueries(['player']);
      toast.success(`${tree.label} Level ${training.level} unlocked! ${training.buff}`);
    },
    onError: (err) => toast.error(err.message)
  });

  function formatTime(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m remaining`;
    return `${m}m remaining`;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-cyan-900/20 border border-purple-500/30">
        <p className="text-white font-semibold mb-1">🏋️ Skill Training Facility</p>
        <p className="text-gray-400 text-sm">Invest skill points and crypto to permanently upgrade your abilities. Higher levels require longer training periods.</p>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-purple-400">SP Available: <strong className="text-white">{playerData?.skill_points || 0}</strong></span>
          <span className="text-yellow-400">Crypto: <strong className="text-white">${(playerData?.crypto_balance || 0).toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Tree Selector */}
      <div className="flex gap-2 flex-wrap">
        {SKILL_TREES.map(t => {
          const Icon = t.icon;
          const status = getTrainingStatus(t.id);
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 relative ${
                selected === t.id ? t.colorClass + ' ' + 'border-opacity-80' : 'border-gray-600/30 bg-slate-900/40 text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {status && !status.done && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              )}
              {status?.done && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Training Status */}
      {(() => {
        const status = getTrainingStatus(tree.id);
        if (!status) return null;
        const remaining = Math.max(0, status.startedAt + status.hours * 3600000 - Date.now());
        return (
          <div className={`p-4 rounded-xl border ${tree.colorClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Training: {tree.label} Level {status.level}
              </span>
              {status.done ? (
                <Badge className="bg-green-700 animate-pulse">Ready to Claim!</Badge>
              ) : (
                <span className="text-xs text-gray-400">{formatTime(remaining)}</span>
              )}
            </div>
            <Progress value={status.progress} className="h-2 mb-2" />
            <p className="text-xs text-gray-400">{status.buff}</p>
            {status.done && (
              <Button
                size="sm"
                className="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={() => claimTraining.mutate({ tree, training: status })}
                disabled={claimTraining.isPending}
              >
                Claim Training Reward
              </Button>
            )}
          </div>
        );
      })()}

      {/* Level List */}
      <div className="space-y-3">
        {tree.levels.map((lvl) => {
          const trained = currentSkillLevel >= lvl.level;
          const isNext = currentSkillLevel === lvl.level - 1;
          const training = getTrainingStatus(tree.id);
          const isTraining = training && !training.done && training.level === lvl.level;
          const locked = !isNext && !trained;

          return (
            <div
              key={lvl.level}
              className={`p-4 rounded-xl border transition-all ${
                trained ? 'border-green-500/40 bg-green-900/10' :
                isNext ? tree.colorClass :
                'border-gray-700/30 bg-gray-900/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={trained ? 'bg-green-700' : tree.badgeClass}>Level {lvl.level}</Badge>
                    {trained && <Badge className="bg-green-800 text-green-200 text-xs">✓ Unlocked</Badge>}
                    {isTraining && <Badge className="bg-yellow-700 text-xs animate-pulse">Training...</Badge>}
                    {locked && <Lock className="w-3 h-3 text-gray-500" />}
                  </div>
                  <p className="text-white text-sm font-medium">{lvl.buff}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>⚡ {lvl.cost_sp} SP</span>
                    <span>💰 ${lvl.cost_crypto.toLocaleString()}</span>
                    <span><Clock className="w-3 h-3 inline" /> {lvl.hours}h training</span>
                  </div>
                </div>
                {isNext && !training && (
                  <Button
                    size="sm"
                    className={`ml-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-xs`}
                    onClick={() => startTraining.mutate({ tree, levelDef: lvl })}
                    disabled={startTraining.isPending}
                  >
                    Train
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}