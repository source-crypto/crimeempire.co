import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, CheckCircle, Clock, Users, DollarSign,
  Eye, Shield, Zap, TrendingUp, ArrowRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const phaseIcons = {
  approach: Clock,
  infiltration: Eye,
  execution: Zap,
  escape: ArrowRight,
  completed: CheckCircle
};

export default function HeistExecution({ heist, onComplete }) {
  const [execution, setExecution] = useState(null);
  const [autoProgress, setAutoProgress] = useState(false);
  const queryClient = useQueryClient();

  const { data: executionData, refetch } = useQuery({
    queryKey: ['heistExecution', heist.id],
    queryFn: async () => {
      const execs = await base44.entities.HeistExecution.filter({ heist_id: heist.id });
      return execs[0] || null;
    },
    enabled: !!heist.id,
    refetchInterval: autoProgress ? 2000 : false
  });

  useEffect(() => {
    if (executionData) {
      setExecution(executionData);
    }
  }, [executionData]);

  const startExecutionMutation = useMutation({
    mutationFn: async () => {
      const prompt = `
You are simulating the first phase of a heist. Generate the initial challenge and scenario:

Heist: ${heist.heist_name}
Target: ${heist.target_name} (${heist.target_type})
Difficulty: ${heist.difficulty}
Crew Size: ${heist.participants?.length || 0}

Phase: APPROACH
Generate a realistic challenge for the approach phase. Include:
- Challenge description
- Challenge type (surveillance, timing, equipment, etc)
- Severity (low, medium, high)
- Required skill to overcome it
- Time pressure (in seconds, 30-120)

Return JSON format.
`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            challenge_description: { type: 'string' },
            challenge_type: { type: 'string' },
            severity: { type: 'string' },
            required_skill: { type: 'string' },
            time_pressure: { type: 'number' }
          }
        }
      });

      const newExecution = await base44.entities.HeistExecution.create({
        heist_id: heist.id,
        phase: 'approach',
        current_challenge: aiResponse,
        completed_challenges: [],
        crew_actions: [],
        events_log: [
          `Heist initiated: ${heist.heist_name}`,
          `Phase: APPROACH - ${aiResponse.challenge_description}`
        ],
        detection_level: 0,
        progress: 0,
        loot_collected: 0,
        status: 'active'
      });

      await base44.entities.Heist.update(heist.id, { status: 'in_progress' });

      return newExecution;
    },
    onSuccess: (data) => {
      setExecution(data);
      toast.success('Heist execution started!');
    }
  });

  const handleChallengeMutation = useMutation({
    mutationFn: async ({ action }) => {
      if (!execution) return;

      // AI determines success based on crew skills and action
      const prompt = `
You are simulating a heist challenge resolution.

Current Situation:
- Phase: ${execution.phase}
- Challenge: ${execution.current_challenge?.challenge_description}
- Required Skill: ${execution.current_challenge?.required_skill}
- Detection Level: ${execution.detection_level}%
- Progress: ${execution.progress}%

Crew Action: ${action}
Crew Members: ${heist.participants?.length || 0} with mixed skills

Determine the outcome:
1. Success or failure (boolean)
2. Detection increase (0-30)
3. Progress gain (10-30)
4. Event description (what happened)
5. Impact on crew (none, minor, major)
6. Loot gained (0 if not execution phase, otherwise 10-30% of estimated payout)

If progress >= 100, heist succeeds.
If detection >= 100, heist fails (busted).

Return JSON format.
`;

      const outcome = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            detection_increase: { type: 'number' },
            progress_gain: { type: 'number' },
            event_description: { type: 'string' },
            impact: { type: 'string' },
            loot_gained: { type: 'number' }
          }
        }
      });

      const newDetection = Math.min(100, execution.detection_level + outcome.detection_increase);
      const newProgress = Math.min(100, execution.progress + outcome.progress_gain);
      const newLoot = execution.loot_collected + outcome.loot_gained;

      let newPhase = execution.phase;
      let newStatus = execution.status;

      // Determine phase progression
      if (newProgress >= 25 && execution.phase === 'approach') newPhase = 'infiltration';
      if (newProgress >= 50 && execution.phase === 'infiltration') newPhase = 'execution';
      if (newProgress >= 75 && execution.phase === 'execution') newPhase = 'escape';
      if (newProgress >= 100) {
        newPhase = 'completed';
        newStatus = 'success';
      }
      if (newDetection >= 100) {
        newStatus = 'busted';
      }

      // Generate next challenge if progressing
      let nextChallenge = execution.current_challenge;
      if (newPhase !== execution.phase && newStatus === 'active') {
        const challengePrompt = `Generate a new challenge for phase: ${newPhase} of heist ${heist.heist_name}. Make it relevant to the phase and previous events.`;
        
        nextChallenge = await base44.integrations.Core.InvokeLLM({
          prompt: challengePrompt,
          response_json_schema: {
            type: 'object',
            properties: {
              challenge_description: { type: 'string' },
              challenge_type: { type: 'string' },
              severity: { type: 'string' },
              required_skill: { type: 'string' }
            }
          }
        });
      }

      const updatedExecution = await base44.entities.HeistExecution.update(execution.id, {
        phase: newPhase,
        current_challenge: nextChallenge,
        completed_challenges: [...execution.completed_challenges, {
          challenge: execution.current_challenge,
          outcome
        }],
        crew_actions: [...execution.crew_actions, {
          action,
          success: outcome.success,
          impact: outcome.impact
        }],
        events_log: [...execution.events_log, outcome.event_description],
        detection_level: newDetection,
        progress: newProgress,
        loot_collected: newLoot,
        status: newStatus
      });

      // If heist completed, update heist entity
      if (newStatus !== 'active') {
        await completeHeist(newStatus, newLoot);
      }

      return updatedExecution;
    },
    onSuccess: (data) => {
      setExecution(data);
      refetch();
    }
  });

  const completeHeist = async (status, lootCollected) => {
    const success = status === 'success';
    
    // Update heist
    await base44.entities.Heist.update(heist.id, {
      status: success ? 'completed' : status === 'busted' ? 'busted' : 'failed',
      actual_payout: success ? lootCollected : 0,
      completed_at: new Date().toISOString()
    });

    // Generate AI post-heist analysis
    const analysisPrompt = `
Analyze this completed heist and provide detailed feedback:

Heist: ${heist.heist_name}
Status: ${status}
Loot Collected: $${lootCollected}
Estimated Payout: $${heist.estimated_payout}
Detection Level: ${execution.detection_level}%
Crew Size: ${heist.participants?.length}

Provide:
1. Overall performance rating (1-10)
2. Key strengths during execution
3. Areas for improvement
4. Loot distribution recommendation (percentages per role)
5. Skill recommendations for crew members
6. What went well
7. What went wrong
8. Tips for future heists

Return JSON format.
`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          performance_rating: { type: 'number' },
          strengths: { type: 'array', items: { type: 'string' } },
          improvements: { type: 'array', items: { type: 'string' } },
          loot_distribution: { type: 'object' },
          skill_recommendations: { type: 'array', items: { type: 'string' } },
          what_went_well: { type: 'array', items: { type: 'string' } },
          what_went_wrong: { type: 'array', items: { type: 'string' } },
          future_tips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Update heist with analysis
    await base44.entities.Heist.update(heist.id, {
      loot_distribution: analysis.loot_distribution
    });

    // Create crew activity
    await base44.entities.CrewActivity.create({
      crew_id: heist.crew_id,
      activity_type: success ? 'heist_completed' : 'heist_completed',
      title: success ? '🎯 Heist Successful!' : '❌ Heist Failed',
      description: success 
        ? `${heist.heist_name} completed! Earned $${lootCollected.toLocaleString()}`
        : `${heist.heist_name} failed. Better luck next time.`,
      value: success ? lootCollected : 0
    });

    // Distribute loot to participants if successful
    if (success && heist.participants) {
      for (const participant of heist.participants) {
        const share = (lootCollected * (analysis.loot_distribution[participant.role] || 0.15));
        
        const players = await base44.entities.Player.filter({ id: participant.player_id });
        if (players[0]) {
          await base44.entities.Player.update(players[0].id, {
            crypto_balance: players[0].crypto_balance + share,
            total_earnings: (players[0].total_earnings || 0) + share
          });
        }
      }
    }

    toast.success('Heist completed! Check analysis.', { duration: 5000 });
    
    // Show analysis
    setTimeout(() => {
      onComplete(analysis);
    }, 1000);
  };

  const autoProgressHeist = async () => {
    setAutoProgress(true);
    
    const actions = ['proceed carefully', 'take calculated risk', 'use stealth approach', 'move quickly'];
    
    const interval = setInterval(async () => {
      if (execution?.status !== 'active') {
        clearInterval(interval);
        setAutoProgress(false);
        return;
      }

      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      await handleChallengeMutation.mutateAsync({ action: randomAction });
    }, 3000);
  };

  if (!execution) {
    return (
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-12 text-center">
          <Zap className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-bold text-white mb-2">Ready to Execute</h3>
          <p className="text-gray-400 mb-6">Start the heist and let AI guide your crew through the operation</p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-red-600 to-orange-600"
            onClick={() => startExecutionMutation.mutate()}
            disabled={startExecutionMutation.isPending}
          >
            {startExecutionMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Start Heist
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const PhaseIcon = phaseIcons[execution.phase];
  const isActive = execution.status === 'active';

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <PhaseIcon className="w-8 h-8 text-purple-400" />
              <div>
                <h3 className="text-2xl font-bold text-white capitalize">{execution.phase}</h3>
                <p className="text-gray-400">Phase {['approach', 'infiltration', 'execution', 'escape', 'completed'].indexOf(execution.phase) + 1} of 5</p>
              </div>
            </div>
            <Badge className={
              execution.status === 'success' ? 'bg-green-600' :
              execution.status === 'busted' ? 'bg-red-600' :
              execution.status === 'failed' ? 'bg-orange-600' :
              'bg-blue-600'
            }>
              {execution.status}
            </Badge>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Heist Progress</span>
                <span className="text-green-400 font-semibold">{execution.progress.toFixed(0)}%</span>
              </div>
              <Progress value={execution.progress} className="h-3" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Detection Level</span>
                <span className="text-red-400 font-semibold">{execution.detection_level.toFixed(0)}%</span>
              </div>
              <Progress value={execution.detection_level} className="h-3 [&>div]:bg-red-600" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 rounded-lg bg-slate-900/30">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-400" />
              <p className="text-xs text-gray-400">Loot</p>
              <p className="text-lg font-bold text-white">${execution.loot_collected.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-900/30">
              <Users className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
              <p className="text-xs text-gray-400">Crew</p>
              <p className="text-lg font-bold text-white">{heist.participants?.length || 0}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-900/30">
              <Shield className="w-5 h-5 mx-auto mb-1 text-orange-400" />
              <p className="text-xs text-gray-400">Heat</p>
              <p className="text-lg font-bold text-white">+{Math.floor(execution.detection_level / 10)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Challenge */}
      {isActive && execution.current_challenge && (
        <Card className="glass-panel border-orange-500/30">
          <CardHeader className="border-b border-orange-500/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Current Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-white mb-3">{execution.current_challenge.challenge_description}</p>
            <div className="flex gap-2 mb-4">
              <Badge className="bg-orange-900/30 text-orange-400">
                {execution.current_challenge.challenge_type}
              </Badge>
              <Badge className="bg-red-900/30 text-red-400">
                {execution.current_challenge.severity} severity
              </Badge>
              <Badge className="bg-cyan-900/30 text-cyan-400">
                Requires: {execution.current_challenge.required_skill}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={() => handleChallengeMutation.mutate({ action: 'proceed carefully' })}
                disabled={handleChallengeMutation.isPending}
              >
                Proceed Carefully
              </Button>
              <Button
                className="bg-gradient-to-r from-orange-600 to-red-600"
                onClick={() => handleChallengeMutation.mutate({ action: 'take calculated risk' })}
                disabled={handleChallengeMutation.isPending}
              >
                Take Risk
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={() => handleChallengeMutation.mutate({ action: 'use stealth approach' })}
                disabled={handleChallengeMutation.isPending}
              >
                Use Stealth
              </Button>
              <Button
                className="bg-gradient-to-r from-cyan-600 to-blue-600"
                onClick={() => handleChallengeMutation.mutate({ action: 'move quickly' })}
                disabled={handleChallengeMutation.isPending}
              >
                Move Quick
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full mt-3 border-purple-500/30"
              onClick={autoProgressHeist}
              disabled={autoProgress}
            >
              {autoProgress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Auto-Progressing...
                </>
              ) : (
                'Auto-Progress Heist'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Events Log */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">Events Log</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {execution.events_log?.slice().reverse().map((event, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-900/30 text-sm text-gray-300">
                <span className="text-purple-400 mr-2">›</span>
                {event}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}