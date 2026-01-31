import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Crown, Zap, Target, Users, TrendingUp } from 'lucide-react';

const legacyTiers = [
  { tier: 1, name: 'Rising Criminal', minScore: 0, color: 'gray' },
  { tier: 2, name: 'Established Boss', minScore: 1000, color: 'green' },
  { tier: 3, name: 'Legendary Kingpin', minScore: 5000, color: 'blue' },
  { tier: 4, name: 'Syndicate Leader', minScore: 15000, color: 'purple' },
  { tier: 5, name: 'Crime Emperor', minScore: 50000, color: 'yellow' }
];

export default function LegacyTracker({ playerData }) {
  const { data: playerLegacy } = useQuery({
    queryKey: ['playerLegacy', playerData?.id],
    queryFn: async () => {
      const legacy = await base44.entities.PlayerLegacy.filter({ player_id: playerData.id });
      if (legacy.length === 0) {
        // Create initial legacy record
        await base44.entities.PlayerLegacy.create({
          player_id: playerData.id,
          legacy_score: 0,
          legacy_tier: 1,
          legendary_actions: [],
          world_influence: {
            territories_controlled: 0,
            npcs_recruited: 0,
            factions_influenced: 0,
            major_victories: 0,
            alliances_forged: 0
          },
          achievements: []
        });
        return (await base44.entities.PlayerLegacy.filter({ player_id: playerData.id }))[0];
      }
      return legacy[0];
    },
    enabled: !!playerData?.id
  });

  if (!playerLegacy) {
    return <div className="text-white">Loading legacy data...</div>;
  }

  const currentTier = legacyTiers.find(t => t.tier === playerLegacy.legacy_tier) || legacyTiers[0];
  const nextTier = legacyTiers[playerLegacy.legacy_tier] || legacyTiers[legacyTiers.length - 1];
  const scoreToNextTier = nextTier.minScore - playerLegacy.legacy_score;
  const scoreProgress = ((playerLegacy.legacy_score - currentTier.minScore) / (nextTier.minScore - currentTier.minScore)) * 100;

  return (
    <div className="space-y-6">
      {/* Legacy Status */}
      <Card className="glass-panel border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Crown className="w-5 h-5 text-yellow-400" />
            Your Legacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {currentTier.name}
            </p>
            <Badge className={`bg-${currentTier.color}-600 mt-2`}>
              Tier {playerLegacy.legacy_tier}/5
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Progress to {nextTier.name}</span>
              <span className="text-yellow-400">
                {playerLegacy.legacy_score}/{nextTier.minScore}
              </span>
            </div>
            <Progress value={Math.min(100, scoreProgress)} className="h-3" />
            <p className="text-xs text-gray-500">
              {scoreToNextTier > 0 ? `${scoreToNextTier} points until next tier` : 'Tier maxed out'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* World Influence */}
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-purple-400" />
            World Influence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Territories Controlled</p>
              <p className="text-2xl font-bold text-cyan-400">
                {playerLegacy.world_influence?.territories_controlled || 0}
              </p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">NPCs Recruited</p>
              <p className="text-2xl font-bold text-green-400">
                {playerLegacy.world_influence?.npcs_recruited || 0}
              </p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Factions Influenced</p>
              <p className="text-2xl font-bold text-purple-400">
                {playerLegacy.world_influence?.factions_influenced || 0}
              </p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Major Victories</p>
              <p className="text-2xl font-bold text-red-400">
                {playerLegacy.world_influence?.major_victories || 0}
              </p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Alliances Forged</p>
              <p className="text-2xl font-bold text-blue-400">
                {playerLegacy.world_influence?.alliances_forged || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legendary Actions */}
      {playerLegacy.legendary_actions && playerLegacy.legendary_actions.length > 0 && (
        <Card className="glass-panel border-gold-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-gold-400" />
              Legendary Moments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playerLegacy.legendary_actions.map((action, idx) => (
                <div key={idx} className="p-3 bg-slate-900/30 rounded-lg border border-gold-500/20">
                  <p className="text-sm text-white font-semibold">{action.action}</p>
                  <p className="text-xs text-gray-400 mt-1">{action.impact}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(action.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {playerLegacy.achievements && playerLegacy.achievements.length > 0 && (
        <Card className="glass-panel border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-green-400" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {playerLegacy.achievements.map((achievement, idx) => (
                <Badge key={idx} className="bg-green-600 py-2 px-3 text-xs text-center">
                  {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Narrative Summary */}
      {playerLegacy.narrative_summary && (
        <Card className="glass-panel border-cyan-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Your Story
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300 leading-relaxed">
              {playerLegacy.narrative_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legacy Tier Benefits */}
      <Card className="glass-panel border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white">Tier Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {legacyTiers.map((tier) => (
              <div key={tier.tier} className={`p-2 rounded ${tier.tier <= playerLegacy.legacy_tier ? 'bg-slate-800/70' : 'bg-slate-900/30 opacity-50'}`}>
                <p className={`font-semibold ${tier.tier <= playerLegacy.legacy_tier ? 'text-white' : 'text-gray-500'}`}>
                  Tier {tier.tier}: {tier.name}
                </p>
                <p className="text-gray-400">
                  {tier.tier === 1 && '• Basic business operations'}
                  {tier.tier === 2 && '• Build supply chains + Recruit NPCs'}
                  {tier.tier === 3 && '• Unlock advanced perks + Influence territories'}
                  {tier.tier === 4 && '• Control multiple factions + Legacy events'}
                  {tier.tier === 5 && '• Shape world narrative + Permanent impacts'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}