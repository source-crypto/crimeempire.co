import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, GraduationCap, Zap, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function AICrewManagement({ crewId, playerData }) {
  const [optimizing, setOptimizing] = useState(false);
  const queryClient = useQueryClient();

  if (!crewId || !playerData) return null;

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: crewId })
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['crewAssignments', crewId],
    queryFn: () => base44.entities.CrewAssignment.filter({ crew_id: crewId, status: 'active' })
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories', crewId],
    queryFn: () => base44.entities.Territory.filter({ controlling_crew_id: crewId })
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', crewId],
    queryFn: async () => {
      const allEnterprises = await base44.entities.CriminalEnterprise.list();
      return allEnterprises.filter(e => e.crew_id === crewId);
    }
  });

  const optimizeAssignmentsMutation = useMutation({
    mutationFn: async () => {
      setOptimizing(true);
      
      const prompt = `Optimize crew member assignments for maximum efficiency.

Crew Members (${crewMembers.length}):
${crewMembers.map(m => `- ${m.member_name} (${m.member_type}): Combat ${m.skills?.combat || 0}, Stealth ${m.skills?.stealth || 0}, Leadership ${m.skills?.leadership || 0}`).join('\n')}

Territories (${territories.length}):
${territories.map(t => `- ${t.name}: ${t.control_percentage}% control, ${t.defense_level || 0} defense`).join('\n')}

Enterprises (${enterprises.length}):
${enterprises.map(e => `- ${e.name} (${e.type}): Level ${e.level}, Heat ${e.heat_level}%`).join('\n')}

Generate optimal assignment strategy considering:
1. Member skills vs task requirements
2. Current workload distribution
3. Territory defense needs
4. Enterprise management needs
5. Member loyalty and morale

Provide 5-8 specific assignments with efficiency scores.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  crew_member_name: { type: "string" },
                  assignment_type: { type: "string" },
                  assigned_to_name: { type: "string" },
                  efficiency_score: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            },
            overall_strategy: { type: "string" }
          }
        }
      });

      // Create assignments
      for (const assignment of result.assignments) {
        const member = crewMembers.find(m => m.member_name === assignment.crew_member_name);
        if (!member) continue;

        const target = territories.find(t => t.name === assignment.assigned_to_name) || 
                      enterprises.find(e => e.name === assignment.assigned_to_name);
        if (!target) continue;

        const endsAt = new Date();
        endsAt.setHours(endsAt.getHours() + 24);

        await base44.entities.CrewAssignment.create({
          crew_member_id: member.id,
          crew_member_name: member.member_name,
          assignment_type: assignment.assignment_type,
          assigned_to_id: target.id,
          assigned_to_name: assignment.assigned_to_name,
          crew_id: crewId,
          efficiency_score: assignment.efficiency_score,
          workload: 60,
          ai_recommendation: assignment.reasoning,
          status: 'active',
          started_at: new Date().toISOString(),
          ends_at: endsAt.toISOString()
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewAssignments']);
      toast.success('Crew assignments optimized');
      setOptimizing(false);
    },
    onError: () => {
      toast.error('Failed to optimize assignments');
      setOptimizing(false);
    }
  });

  const startTrainingMutation = useMutation({
    mutationFn: async ({ memberId, skill }) => {
      const member = crewMembers.find(m => m.id === memberId);
      
      const prompt = `Create an AI-driven training program for ${member.member_name} to improve ${skill}.

Current Stats:
- Combat: ${member.skills?.combat || 0}
- Stealth: ${member.skills?.stealth || 0}
- Hacking: ${member.skills?.hacking || 0}
- Leadership: ${member.skills?.leadership || 0}

Generate a personalized training curriculum with exercises, duration, and expected outcomes.`;

      const curriculum = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            curriculum: {
              type: "array",
              items: { type: "string" }
            },
            duration_hours: { type: "number" },
            expected_improvement: { type: "number" },
            unlocked_abilities: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const cost = curriculum.duration_hours * 1000;
      
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      const completionTime = new Date();
      completionTime.setHours(completionTime.getHours() + curriculum.duration_hours);

      await base44.entities.TrainingProgram.create({
        program_name: `${skill.charAt(0).toUpperCase() + skill.slice(1)} Training`,
        crew_member_id: memberId,
        crew_member_name: member.member_name,
        skill_focus: skill,
        current_level: member.skills?.[skill] || 0,
        target_level: (member.skills?.[skill] || 0) + curriculum.expected_improvement,
        duration_hours: curriculum.duration_hours,
        cost,
        ai_curriculum: curriculum.curriculum,
        unlocked_abilities: curriculum.unlocked_abilities,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        completed_at: completionTime.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewMembers']);
      queryClient.invalidateQueries(['player']);
      toast.success('Training started');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              AI Crew Management
            </CardTitle>
            <Button
              size="sm"
              onClick={() => optimizeAssignmentsMutation.mutate()}
              disabled={optimizing || crewMembers.length === 0}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize Assignments
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {crewMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No crew members available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {crewMembers.map((member) => {
                const memberAssignment = assignments.find(a => a.crew_member_id === member.id);
                
                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold">{member.member_name}</h4>
                        <p className="text-sm text-gray-400 capitalize">{member.member_type}</p>
                      </div>
                      <Badge className={member.status === 'available' ? 'bg-green-600' : 'bg-blue-600'}>
                        {member.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div>
                        <span className="text-gray-400">Combat:</span>
                        <span className="text-white ml-1">{member.skills?.combat || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Stealth:</span>
                        <span className="text-white ml-1">{member.skills?.stealth || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Leadership:</span>
                        <span className="text-white ml-1">{member.skills?.leadership || 0}</span>
                      </div>
                    </div>

                    {memberAssignment && (
                      <div className="mb-3 p-2 rounded bg-blue-900/20 border border-blue-500/20">
                        <div className="flex items-center gap-2">
                          <Target className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-400">
                            Assigned: {memberAssignment.assigned_to_name}
                          </span>
                          <Badge className="ml-auto text-xs bg-blue-600">
                            {memberAssignment.efficiency_score}% efficiency
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {['combat', 'stealth', 'hacking', 'leadership'].map((skill) => (
                        <Button
                          key={skill}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs border-purple-500/20"
                          onClick={() => startTrainingMutation.mutate({ memberId: member.id, skill })}
                          disabled={startTrainingMutation.isPending}
                        >
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {skill}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}