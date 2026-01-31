import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Target, Shield, Car, Laptop, Users, MessageSquare } from 'lucide-react';

export default function Skills() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const upgradeSkill = useMutation({
    mutationFn: async (skillName) => {
      const currentLevel = playerData.skills?.[skillName] || 0;
      const newSkills = { ...playerData.skills, [skillName]: currentLevel + 1 };
      
      await base44.entities.Player.update(playerData.id, {
        skills: newSkills,
        skill_points: (playerData.skill_points || 0) - 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
    }
  });

  if (!playerData) {
    return <div className="text-white">Loading...</div>;
  }

  const skills = [
    { name: 'combat', icon: Shield, description: 'Increases damage in battles', color: 'red' },
    { name: 'stealth', icon: Target, description: 'Reduces detection during operations', color: 'purple' },
    { name: 'driving', icon: Car, description: 'Better vehicle handling and speed', color: 'cyan' },
    { name: 'hacking', icon: Laptop, description: 'Bypass security systems', color: 'green' },
    { name: 'leadership', icon: Users, description: 'Crew bonuses and recruitment', color: 'yellow' },
    { name: 'negotiation', icon: MessageSquare, description: 'Better deals and diplomacy', color: 'blue' }
  ];

  const colorClasses = {
    red: 'from-red-600 to-orange-600',
    purple: 'from-purple-600 to-pink-600',
    cyan: 'from-cyan-600 to-blue-600',
    green: 'from-green-600 to-emerald-600',
    yellow: 'from-yellow-600 to-orange-600',
    blue: 'from-blue-600 to-indigo-600'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Skill Tree</h1>
          <p className="text-gray-400">Develop your character's abilities</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Available Points</p>
          <p className="text-3xl font-bold text-purple-400">{playerData.skill_points || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map((skill) => {
          const Icon = skill.icon;
          const currentLevel = playerData.skills?.[skill.name] || 0;
          const canUpgrade = (playerData.skill_points || 0) > 0;

          return (
            <Card key={skill.name} className="glass-panel border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[skill.color]}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-white capitalize">{skill.name}</div>
                    <div className="text-sm text-gray-400">Level {currentLevel}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">{skill.description}</p>
                
                <div>
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{currentLevel}/10</span>
                  </div>
                  <Progress value={(currentLevel / 10) * 100} className="h-2" />
                </div>

                <Button
                  onClick={() => upgradeSkill.mutate(skill.name)}
                  disabled={!canUpgrade || currentLevel >= 10}
                  className={`w-full bg-gradient-to-r ${colorClasses[skill.color]}`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {currentLevel >= 10 ? 'Maxed Out' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}