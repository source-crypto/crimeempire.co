import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import EquipmentSystem from '../components/progression/EquipmentSystem';
import { 
  User, TrendingUp, Star, Award, Settings, Crown,
  Zap, Shield, Target, Brain, Users, DollarSign, Package
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const { data: playerSkills = [] } = useQuery({
    queryKey: ['playerSkills', playerData?.id],
    queryFn: () => base44.entities.PlayerSkill.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: playerPerks = [] } = useQuery({
    queryKey: ['playerPerks', playerData?.id],
    queryFn: () => base44.entities.PlayerPerk.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: reputation } = useQuery({
    queryKey: ['reputation', playerData?.id],
    queryFn: async () => {
      const reps = await base44.entities.PlayerReputation.filter({ player_id: playerData.id });
      return reps[0] || null;
    },
    enabled: !!playerData?.id
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ field, value }) => {
      return base44.entities.Player.update(playerData.id, { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player'] });
      toast.success('Profile updated');
    }
  });

  const allocateSkillPointMutation = useMutation({
    mutationFn: ({ skillName }) => {
      const currentSkills = playerData.skills || {};
      const newSkills = {
        ...currentSkills,
        [skillName]: (currentSkills[skillName] || 1) + 1
      };
      return base44.entities.Player.update(playerData.id, {
        skills: newSkills,
        skill_points: playerData.skill_points - 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player'] });
      toast.success('Skill upgraded');
    }
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading player data...</p>
        </Card>
      </div>
    );
  }

  const skillIcons = {
    combat: Shield,
    stealth: Target,
    driving: Zap,
    hacking: Brain,
    leadership: Crown,
    negotiation: Users
  };

  const getLevelProgress = () => {
    const xpForNextLevel = playerData.level * 1000;
    return (playerData.experience / xpForNextLevel) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-purple-500/30 bg-gradient-to-r from-slate-900/50 via-purple-900/20 to-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-400 mb-2">Player Management</h1>
            <p className="text-gray-400">Customize and optimize your criminal character</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Level</div>
            <div className="text-4xl font-bold text-purple-400">{playerData.level}</div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20 flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-panel border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Crypto Balance</div>
                    <div className="text-2xl font-bold text-green-400">
                      ${(playerData.crypto_balance / 1000).toFixed(1)}k
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-400/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Buy Power</div>
                    <div className="text-2xl font-bold text-blue-400">
                      ${(playerData.buy_power / 1000).toFixed(1)}k
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-400/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-yellow-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Skill Points</div>
                    <div className="text-2xl font-bold text-yellow-400">{playerData.skill_points}</div>
                  </div>
                  <Star className="w-8 h-8 text-yellow-400/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Reputation</div>
                    <div className="text-2xl font-bold text-purple-400">{playerData.endgame_points}</div>
                  </div>
                  <Crown className="w-8 h-8 text-purple-400/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Character Info */}
          <Card className="glass-panel border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Character Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Username</div>
                  <div className="text-lg text-white font-semibold">{playerData.username}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Background</div>
                  <div className="text-lg text-purple-400 capitalize">{playerData.background_story || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Playstyle</div>
                  <Badge className="bg-cyan-600">{playerData.playstyle}</Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Wanted Level</div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < playerData.wanted_level ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {playerData.personality_traits && playerData.personality_traits.length > 0 && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Personality Traits</div>
                  <div className="flex flex-wrap gap-2">
                    {playerData.personality_traits.map((trait) => (
                      <Badge key={trait} variant="outline" className="border-purple-500/30 text-purple-300">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Level Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Level Progress</span>
                  <span className="text-white">{playerData.experience} / {playerData.level * 1000} XP</span>
                </div>
                <Progress value={getLevelProgress()} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Core Skills</span>
                <Badge className="bg-yellow-600 text-white">
                  {playerData.skill_points} Points Available
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(playerData.skills || {}).map(([skillName, level]) => {
                  const Icon = skillIcons[skillName] || Zap;
                  return (
                    <Card key={skillName} className="glass-panel border-purple-500/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-purple-400" />
                            <span className="text-white font-semibold capitalize">{skillName}</span>
                          </div>
                          <Badge className="bg-purple-600">Lv {level}</Badge>
                        </div>
                        <div className="mb-3">
                          <Progress value={(level / 10) * 100} className="h-2" />
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          disabled={playerData.skill_points === 0 || allocateSkillPointMutation.isPending}
                          onClick={() => allocateSkillPointMutation.mutate({ skillName })}
                        >
                          Upgrade (+1)
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Unlocked Perks */}
          {playerPerks.length > 0 && (
            <Card className="glass-panel border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white">Active Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {playerPerks.map((perk) => (
                    <div key={perk.id} className="glass-panel border-cyan-500/10 p-3 rounded-lg">
                      <div className="text-white font-semibold">{perk.perk_name}</div>
                      <div className="text-sm text-gray-400">{perk.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="glass-panel border-green-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-gray-400 mb-1">Heists Completed</div>
                <div className="text-3xl font-bold text-green-400">
                  {playerData.stats?.heists_completed || 0}
                </div>
                <div className="text-xs text-red-400 mt-1">
                  Failed: {playerData.stats?.heists_failed || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-blue-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-gray-400 mb-1">Battles Won</div>
                <div className="text-3xl font-bold text-blue-400">
                  {playerData.stats?.battles_won || 0}
                </div>
                <div className="text-xs text-red-400 mt-1">
                  Lost: {playerData.stats?.battles_lost || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-yellow-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-gray-400 mb-1">Territories</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {playerData.stats?.territories_captured || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-purple-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-gray-400 mb-1">Total Loot</div>
                <div className="text-3xl font-bold text-purple-400">
                  ${((playerData.stats?.total_loot || 0) / 1000).toFixed(0)}k
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-cyan-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-gray-400 mb-1">Contracts Done</div>
                <div className="text-3xl font-bold text-cyan-400">
                  {playerData.stats?.contracts_completed || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-pink-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-gray-400 mb-1">Items Traded</div>
                <div className="text-3xl font-bold text-pink-400">
                  {playerData.stats?.items_traded || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Win Rate Analysis */}
          <Card className="glass-panel border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Heist Success Rate</span>
                  <span className="text-white">
                    {playerData.stats?.heists_completed > 0
                      ? Math.round((playerData.stats.heists_completed / (playerData.stats.heists_completed + (playerData.stats.heists_failed || 0))) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={playerData.stats?.heists_completed > 0
                    ? (playerData.stats.heists_completed / (playerData.stats.heists_completed + (playerData.stats.heists_failed || 0))) * 100
                    : 0} 
                  className="h-2" 
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Combat Win Rate</span>
                  <span className="text-white">
                    {playerData.stats?.battles_won > 0
                      ? Math.round((playerData.stats.battles_won / (playerData.stats.battles_won + (playerData.stats.battles_lost || 0))) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={playerData.stats?.battles_won > 0
                    ? (playerData.stats.battles_won / (playerData.stats.battles_won + (playerData.stats.battles_lost || 0))) * 100
                    : 0} 
                  className="h-2" 
                />
              </div>

              <div className="pt-4 border-t border-purple-500/20">
                <div className="text-sm text-gray-400 mb-2">Current Playstyle</div>
                <Badge className="bg-gradient-to-r from-purple-600 to-cyan-600">
                  {playerData.playstyle}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Reputation */}
          {reputation && (
            <Card className="glass-panel border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white">Reputation Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Respect Score</span>
                  <span className="text-2xl font-bold text-cyan-400">{reputation.respect_score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fear Score</span>
                  <span className="text-2xl font-bold text-red-400">{reputation.fear_score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Notoriety</span>
                  <span className="text-2xl font-bold text-purple-400">{reputation.notoriety}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Skill Allocation</span>
                <Badge className="bg-yellow-600">{playerData.skill_points} Points Available</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(playerData.skills || {}).map(([skillName, level]) => {
                  const Icon = skillIcons[skillName] || Zap;
                  const maxLevel = 10;
                  const progress = (level / maxLevel) * 100;

                  return (
                    <Card key={skillName} className="glass-panel border-purple-500/10">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="text-white font-semibold capitalize">{skillName}</div>
                              <div className="text-xs text-gray-400">Level {level}/{maxLevel}</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={playerData.skill_points === 0 || level >= maxLevel}
                            onClick={() => allocateSkillPointMutation.mutate({ skillName })}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            +1
                          </Button>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Skills */}
          {playerSkills.length > 0 && (
            <Card className="glass-panel border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white">Advanced Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {playerSkills.map((skill) => (
                    <div key={skill.id} className="glass-panel border-cyan-500/10 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold">{skill.skill_name}</span>
                        <Badge className="bg-cyan-600">Lv {skill.current_level}</Badge>
                      </div>
                      <Progress value={(skill.current_level / (skill.max_level || 10)) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Detailed Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(playerData.stats || {}).map(([statName, value]) => (
                  <div key={statName} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30">
                    <span className="text-gray-300 capitalize">
                      {statName.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white font-bold text-lg">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white">Earnings Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Earnings</span>
                <span className="text-2xl font-bold text-green-400">
                  ${(playerData.total_earnings / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Territory Count</span>
                <span className="text-2xl font-bold text-blue-400">{playerData.territory_count}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-4">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Character Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {playerData.character_appearance && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-900/30">
                    <div className="text-sm text-gray-400 mb-1">Skin Tone</div>
                    <div className="text-white capitalize">{playerData.character_appearance.skin_tone}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/30">
                    <div className="text-sm text-gray-400 mb-1">Hair Style</div>
                    <div className="text-white capitalize">{playerData.character_appearance.hair_style}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/30">
                    <div className="text-sm text-gray-400 mb-1">Outfit</div>
                    <div className="text-white capitalize">{playerData.character_appearance.outfit}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/30">
                    <div className="text-sm text-gray-400 mb-1">Accessory</div>
                    <div className="text-white capitalize">{playerData.character_appearance.accessory}</div>
                  </div>
                </div>
              )}

              {playerData.reputation_titles && playerData.reputation_titles.length > 0 && (
                <div>
                  <Label className="text-gray-300 mb-3 block">Earned Titles</Label>
                  <div className="flex flex-wrap gap-2">
                    {playerData.reputation_titles.map((title, idx) => (
                      <Badge key={idx} className="bg-gradient-to-r from-yellow-600 to-orange-600">
                        <Award className="w-3 h-3 mr-1" />
                        {title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Update Username</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="New username..."
                  className="bg-slate-900/50 border-purple-500/20 text-white"
                  defaultValue={playerData.username}
                  id="new-username"
                />
                <Button
                  onClick={() => {
                    const newName = document.getElementById('new-username').value;
                    if (newName.trim()) {
                      updatePlayerMutation.mutate({ field: 'username', value: newName.trim() });
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}