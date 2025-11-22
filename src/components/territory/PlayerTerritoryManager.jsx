import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Shield, TrendingUp, Users, Zap, Loader2, Target, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerTerritoryManager({ playerData }) {
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [assignmentType, setAssignmentType] = useState('territory_defense');
  const queryClient = useQueryClient();

  const { data: territories = [] } = useQuery({
    queryKey: ['playerTerritories', playerData?.crew_id],
    queryFn: () => base44.entities.Territory.filter({ controlling_crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
    refetchInterval: 10000
  });

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', playerData?.crew_id],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['territoryAssignments', selectedTerritory?.id],
    queryFn: () => base44.entities.CrewAssignment.filter({ 
      assigned_to_id: selectedTerritory.id,
      status: 'active'
    }),
    enabled: !!selectedTerritory?.id
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['territoryEnterprises', selectedTerritory?.id],
    queryFn: async () => {
      const all = await base44.entities.CriminalEnterprise.list();
      return all.filter(e => e.territory_id === selectedTerritory.id);
    },
    enabled: !!selectedTerritory?.id
  });

  const { data: marketItems = [] } = useQuery({
    queryKey: ['territoryMarketItems', selectedTerritory?.id],
    queryFn: () => base44.entities.Item.filter({ 
      location: selectedTerritory.id,
      owner_type: 'territory'
    }),
    enabled: !!selectedTerritory?.id
  });

  const aiSuggestAssignmentMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Suggest optimal crew member assignment for territory defense/management.

Territory: ${selectedTerritory.name}
Type: ${selectedTerritory.resource_type}
Control: ${selectedTerritory.control_percentage}%
Defense: ${selectedTerritory.defense_level}
Current Assignments: ${assignments.length}

Available Crew Members:
${crewMembers.map(m => `- ${m.member_name} (${m.member_type}): Combat ${m.skills?.combat || 0}, Leadership ${m.skills?.leadership || 0}, Loyalty ${m.loyalty}/100`).join('\n')}

Recommend:
1. Best member for this territory
2. Assignment type (defense/management/patrol)
3. Expected efficiency
4. Reasoning`;

      const suggestion = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_member_name: { type: "string" },
            assignment_type: { type: "string" },
            efficiency_score: { type: "number" },
            reasoning: { type: "string" }
          }
        }
      });

      return suggestion;
    },
    onSuccess: (data) => {
      const member = crewMembers.find(m => m.member_name === data.recommended_member_name);
      if (member) {
        setSelectedMember(member.id);
        setAssignmentType(data.assignment_type);
      }
      toast.success(`AI suggests: ${data.recommended_member_name}`);
    }
  });

  const assignMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember) throw new Error('Select a crew member');

      const member = crewMembers.find(m => m.id === selectedMember);
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 24);

      await base44.entities.CrewAssignment.create({
        crew_member_id: member.id,
        crew_member_name: member.member_name,
        assignment_type: assignmentType,
        assigned_to_id: selectedTerritory.id,
        assigned_to_name: selectedTerritory.name,
        crew_id: playerData.crew_id,
        efficiency_score: 75,
        workload: 50,
        status: 'active',
        started_at: new Date().toISOString(),
        ends_at: endsAt.toISOString()
      });

      if (assignmentType === 'territory_defense') {
        await base44.entities.Territory.update(selectedTerritory.id, {
          defense_level: (selectedTerritory.defense_level || 0) + 10
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryAssignments']);
      queryClient.invalidateQueries(['playerTerritories']);
      toast.success('Crew member assigned');
      setSelectedMember('');
    }
  });

  if (!playerData?.crew_id) {
    return (
      <Card className="glass-panel border-purple-500/20 p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-30" />
        <p className="text-gray-400">Join a crew to manage territories</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Territory List */}
      <Card className="glass-panel border-purple-500/20 lg:col-span-1">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            Your Territories
            <Badge className="ml-auto bg-purple-600">{territories.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {territories.map((territory) => (
              <button
                key={territory.id}
                onClick={() => setSelectedTerritory(territory)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  selectedTerritory?.id === territory.id
                    ? 'bg-purple-600/30 border-2 border-purple-500/50'
                    : 'bg-slate-900/30 border border-purple-500/10 hover:bg-slate-900/50'
                }`}
              >
                <h4 className="font-semibold text-white mb-1">{territory.name}</h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 capitalize">{territory.resource_type}</span>
                  <Badge className="bg-green-600">{territory.control_percentage}%</Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Territory Details */}
      {selectedTerritory ? (
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="text-white">{selectedTerritory.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/10">
                  <Shield className="w-4 h-4 text-blue-400 mb-1" />
                  <p className="text-xs text-gray-400">Defense</p>
                  <p className="text-lg font-bold text-white">{selectedTerritory.defense_level || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/10">
                  <TrendingUp className="w-4 h-4 text-green-400 mb-1" />
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-lg font-bold text-white">{selectedTerritory.revenue_multiplier?.toFixed(1)}x</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/10">
                  <Users className="w-4 h-4 text-cyan-400 mb-1" />
                  <p className="text-xs text-gray-400">Assigned</p>
                  <p className="text-lg font-bold text-white">{assignments.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/10">
                  <Package className="w-4 h-4 text-yellow-400 mb-1" />
                  <p className="text-xs text-gray-400">Enterprises</p>
                  <p className="text-lg font-bold text-white">{enterprises.length}</p>
                </div>
              </div>

              <Tabs defaultValue="assign" className="mt-4">
                <TabsList className="bg-slate-900/50">
                  <TabsTrigger value="assign">Assign Crew</TabsTrigger>
                  <TabsTrigger value="assigned">Current Assignments</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                </TabsList>

                <TabsContent value="assign" className="space-y-3 mt-3">
                  <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                    <h4 className="text-white font-semibold mb-2 text-sm">AI Suggestion</h4>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                      onClick={() => aiSuggestAssignmentMutation.mutate()}
                      disabled={aiSuggestAssignmentMutation.isPending}
                    >
                      {aiSuggestAssignmentMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" /> Get AI Suggestion</>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Select value={selectedMember} onValueChange={setSelectedMember}>
                      <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                        <SelectValue placeholder="Select crew member" />
                      </SelectTrigger>
                      <SelectContent>
                        {crewMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.member_name} - Combat: {member.skills?.combat || 0}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={assignmentType} onValueChange={setAssignmentType}>
                      <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="territory_defense">Defense</SelectItem>
                        <SelectItem value="enterprise_management">Management</SelectItem>
                        <SelectItem value="intelligence">Intelligence</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
                      onClick={() => assignMemberMutation.mutate()}
                      disabled={assignMemberMutation.isPending || !selectedMember}
                    >
                      {assignMemberMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</>
                      ) : (
                        <><Target className="w-4 h-4 mr-2" /> Assign Member</>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="assigned" className="mt-3">
                  {assignments.length === 0 ? (
                    <p className="text-center text-gray-400 py-4 text-sm">No assignments</p>
                  ) : (
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold text-sm">{assignment.crew_member_name}</p>
                              <p className="text-xs text-gray-400 capitalize">{assignment.assignment_type.replace('_', ' ')}</p>
                            </div>
                            <Badge className="bg-green-600">{assignment.efficiency_score}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="resources" className="mt-3">
                  <div className="space-y-3">
                    {enterprises.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-2 text-sm">Enterprises</h4>
                        {enterprises.map((ent) => (
                          <div key={ent.id} className="p-2 rounded bg-green-900/20 border border-green-500/20 mb-2">
                            <p className="text-sm text-white">{ent.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{ent.type}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {marketItems.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-2 text-sm">Stored Items</h4>
                        {marketItems.map((item) => (
                          <div key={item.id} className="p-2 rounded bg-blue-900/20 border border-blue-500/20 mb-2">
                            <p className="text-sm text-white">{item.name} x{item.quantity}</p>
                            <p className="text-xs text-cyan-400">${item.current_market_value?.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="lg:col-span-2">
          <Card className="glass-panel border-purple-500/20 h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400">Select a territory to manage</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}