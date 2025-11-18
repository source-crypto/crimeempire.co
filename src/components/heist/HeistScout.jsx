import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Target, DollarSign, Shield, AlertTriangle, TrendingUp, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function HeistScout({ playerData, onSelectTarget }) {
  const [scoutedTargets, setScoutedTargets] = useState([]);

  const scoutTargetsMutation = useMutation({
    mutationFn: async () => {
      const prompt = `
You are an AI heist planner for a crime game. Based on the player's current stats, generate 3 potential heist targets:

Player Stats:
- Level: ${playerData.level}
- Strength Score: ${playerData.strength_score}
- Crypto Balance: $${playerData.crypto_balance}
- Wanted Level: ${playerData.wanted_level}/5 stars

Generate 3 diverse heist targets with varying difficulty levels. Each target should include:
- Target name (be creative and specific)
- Target type (bank, casino, jewelry_store, art_gallery, armored_truck, warehouse, mansion, corporate_office)
- Difficulty (easy, medium, hard, expert, legendary)
- Estimated payout (based on difficulty and player level)
- Risk level (0-100, based on player's wanted level and difficulty)
- Success probability (0-100, based on player's strength and level vs difficulty)
- Required crew size (1-8 members)
- Special challenges (array of 2-3 challenges)
- Description (1-2 sentences about the target)

Return JSON array format only.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            targets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  target_name: { type: 'string' },
                  target_type: { type: 'string' },
                  difficulty: { type: 'string' },
                  estimated_payout: { type: 'number' },
                  risk_level: { type: 'number' },
                  success_probability: { type: 'number' },
                  required_crew_size: { type: 'number' },
                  challenges: { type: 'array', items: { type: 'string' } },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return response.targets || [];
    },
    onSuccess: (data) => {
      setScoutedTargets(data);
      toast.success('Targets scouted successfully');
    },
    onError: () => {
      toast.error('Failed to scout targets');
    }
  });

  const difficultyColors = {
    easy: 'bg-green-600',
    medium: 'bg-yellow-600',
    hard: 'bg-orange-600',
    expert: 'bg-red-600',
    legendary: 'bg-purple-600'
  };

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            AI Target Scout
          </span>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-cyan-600"
            onClick={() => scoutTargetsMutation.mutate()}
            disabled={scoutTargetsMutation.isPending}
          >
            {scoutTargetsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scouting...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Scout Targets
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {scoutedTargets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Use AI to scout potential heist targets</p>
            <p className="text-sm mt-2">Based on your crew's strength and resources</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scoutedTargets.map((target, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white text-lg mb-1">
                      {target.target_name}
                    </h4>
                    <p className="text-sm text-gray-400">{target.description}</p>
                  </div>
                  <Badge className={difficultyColors[target.difficulty]}>
                    {target.difficulty}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Estimated Payout</p>
                    <p className="text-green-400 font-semibold flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${target.estimated_payout.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Success Chance</p>
                    <p className={`font-semibold ${
                      target.success_probability > 70 ? 'text-green-400' :
                      target.success_probability > 40 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {target.success_probability}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Risk Level</p>
                    <p className="text-orange-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {target.risk_level}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Crew Needed</p>
                    <p className="text-cyan-400 font-semibold">
                      {target.required_crew_size} members
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2">Challenges:</p>
                  <div className="flex flex-wrap gap-2">
                    {target.challenges.map((challenge, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {challenge}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                  onClick={() => onSelectTarget(target)}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Plan This Heist
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}