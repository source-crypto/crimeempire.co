import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import HeistSimulation from './HeistSimulation';
import {
  Users, Target, AlertTriangle, CheckCircle, Loader2,
  ArrowLeft, Swords, Eye, Car, Brain, MessageSquare, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const SKILL_ICONS = {
  combat: <Swords className="w-3 h-3" />,
  stealth: <Eye className="w-3 h-3" />,
  driving: <Car className="w-3 h-3" />,
  hacking: <Zap className="w-3 h-3" />,
  leadership: <Brain className="w-3 h-3" />,
  negotiation: <MessageSquare className="w-3 h-3" />,
};

const SKILL_COLOR = {
  combat: 'text-red-400',
  stealth: 'text-purple-400',
  driving: 'text-cyan-400',
  hacking: 'text-yellow-400',
  leadership: 'text-green-400',
  negotiation: 'text-blue-400',
};

export default function HeistPlanner({ selectedTarget, playerData, crewId, onBack }) {
  const [selectedMembers, setSelectedMembers] = useState([playerData.id]);
  const [heistName, setHeistName] = useState(selectedTarget.target_name);
  const queryClient = useQueryClient();

  const { data: crewMembers = [], isLoading } = useQuery({
    queryKey: ['crewPlayers', crewId],
    queryFn: () => base44.entities.Player.filter({ crew_id: crewId }),
    enabled: !!crewId,
  });

  const confirmHeistMutation = useMutation({
    mutationFn: async ({ simulation, equipment }) => {
      const participants = crewMembers
        .filter(m => selectedMembers.includes(m.id))
        .map(m => ({
          player_id: m.id,
          username: m.username,
          role: simulation?.member_roles?.find(r => r.username === m.username)?.recommended_role || 'crew',
          contribution_score: simulation?.member_roles?.find(r => r.username === m.username)?.effectiveness || 50,
        }));

      const heist = await base44.entities.Heist.create({
        heist_name: heistName,
        target_type: selectedTarget.target_type,
        target_name: selectedTarget.target_name,
        difficulty: selectedTarget.difficulty,
        crew_id: crewId,
        organizer_id: playerData.id,
        participants,
        status: 'planning',
        estimated_payout: selectedTarget.estimated_payout,
        risk_level: selectedTarget.risk_level,
        success_probability: simulation?.success_probability || selectedTarget.success_probability,
        challenges: selectedTarget.challenges,
        ai_analysis: {
          simulation,
          equipment_used: equipment,
          overall_assessment: simulation?.overall_assessment,
        },
      });

      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'heist_completed',
        title: '🎯 Heist Planned',
        description: `${heistName} — ${simulation?.success_probability || 0}% success probability`,
        player_id: playerData.id,
        player_username: playerData.username,
      });

      return heist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['heists']);
      toast.success('Heist plan saved! Ready for execution.');
      onBack();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMember = (id) => {
    if (id === playerData.id) return;
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const getTopSkill = (member) => {
    if (!member.skills) return null;
    const entries = Object.entries(member.skills);
    if (!entries.length) return null;
    return entries.reduce((a, b) => a[1] > b[1] ? a : b);
  };

  const memberColor = (m) => selectedMembers.includes(m.id)
    ? 'bg-purple-900/40 border-purple-500/60'
    : 'bg-slate-900/30 border-gray-700/30 hover:border-purple-500/30';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel border border-purple-500/20 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-400" />
            Plan: {selectedTarget.target_name}
          </h2>
          <p className="text-gray-400 text-sm">{selectedTarget.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} className="border-purple-500/30">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
      </div>

      {/* Target Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Payout', value: `$${selectedTarget.estimated_payout?.toLocaleString()}`, color: 'text-green-400' },
          { label: 'Success', value: `${selectedTarget.success_probability}%`, color: selectedTarget.success_probability > 60 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Risk', value: `${selectedTarget.risk_level}%`, color: 'text-red-400' },
          { label: 'Crew Needed', value: `${selectedTarget.required_crew_size}`, color: 'text-cyan-400' },
        ].map(s => (
          <Card key={s.label} className="glass-panel border-purple-500/20">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="crew">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="crew">
            👥 Crew Selection
            <Badge className={`ml-2 text-xs ${selectedMembers.length >= selectedTarget.required_crew_size ? 'bg-green-700' : 'bg-red-700'}`}>
              {selectedMembers.length}/{selectedTarget.required_crew_size}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="simulate">⚡ Simulate & Equipment</TabsTrigger>
        </TabsList>

        {/* CREW SELECTION TAB */}
        <TabsContent value="crew" className="mt-4 space-y-4">
          {/* Heist Name */}
          <Card className="glass-panel border-purple-500/20">
            <CardContent className="p-4">
              <label className="text-sm text-gray-400 mb-2 block">Heist Name</label>
              <Input
                value={heistName}
                onChange={(e) => setHeistName(e.target.value)}
                className="bg-slate-900/50 border-purple-500/20 text-white"
              />
            </CardContent>
          </Card>

          {/* Challenges */}
          <Card className="glass-panel border-red-500/20">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />Target Challenges
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTarget.challenges?.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-red-300 border-red-500/30">{c}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Crew Members */}
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Select Crew Members
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" /></div>
              ) : crewMembers.length === 0 ? (
                <p className="text-gray-400 text-center py-6">No crew members found</p>
              ) : (
                crewMembers.map(member => {
                  const selected = selectedMembers.includes(member.id);
                  const isOrganizer = member.id === playerData.id;
                  const topSkill = getTopSkill(member);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${memberColor(member)}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-purple-600 border-purple-500' : 'border-gray-600'}`}>
                          {selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{member.username}</span>
                            {isOrganizer && <Badge className="bg-yellow-600 text-xs">You</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400">Lv {member.level || 1}</span>
                            <span className="text-xs text-gray-400">STR {member.strength_score || 10}</span>
                            {member.crew_role && (
                              <span className="text-xs text-gray-500 capitalize">{member.crew_role}</span>
                            )}
                          </div>
                          {/* Skill bars */}
                          {member.skills && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {Object.entries(member.skills).slice(0, 4).map(([skill, val]) => (
                                <span key={skill} className={`text-xs flex items-center gap-0.5 ${SKILL_COLOR[skill] || 'text-gray-400'}`}>
                                  {SKILL_ICONS[skill]}{skill.slice(0,3)} {val}
                                </span>
                              ))}
                            </div>
                          )}
                          {topSkill && (
                            <span className={`text-xs mt-0.5 inline-block ${SKILL_COLOR[topSkill[0]] || 'text-gray-400'}`}>
                              ★ Best: {topSkill[0]} ({topSkill[1]})
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Combat</div>
                          <Progress value={member.strength_score || 10} className="h-1 w-16" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SIMULATION TAB */}
        <TabsContent value="simulate" className="mt-4">
          <HeistSimulation
            target={selectedTarget}
            selectedMembers={selectedMembers}
            crewMembers={crewMembers}
            playerData={playerData}
            onSimulationDone={(simulation, equipment) =>
              confirmHeistMutation.mutate({ simulation, equipment })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}