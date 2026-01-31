import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Crown, AlertTriangle, Users, Building2, Code2, Map, Lock } from 'lucide-react';

const reputationGroups = [
  { key: 'underworld_respect', label: 'Underworld', icon: Users, color: 'red' },
  { key: 'law_enforcement_heat', label: 'Law Enforcement', icon: AlertTriangle, color: 'yellow' },
  { key: 'street_credibility', label: 'Street Level', icon: Map, color: 'purple' },
  { key: 'hacker_network_status', label: 'Hacker Network', icon: Code2, color: 'cyan' },
  { key: 'corporate_standing', label: 'Corporate', icon: Building2, color: 'blue' },
  { key: 'government_infiltration', label: 'Government', icon: Lock, color: 'green' }
];

const tiers = [
  { tier: 1, name: 'Nobody', minScore: -100, color: 'gray' },
  { tier: 2, name: 'Recognized', minScore: -30, color: 'blue' },
  { tier: 3, name: 'Notorious', minScore: 0, color: 'purple' },
  { tier: 4, name: 'Legendary', minScore: 40, color: 'gold' },
  { tier: 5, name: 'Infamous', minScore: 80, color: 'red' }
];

export default function ReputationDisplay({ playerData }) {
  const { data: playerReputation } = useQuery({
    queryKey: ['playerReputation', playerData?.id],
    queryFn: async () => {
      const reps = await base44.entities.PlayerReputation.filter({ player_id: playerData.id });
      if (reps.length === 0) {
        await base44.entities.PlayerReputation.create({
          player_id: playerData.id,
          faction_reputation: {},
          overall_tier: 1,
          reputation_events: [],
          active_missions: [],
          unlocked_opportunities: []
        });
        return (await base44.entities.PlayerReputation.filter({ player_id: playerData.id }))[0];
      }
      return reps[0];
    },
    enabled: !!playerData?.id
  });

  if (!playerReputation) {
    return <div className="text-white">Loading reputation...</div>;
  }

  const getTierInfo = (tier) => tiers.find(t => t.tier === tier) || tiers[0];
  const tierInfo = getTierInfo(playerReputation.overall_tier);

  const getReputationColor = (value) => {
    if (value > 60) return 'text-red-400';
    if (value > 30) return 'text-orange-400';
    if (value > 0) return 'text-yellow-400';
    if (value > -30) return 'text-blue-400';
    return 'text-purple-400';
  };

  const getBackgroundColor = (value) => {
    if (value > 60) return 'bg-red-900/20 border-red-500/30';
    if (value > 30) return 'bg-orange-900/20 border-orange-500/30';
    if (value > 0) return 'bg-yellow-900/20 border-yellow-500/30';
    if (value > -30) return 'bg-blue-900/20 border-blue-500/30';
    return 'bg-purple-900/20 border-purple-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Overall Tier */}
      <Card className="glass-panel border-gold-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Crown className="w-5 h-5 text-gold-400" />
            Reputation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className={`text-3xl font-bold mb-1`} style={{ color: `var(--${tierInfo.color}-400)` }}>
              {tierInfo.name}
            </p>
            <Badge className={`bg-${tierInfo.color}-600`}>
              Tier {playerReputation.overall_tier}/5
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="p-2 bg-slate-900/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Rep Score</p>
              <p className="text-lg font-bold text-cyan-400">{Math.round((playerReputation.underworld_respect + playerReputation.street_credibility + playerReputation.hacker_network_status) / 3)}</p>
            </div>
            <div className="p-2 bg-slate-900/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Wanted</p>
              <p className={`text-lg font-bold ${playerReputation.law_enforcement_heat > 50 ? 'text-red-400' : 'text-green-400'}`}>
                {playerReputation.law_enforcement_heat > 0 ? '+' : ''}{playerReputation.law_enforcement_heat}
              </p>
            </div>
            <div className="p-2 bg-slate-900/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Events</p>
              <p className="text-lg font-bold text-purple-400">{playerReputation.reputation_events?.length || 0}</p>
            </div>
            <div className="p-2 bg-slate-900/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Unlocks</p>
              <p className="text-lg font-bold text-gold-400">{playerReputation.unlocked_opportunities?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reputation Groups */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white text-sm">Standing with Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reputationGroups.map(({ key, label, icon: Icon, color }) => {
              const value = playerReputation[key] || 0;
              const displayValue = Math.max(-100, Math.min(100, value));

              return (
                <div key={key} className={`p-3 rounded-lg border ${getBackgroundColor(value)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${color}-400`} />
                      <h4 className="text-white font-semibold text-sm">{label}</h4>
                    </div>
                    <span className={`text-sm font-bold ${getReputationColor(value)}`}>
                      {displayValue > 0 ? '+' : ''}{displayValue}
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-800/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        displayValue > 50 ? 'from-red-600 to-red-500' :
                        displayValue > 25 ? 'from-orange-600 to-orange-500' :
                        displayValue > 0 ? 'from-yellow-600 to-yellow-500' :
                        displayValue > -25 ? 'from-blue-600 to-blue-500' :
                        'from-purple-600 to-purple-500'
                      }`}
                      style={{
                        width: `${((displayValue + 100) / 200) * 100}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Hostile</span>
                    <span>Neutral</span>
                    <span>Friendly</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      {playerReputation.reputation_events && playerReputation.reputation_events.length > 0 && (
        <Card className="glass-panel border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playerReputation.reputation_events.slice(-5).reverse().map((event, idx) => (
                <div key={idx} className="p-2 bg-slate-900/50 rounded text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-semibold">{event.group}</p>
                      <p className="text-gray-400">{event.reason}</p>
                    </div>
                    <span className={`font-bold ${event.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {event.change > 0 ? '+' : ''}{event.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Benefits */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">🔓 Tier Benefits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="p-2 bg-slate-900/50 rounded">
            <p className="font-semibold text-gray-300">Tier 1 - Nobody</p>
            <p className="text-gray-400">Basic mission access</p>
          </div>
          <div className="p-2 bg-slate-900/50 rounded">
            <p className="font-semibold text-blue-300">Tier 2 - Recognized</p>
            <p className="text-gray-400">Faction relations unlock, better black market access</p>
          </div>
          <div className="p-2 bg-slate-900/50 rounded">
            <p className="font-semibold text-purple-300">Tier 3 - Notorious</p>
            <p className="text-gray-400">Exclusive missions, advanced smuggling routes</p>
          </div>
          <div className="p-2 bg-slate-900/50 rounded">
            <p className="font-semibold text-gold-300">Tier 4 - Legendary</p>
            <p className="text-gray-400">High-value contracts, faction leadership options</p>
          </div>
          <div className="p-2 bg-slate-900/50 rounded">
            <p className="font-semibold text-red-300">Tier 5 - Infamous</p>
            <p className="text-gray-400">Criminal empire unlock, world-shaping events</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}