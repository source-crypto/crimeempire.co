import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sword, Eye, Brain, Users, Zap, Star, TrendingUp, 
  Shield, Target, Lock, Unlock 
} from "lucide-react";

const skillCategories = {
  combat: {
    icon: Sword,
    color: "text-red-400",
    skills: {
      melee_mastery: { name: "Melee Mastery", max: 5, bonus: "+10% melee damage per level" },
      firearms_expert: { name: "Firearms Expert", max: 5, bonus: "+8% ranged damage per level" },
      tactical_positioning: { name: "Tactical Positioning", max: 3, bonus: "+15% defense per level" }
    }
  },
  stealth: {
    icon: Eye,
    color: "text-purple-400",
    skills: {
      shadow_movement: { name: "Shadow Movement", max: 5, bonus: "+12% stealth effectiveness" },
      lockpicking: { name: "Lockpicking", max: 4, bonus: "Unlock advanced areas" },
      disguise_master: { name: "Disguise Master", max: 3, bonus: "Blend in anywhere" }
    }
  },
  intelligence: {
    icon: Brain,
    color: "text-blue-400",
    skills: {
      hacking_advanced: { name: "Advanced Hacking", max: 5, bonus: "Hack complex systems" },
      strategic_planning: { name: "Strategic Planning", max: 4, bonus: "+10% heist success" },
      market_analysis: { name: "Market Analysis", max: 3, bonus: "+20% trading profits" }
    }
  },
  leadership: {
    icon: Users,
    color: "text-yellow-400",
    skills: {
      crew_inspiration: { name: "Crew Inspiration", max: 5, bonus: "+15% crew performance" },
      negotiation_master: { name: "Negotiation Master", max: 4, bonus: "Better deals" },
      resource_management: { name: "Resource Management", max: 3, bonus: "+25% passive income" }
    }
  },
  agility: {
    icon: Zap,
    color: "text-green-400",
    skills: {
      parkour: { name: "Parkour", max: 5, bonus: "Escape easier" },
      driving_expert: { name: "Driving Expert", max: 4, bonus: "+20% vehicle speed" },
      quick_reflexes: { name: "Quick Reflexes", max: 3, bonus: "Dodge attacks" }
    }
  }
};

