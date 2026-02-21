import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, AlertTriangle, Shield, Eye, FileText, Target, 
  Clock, DollarSign, TrendingUp, Plus, X, CheckCircle 
} from 'lucide-react';
import { toast } from 'sonner';

export default function InvestigationsPage() {
  const [user, setUser] = useState(null);
  const [showNewInvestigation, setShowNewInvestigation] = useState(false);
  const [newInv, setNewInv] = useState({
    type: 'player_initiated',
    targetUsername: '',
    title: '',
    description: '',
    priority: 'medium',
    budget: 5000
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: player } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: investigations = [] } = useQuery({
    queryKey: ['investigations'],
    queryFn: () => base44.entities.Investigation.list('-created_date', 100)
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.Case.list('-created_date', 50)
  });

  const createInvestigationMutation = useMutation({
    mutationFn: async (invData) => {
      const targetPlayers = await base44.entities.Player.filter({ 
        username: invData.targetUsername 
      });
      
      if (targetPlayers.length === 0) {
        throw new Error('Target player not found');
      }

      const target = targetPlayers[0];

      return await base44.entities.Investigation.create({
        investigation_type: invData.type,
        target_player_id: target.id,
        target_player_username: target.username,
        investigator_id: player.id,
        investigator_name: player.username,
        case_title: invData.title,
        case_description: invData.description,
        priority: invData.priority,
        budget_allocated: invData.budget,
        status: 'active',
        estimated_completion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tags: invData.type === 'law_enforcement' ? ['LE', 'Official'] : ['Private']
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investigations']);
      toast.success('Investigation initiated!');
      setShowNewInvestigation(false);
      setNewInv({
        type: 'player_initiated',
        targetUsername: '',
        title: '',
        description: '',
        priority: 'medium',
        budget: 5000
      });
    },
    onError: (error) => toast.error(error.message)
  });

  const updateInvestigationMutation = useMutation({
    mutationFn: async ({ invId, updates }) => {
      return await base44.entities.Investigation.update(invId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investigations']);
      toast.success('Investigation updated');
    }
  });

  // Filter investigations
  const myInvestigations = investigations.filter(i => i.investigator_id === player?.id);
  const againstMe = investigations.filter(i => i.target_player_id === player?.id);
  const leInvestigations = investigations.filter(i => i.investigation_type === 'law_enforcement');

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'suspended': return 'bg-gray-600';
      case 'escalated': return 'bg-red-600';
      default: return 'bg-blue-600';
    }
  };

  if (!player) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-400 animate-spin" />
          <p className="text-gray-400">Loading investigations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600/20 rounded-lg">
                <Search className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <CardTitle className="text-white text-2xl">Investigation Hub</CardTitle>
                <p className="text-gray-400 text-sm">Track all investigations and cases</p>
              </div>
            </div>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setShowNewInvestigation(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Investigation
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">My Investigations</p>
                <p className="text-white text-2xl font-bold">{myInvestigations.length}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Against Me</p>
                <p className="text-white text-2xl font-bold">{againstMe.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">LE Active</p>
                <p className="text-white text-2xl font-bold">
                  {leInvestigations.filter(i => i.status === 'active').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Cases</p>
                <p className="text-white text-2xl font-bold">{cases.length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Investigation Form */}
      {showNewInvestigation && (
        <Card className="glass-panel border-cyan-500/20">
          <CardHeader className="border-b border-cyan-500/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">New Investigation</CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowNewInvestigation(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Investigation Type</label>
              <select
                value={newInv.type}
                onChange={(e) => setNewInv({ ...newInv, type: e.target.value })}
                className="w-full p-2 rounded bg-slate-900/50 border border-cyan-500/20 text-white"
              >
                <option value="player_initiated">Player Initiated</option>
                <option value="detective_case">Detective Case</option>
                <option value="law_enforcement">Law Enforcement</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Target Username</label>
              <Input
                placeholder="Enter target username"
                value={newInv.targetUsername}
                onChange={(e) => setNewInv({ ...newInv, targetUsername: e.target.value })}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Case Title</label>
              <Input
                placeholder="Investigation title"
                value={newInv.title}
                onChange={(e) => setNewInv({ ...newInv, title: e.target.value })}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Description</label>
              <Textarea
                placeholder="Investigation details..."
                value={newInv.description}
                onChange={(e) => setNewInv({ ...newInv, description: e.target.value })}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Priority</label>
                <select
                  value={newInv.priority}
                  onChange={(e) => setNewInv({ ...newInv, priority: e.target.value })}
                  className="w-full p-2 rounded bg-slate-900/50 border border-cyan-500/20 text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Budget</label>
                <Input
                  type="number"
                  value={newInv.budget}
                  onChange={(e) => setNewInv({ ...newInv, budget: parseInt(e.target.value) })}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                />
              </div>
            </div>

            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              onClick={() => createInvestigationMutation.mutate(newInv)}
              disabled={!newInv.targetUsername || !newInv.title || createInvestigationMutation.isPending}
            >
              Launch Investigation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Investigations List */}
      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="glass-panel border border-cyan-500/20">
          <TabsTrigger value="mine">My Investigations</TabsTrigger>
          <TabsTrigger value="against">
            Against Me
            {againstMe.length > 0 && (
              <Badge className="ml-2 bg-red-600">{againstMe.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="le">Law Enforcement</TabsTrigger>
          <TabsTrigger value="all">All Active</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-4 mt-4">
          {myInvestigations.length === 0 ? (
            <Card className="glass-panel border-gray-500/20">
              <CardContent className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400">No active investigations</p>
              </CardContent>
            </Card>
          ) : (
            myInvestigations.map((inv) => (
              <Card key={inv.id} className="glass-panel border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold text-lg">{inv.case_title}</h3>
                        <Badge className={getPriorityColor(inv.priority)}>{inv.priority}</Badge>
                        <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{inv.case_description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Target: {inv.target_player_username}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${inv.budget_spent?.toLocaleString() || 0} / ${inv.budget_allocated?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(inv.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white font-semibold">{inv.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={inv.progress_percentage || 0} className="h-2" />
                  </div>

                  {inv.evidence_collected && inv.evidence_collected.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-xs text-gray-400 mb-2">Evidence Collected: {inv.evidence_collected.length} items</p>
                      <div className="flex flex-wrap gap-1">
                        {inv.evidence_collected.slice(0, 3).map((ev, idx) => (
                          <Badge key={idx} className="bg-blue-600/30 text-xs">{ev.evidence_type}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 border-cyan-500/30">
                      View Details
                    </Button>
                    {inv.status === 'active' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600"
                        onClick={() => updateInvestigationMutation.mutate({
                          invId: inv.id,
                          updates: { status: 'closed', outcome: 'Investigation completed' }
                        })}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Close Case
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="against" className="space-y-4 mt-4">
          {againstMe.length === 0 ? (
            <Card className="glass-panel border-gray-500/20">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="text-gray-400">No investigations against you</p>
              </CardContent>
            </Card>
          ) : (
            againstMe.map((inv) => (
              <Card key={inv.id} className="glass-panel border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h3 className="text-white font-semibold">{inv.case_title}</h3>
                        <Badge className={getPriorityColor(inv.priority)}>{inv.priority}</Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{inv.case_description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Investigator: {inv.investigator_name}</span>
                        <span>Risk Level: {inv.risk_level || 0}/100</span>
                      </div>
                    </div>
                  </div>

                  {inv.discovered_activities && inv.discovered_activities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-500/20">
                      <p className="text-xs text-red-400 mb-2">Discovered Activities:</p>
                      <div className="flex flex-wrap gap-1">
                        {inv.discovered_activities.map((act, idx) => (
                          <Badge key={idx} className="bg-red-600/30 text-xs">{act}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="le" className="space-y-4 mt-4">
          {leInvestigations.length === 0 ? (
            <Card className="glass-panel border-gray-500/20">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400">No law enforcement investigations</p>
              </CardContent>
            </Card>
          ) : (
            leInvestigations.map((inv) => (
              <Card key={inv.id} className="glass-panel border-orange-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-orange-400" />
                    <h3 className="text-white font-semibold">{inv.case_title}</h3>
                    <Badge className="bg-orange-600">Official LE</Badge>
                    <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
                  </div>
                  <p className="text-gray-400 text-sm">Target: {inv.target_player_username}</p>
                  <Progress value={inv.progress_percentage || 0} className="h-2 mt-3" />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {investigations.filter(i => i.status === 'active').length === 0 ? (
            <Card className="glass-panel border-gray-500/20">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400">No active investigations</p>
              </CardContent>
            </Card>
          ) : (
            investigations.filter(i => i.status === 'active').map((inv) => (
              <Card key={inv.id} className="glass-panel border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold">{inv.case_title}</h3>
                    <Badge className={getPriorityColor(inv.priority)}>{inv.priority}</Badge>
                    <Badge className="bg-purple-600">{inv.investigation_type.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Target: {inv.target_player_username}</span>
                    <span>By: {inv.investigator_name}</span>
                    <span>Progress: {inv.progress_percentage || 0}%</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}