import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Users, Shield, Target, TrendingUp, Crown, Award, DollarSign, MapPin } from "lucide-react";

export default function SyndicatesPage() {
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
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

  const { data: syndicates = [] } = useQuery({
    queryKey: ['syndicates'],
    queryFn: () => base44.entities.Syndicate.list('-reputation', 50),
    refetchInterval: 10000
  });

  const { data: mySyndicate } = useQuery({
    queryKey: ['mySyndicate', playerData?.id],
    queryFn: async () => {
      const membership = await base44.entities.SyndicateMember.filter({
        player_id: playerData.id
      });
      if (membership.length > 0) {
        const syndicates = await base44.entities.Syndicate.filter({
          id: membership[0].syndicate_id
        });
        return { syndicate: syndicates[0], membership: membership[0] };
      }
      return null;
    },
    enabled: !!playerData?.id
  });

  const { data: syndicateGoals = [] } = useQuery({
    queryKey: ['syndicateGoals', mySyndicate?.syndicate?.id],
    queryFn: () => base44.entities.SyndicateGoal.filter({
      syndicate_id: mySyndicate.syndicate.id,
      status: 'active'
    }),
    enabled: !!mySyndicate?.syndicate?.id
  });

  const createSyndicateMutation = useMutation({
    mutationFn: async (data) => {
      const syndicate = await base44.entities.Syndicate.create({
        name: data.name,
        description: data.description,
        founder_id: playerData.id,
        leader_id: playerData.id,
        member_count: 1,
        reputation: 0
      });

      await base44.entities.SyndicateMember.create({
        syndicate_id: syndicate.id,
        player_id: playerData.id,
        player_username: playerData.username,
        rank: 'leader',
        permissions: {
          manage_members: true,
          manage_resources: true,
          declare_war: true,
          manage_goals: true
        }
      });

      return syndicate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['syndicates']);
      queryClient.invalidateQueries(['mySyndicate']);
      setCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
    }
  });

  const joinSyndicateMutation = useMutation({
    mutationFn: async (syndicateId) => {
      await base44.entities.SyndicateMember.create({
        syndicate_id: syndicateId,
        player_id: playerData.id,
        player_username: playerData.username,
        rank: 'recruit'
      });

      const syndicate = await base44.entities.Syndicate.filter({ id: syndicateId });
      await base44.entities.Syndicate.update(syndicateId, {
        member_count: (syndicate[0].member_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['syndicates']);
      queryClient.invalidateQueries(['mySyndicate']);
    }
  });

  const contributeMutation = useMutation({
    mutationFn: async (amount) => {
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - amount
      });

      await base44.entities.Syndicate.update(mySyndicate.syndicate.id, {
        shared_crypto: (mySyndicate.syndicate.shared_crypto || 0) + amount
      });

      await base44.entities.SyndicateMember.update(mySyndicate.membership.id, {
        total_contributed: (mySyndicate.membership.total_contributed || 0) + amount,
        contribution_points: (mySyndicate.membership.contribution_points || 0) + Math.floor(amount / 100)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['mySyndicate']);
    }
  });

  if (!playerData) {
    return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Criminal Syndicates</h1>
          <p className="text-slate-400">Form alliances and dominate the underworld</p>
        </div>
        {!mySyndicate && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Users className="w-4 h-4 mr-2" />
                Create Syndicate
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Syndicate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Syndicate Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  onClick={() => createSyndicateMutation.mutate(formData)}
                  disabled={!formData.name || createSyndicateMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Create Syndicate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {mySyndicate ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-panel border border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="glass-panel border-purple-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-purple-400" />
                    <div>
                      <CardTitle className="text-2xl text-white">{mySyndicate.syndicate.name}</CardTitle>
                      <p className="text-sm text-slate-400">{mySyndicate.syndicate.description}</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-600">
                    <Crown className="w-3 h-3 mr-1" />
                    {mySyndicate.membership.rank}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-slate-800/50">
                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                    <p className="text-2xl font-bold text-white">{mySyndicate.syndicate.member_count}</p>
                    <p className="text-xs text-slate-400">Members</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-800/50">
                    <Award className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                    <p className="text-2xl font-bold text-white">{mySyndicate.syndicate.reputation}</p>
                    <p className="text-xs text-slate-400">Reputation</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-800/50">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-400" />
                    <p className="text-2xl font-bold text-white">${(mySyndicate.syndicate.shared_crypto || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Shared Pool</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-800/50">
                    <MapPin className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                    <p className="text-2xl font-bold text-white">{mySyndicate.syndicate.territory_count}</p>
                    <p className="text-xs text-slate-400">Territories</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-white font-semibold mb-3">Contribute to Syndicate</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="bg-slate-800 border-slate-700 text-white"
                      id="contribute-amount"
                    />
                    <Button
                      onClick={() => {
                        const amount = parseInt(document.getElementById('contribute-amount').value);
                        if (amount > 0 && amount <= playerData.crypto_balance) {
                          contributeMutation.mutate(amount);
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Contribute
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Your contribution: ${(mySyndicate.membership.total_contributed || 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals">
            <div className="grid gap-4">
              {syndicateGoals.map((goal) => (
                <Card key={goal.id} className="glass-panel border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{goal.title}</CardTitle>
                      <Badge className="bg-blue-600">{goal.goal_type.replace(/_/g, ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm mb-4">{goal.description}</p>
                    <Progress value={(goal.current_value / goal.target_value) * 100} className="mb-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        {goal.current_value} / {goal.target_value}
                      </span>
                      <span className="text-green-400">
                        Reward: ${goal.reward_crypto.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card className="glass-panel border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Syndicate Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Member management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {syndicates.map((syndicate) => (
            <Card key={syndicate.id} className="glass-panel border-slate-700 hover:border-purple-500/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-white">{syndicate.name}</CardTitle>
                <p className="text-sm text-slate-400">{syndicate.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Members</span>
                    <span className="text-white font-semibold">{syndicate.member_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Reputation</span>
                    <span className="text-purple-400 font-semibold">{syndicate.reputation}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Level</span>
                    <span className="text-blue-400 font-semibold">{syndicate.level}</span>
                  </div>
                  <Button
                    onClick={() => joinSyndicateMutation.mutate(syndicate.id)}
                    disabled={!syndicate.is_recruiting || joinSyndicateMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Join Syndicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}