export default function SkillsPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: playerSkills } = useQuery({
    queryKey: ['playerSkills', playerData?.id],
    queryFn: async () => {
      const skills = await base44.entities.PlayerSkill.filter({ player_id: playerData.id });
      if (skills.length === 0) {
        return await base44.entities.PlayerSkill.create({
          player_id: playerData.id,
          skill_tree: {
            combat: { melee_mastery: 0, firearms_expert: 0, tactical_positioning: 0 },
            stealth: { shadow_movement: 0, lockpicking: 0, disguise_master: 0 },
            intelligence: { hacking_advanced: 0, strategic_planning: 0, market_analysis: 0 },
            leadership: { crew_inspiration: 0, negotiation_master: 0, resource_management: 0 },
            agility: { parkour: 0, driving_expert: 0, quick_reflexes: 0 }
          },
          available_points: 5,
          total_points_spent: 0
        });
      }
      return skills[0];
    },
    enabled: !!playerData?.id
  });

  const upgradeSkillMutation = useMutation({
    mutationFn: async ({ category, skillKey }) => {
      const currentLevel = playerSkills.skill_tree[category][skillKey] || 0;
      const maxLevel = skillCategories[category].skills[skillKey].max;

      if (currentLevel >= maxLevel) {
        throw new Error("Skill at max level");
      }

      if (playerSkills.available_points < 1) {
        throw new Error("No skill points available");
      }

      const updatedSkillTree = { ...playerSkills.skill_tree };
      updatedSkillTree[category] = {
        ...updatedSkillTree[category],
        [skillKey]: currentLevel + 1
      };

      await base44.entities.PlayerSkill.update(playerSkills.id, {
        skill_tree: updatedSkillTree,
        available_points: playerSkills.available_points - 1,
        total_points_spent: (playerSkills.total_points_spent || 0) + 1
      });

      // Update player attributes
      const playerUpdate = {};
      if (category === 'combat') {
        playerUpdate.strength_score = (playerData.strength_score || 10) + 2;
      } else if (category === 'intelligence' || category === 'leadership') {
        playerUpdate.endgame_points = (playerData.endgame_points || 0) + 50;
      }

      if (Object.keys(playerUpdate).length > 0) {
        await base44.entities.Player.update(playerData.id, playerUpdate);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerSkills']);
      queryClient.invalidateQueries(['player']);
    }
  });

  if (!playerData || !playerSkills) {
    return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Skill Tree</h1>
          <p className="text-slate-400">Customize your criminal mastermind</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Available Points</p>
          <p className="text-3xl font-bold text-purple-400">{playerSkills.available_points}</p>
        </div>
      </div>

      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white">Player Attributes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-slate-800/50">
              <Sword className="w-6 h-6 mx-auto mb-1 text-red-400" />
              <p className="text-xs text-slate-400">Strength</p>
              <p className="text-xl font-bold text-white">{playerData.strength_score || 10}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/50">
              <Zap className="w-6 h-6 mx-auto mb-1 text-green-400" />
              <p className="text-xs text-slate-400">Agility</p>
              <p className="text-xl font-bold text-white">
                {(playerSkills.skill_tree.agility?.parkour || 0) + 
                 (playerSkills.skill_tree.agility?.driving_expert || 0) + 5}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/50">
              <Brain className="w-6 h-6 mx-auto mb-1 text-blue-400" />
              <p className="text-xs text-slate-400">Intelligence</p>
              <p className="text-xl font-bold text-white">
                {(playerSkills.skill_tree.intelligence?.hacking_advanced || 0) + 
                 (playerSkills.skill_tree.intelligence?.strategic_planning || 0) + 5}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/50">
              <Eye className="w-6 h-6 mx-auto mb-1 text-purple-400" />
              <p className="text-xs text-slate-400">Stealth</p>
              <p className="text-xl font-bold text-white">
                {(playerSkills.skill_tree.stealth?.shadow_movement || 0) + 
                 (playerSkills.skill_tree.stealth?.lockpicking || 0) + 5}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/50">
              <Users className="w-6 h-6 mx-auto mb-1 text-yellow-400" />
              <p className="text-xs text-slate-400">Leadership</p>
              <p className="text-xl font-bold text-white">
                {(playerSkills.skill_tree.leadership?.crew_inspiration || 0) + 
                 (playerSkills.skill_tree.leadership?.negotiation_master || 0) + 5}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="combat" className="space-y-4">
        <TabsList className="glass-panel border border-slate-700">
          {Object.entries(skillCategories).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={key} value={key}>
                <Icon className={`w-4 h-4 mr-2 ${category.color}`} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(skillCategories).map(([categoryKey, category]) => (
          <TabsContent key={categoryKey} value={categoryKey}>
            <div className="grid gap-4">
              {Object.entries(category.skills).map(([skillKey, skill]) => {
                const currentLevel = playerSkills.skill_tree[categoryKey]?.[skillKey] || 0;
                const maxLevel = skill.max;
                const Icon = category.icon;

                return (
                  <Card key={skillKey} className="glass-panel border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-6 h-6 ${category.color}`} />
                          <div>
                            <CardTitle className="text-white">{skill.name}</CardTitle>
                            <p className="text-sm text-slate-400">{skill.bonus}</p>
                          </div>
                        </div>
                        <Badge className={currentLevel === maxLevel ? "bg-green-600" : "bg-slate-600"}>
                          Level {currentLevel}/{maxLevel}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Progress value={(currentLevel / maxLevel) * 100} className="flex-1" />
                        <Button
                          onClick={() => upgradeSkillMutation.mutate({ category: categoryKey, skillKey })}
                          disabled={
                            currentLevel >= maxLevel || 
                            playerSkills.available_points < 1 ||
                            upgradeSkillMutation.isPending
                          }
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {currentLevel >= maxLevel ? (
                            <><Lock className="w-4 h-4 mr-1" /> Max</>
                          ) : (
                            <><Star className="w-4 h-4 mr-1" /> Upgrade</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}