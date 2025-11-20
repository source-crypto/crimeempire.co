import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Swords, Wifi, Car, Brain, Package, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const memberTypeIcons = {
  enforcer: Swords,
  hacker: Wifi,
  driver: Car,
  strategist: Brain,
  smuggler: Package,
  negotiator: MessageSquare
};

const memberTypeColors = {
  enforcer: 'from-red-600 to-orange-600',
  hacker: 'from-cyan-600 to-blue-600',
  driver: 'from-purple-600 to-pink-600',
  strategist: 'from-green-600 to-emerald-600',
  smuggler: 'from-yellow-600 to-orange-600',
  negotiator: 'from-blue-600 to-indigo-600'
};

export default function CrewRecruitmentSystem({ crewId, playerData }) {
  const queryClient = useQueryClient();

  if (!crewId || !playerData) {
    return null;
  }

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: crewId }),
    enabled: !!crewId
  });

  const generateRecruitMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate an AI crew member for recruitment:

Create a unique crew member with:
1. Name (cool, memorable criminal name)
2. Member type (enforcer/hacker/driver/strategist/smuggler/negotiator)
3. Level (1-5 based on recruitment cost)
4. Skills object (combat, stealth, driving, hacking, negotiation - total 100 points)
5. Specialization (their primary skill)
6. Traits array (2-3 special abilities like "Quick Reflexes", "Street Smart", "Tech Savvy")
7. Recruitment cost (3000-10000)
8. Salary (300-1000 per week)

Make them interesting and valuable. Return JSON.`;

      const memberData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            member_name: { type: 'string' },
            member_type: { type: 'string' },
            level: { type: 'number' },
            skills: {
              type: 'object',
              properties: {
                combat: { type: 'number' },
                stealth: { type: 'number' },
                driving: { type: 'number' },
                hacking: { type: 'number' },
                negotiation: { type: 'number' }
              }
            },
            specialization: { type: 'string' },
            traits: { type: 'array', items: { type: 'string' } },
            recruitment_cost: { type: 'number' },
            salary: { type: 'number' }
          }
        }
      });

      return memberData;
    },
    onSuccess: () => {
      toast.success('New recruit available!');
    }
  });

  const recruitMemberMutation = useMutation({
    mutationFn: async (memberData) => {
      if (playerData.crypto_balance < memberData.recruitment_cost) {
        throw new Error('Insufficient funds');
      }

      const member = await base44.entities.CrewMember.create({
        crew_id: crewId,
        ...memberData,
        experience: 0,
        morale: 75,
        loyalty: 50,
        status: 'available',
        recruited_by: playerData.id,
        ai_generated: true
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - memberData.recruitment_cost
      });

      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewMembers']);
      queryClient.invalidateQueries(['player']);
      toast.success('Crew member recruited!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const trainMemberMutation = useMutation({
    mutationFn: async (member) => {
      const trainingCost = 1000;
      
      if (playerData.crypto_balance < trainingCost) {
        throw new Error('Insufficient funds');
      }

      const newSkills = { ...member.skills };
      const primarySkill = member.specialization.toLowerCase();
      if (newSkills[primarySkill]) {
        newSkills[primarySkill] = Math.min(100, newSkills[primarySkill] + 5);
      }

      await base44.entities.CrewMember.update(member.id, {
        skills: newSkills,
        experience: member.experience + 50,
        level: Math.floor((member.experience + 50) / 100) + 1
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - trainingCost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewMembers']);
      queryClient.invalidateQueries(['player']);
      toast.success('Training completed!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-4">
      {/* Recruitment */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-purple-400" />
              Crew Recruitment
            </CardTitle>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => {
                generateRecruitMutation.mutateAsync().then(data => {
                  recruitMemberMutation.mutate(data);
                });
              }}
              disabled={generateRecruitMutation.isPending || recruitMemberMutation.isPending}
            >
              {generateRecruitMutation.isPending || recruitMemberMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Recruit
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Crew Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {crewMembers.map((member) => {
          const MemberIcon = memberTypeIcons[member.member_type] || Users;
          
          return (
            <Card key={member.id} className="glass-panel border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${memberTypeColors[member.member_type]}`}>
                    <MemberIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="font-bold text-white">{member.member_name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{member.member_type}</p>
                      </div>
                      <Badge className="bg-purple-600">Lvl {member.level}</Badge>
                    </div>

                    {/* Morale & Loyalty */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Morale</span>
                          <span>{member.morale}%</span>
                        </div>
                        <Progress value={member.morale} className="h-1" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Loyalty</span>
                          <span>{member.loyalty}%</span>
                        </div>
                        <Progress value={member.loyalty} className="h-1" />
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Specialization: {member.specialization}</p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(member.skills || {}).map(([skill, value]) => (
                          <div key={skill} className="flex justify-between">
                            <span className="text-gray-400 capitalize">{skill}:</span>
                            <span className="text-cyan-400">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Traits */}
                    {member.traits?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {member.traits.map((trait, idx) => (
                          <Badge key={idx} className="bg-purple-900/50 text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-purple-500/30 text-xs"
                      onClick={() => trainMemberMutation.mutate(member)}
                      disabled={trainMemberMutation.isPending}
                    >
                      Train ($1,000)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}