import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Unlock, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const skillIcons = {
  combat: '⚔️',
  stealth: '👤',
  driving: '🚗',
  hacking: '💻',
  leadership: '👥',
  negotiation: '🤝'
};

export default function SkillTreeDisplay({ playerData }) {
  const queryClient = useQueryClient();
  const [expandedSkill, setExpandedSkill] = useState(null);

  const { data: skillTree = [] } = useQuery({
    queryKey: ['skillTree'],
    queryFn: () => base44.entities.SkillTree.list()
  });

  const { data: playerSkills = [] } = useQuery({
    queryKey: ['playerSkills', playerData?.id],
    queryFn: () => base44.entities.PlayerSkill.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: playerExp } = useQuery({
    queryKey: ['playerExp', playerData?.id],
    queryFn: async () => {
      const exp = await base44.entities.PlayerExperience.filter({ player_id: playerData.id });
      return exp[0];
    },
    enabled: !!playerData?.id
  });

  const unlockSkillMutation = useMutation({
    mutationFn: async (skillTreeId) => {
      const skill = skillTree.find(s => s.id === skillTreeId);
      
      // Check if parent skill is unlocked
      if (skill.required_parent_skill) {
        const parentSkill = playerSkills.find(s => s.skill_tree_id === skill.required_parent_skill);
        if (!parentSkill?.is_unlocked) {
          throw new Error('Parent skill must be unlocked first');
        }
      }

      if (!playerData.skill_points || playerData.skill_points < skill.cost_in_points) {
        throw new Error('Insufficient skill points');
      }

      // Create or update player skill
      const existing = playerSkills.find(s => s.skill_tree_id === skillTreeId);
      if (existing) {
        await base44.entities.PlayerSkill.update(existing.id, {
          is_unlocked: true,
          unlock_date: new Date().toISOString(),
          level: existing.level + 1
        });
      } else {
        await base44.entities.PlayerSkill.create({
          player_id: playerData.id,
          skill_tree_id: skillTreeId,
          skill_name: skill.skill_name,
          is_unlocked: true,
          unlock_date: new Date().toISOString()
        });
      }

      // Deduct skill points
      await base44.entities.Player.update(playerData.id, {
        skill_points: playerData.skill_points - skill.cost_in_points
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerSkills']);
      queryClient.invalidateQueries(['player']);
      toast.success('Skill unlocked!');
    },
    onError: (error) => toast.error(error.message)
  });

  const groupedSkills = {};
  skillTree.forEach(skill => {
    if (!groupedSkills[skill.skill_type]) {
      groupedSkills[skill.skill_type] = [];
    }
    groupedSkills[skill.skill_type].push(skill);
  });

  Object.keys(groupedSkills).forEach(type => {
    groupedSkills[type].sort((a, b) => a.tier - b.tier);
  });

  const getSkillStatus = (skill) => {
    const playerSkill = playerSkills.find(s => s.skill_tree_id === skill.id);
    return playerSkill;
  };

  return (
    <div className="space-y-6">
      {/* Experience Progress */}
      {playerExp && (
        <Card className="glass-panel border-cyan-500/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span>Overall Progress</span>
              <Badge className="bg-cyan-600">Level {playerExp.current_level}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Experience to Level {playerExp.current_level + 1}</span>
                <span>{playerExp.current_level_experience}/{playerExp.experience_to_next_level}</span>
              </div>
              <Progress 
                value={(playerExp.current_level_experience / playerExp.experience_to_next_level) * 100}
                className="h-3"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
              <div>Total XP: <span className="text-cyan-400 font-semibold">{playerExp.total_experience}</span></div>
              <div>Available Points: <span className="text-purple-400 font-semibold">{playerData.skill_points}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Trees by Type */}
      <div className="space-y-6">
        {Object.entries(groupedSkills).map(([skillType, skills]) => (
          <Card key={skillType} className="glass-panel border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <span className="text-2xl">{skillIcons[skillType]}</span>
                <span className="capitalize">{skillType} Path</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skills.map((skill) => {
                  const playerSkill = getSkillStatus(skill);
                  const isUnlocked = playerSkill?.is_unlocked;
                  const canUnlock = (playerData.skill_points || 0) >= skill.cost_in_points && 
                                  (playerExp?.current_level || 1) >= skill.required_level &&
                                  !isUnlocked;

                  return (
                    <div
                      key={skill.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        isUnlocked
                          ? 'bg-slate-900/50 border-green-500/50'
                          : 'bg-slate-900/30 border-purple-500/30 hover:border-purple-500/50'
                      }`}
                      onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-white font-semibold">{skill.skill_name}</h4>
                            <Badge className={`text-xs ${isUnlocked ? 'bg-green-600' : 'bg-gray-600'}`}>
                              Tier {skill.tier}
                            </Badge>
                            {skill.cost_in_points && (
                              <Badge variant="outline" className="text-xs">
                                {skill.cost_in_points} pt
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{skill.description}</p>
                          
                          {playerSkill && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Mastery</span>
                                <span>{playerSkill.proficiency}/100</span>
                              </div>
                              <Progress value={playerSkill.proficiency} className="h-1.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {isUnlocked ? (
                            <Unlock className="w-5 h-5 text-green-400" />
                          ) : (
                            <Lock className="w-5 h-5 text-gray-500" />
                          )}
                          
                          {!isUnlocked && canUnlock && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                unlockSkillMutation.mutate(skill.id);
                              }}
                              disabled={unlockSkillMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700 text-xs h-8"
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              Unlock
                            </Button>
                          )}
                        </div>
                      </div>

                      {skill.passive_bonus && (
                        <div className="mt-3 p-2 bg-slate-800/50 rounded text-xs text-cyan-400">
                          <div className="font-semibold mb-1">Passive Bonus:</div>
                          <div>+{skill.passive_bonus.value} {skill.passive_bonus.bonus_type}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}