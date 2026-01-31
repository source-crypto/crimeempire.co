import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Shield, Crown, TrendingUp, DollarSign, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function FactionManagement({ playerData }) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFactionName, setNewFactionName] = useState('');
  const [selectedFaction, setSelectedFaction] = useState(null);

  const { data: playerFaction } = useQuery({
    queryKey: ['playerFaction', playerData.id],
    queryFn: async () => {
      const members = await base44.entities.FactionMember.filter({ 
        player_id: playerData.id 
      });
      if (members.length > 0) {
        const factions = await base44.entities.Faction.filter({ 
          id: members[0].faction_id 
        });
        return { faction: factions[0], membership: members[0] };
      }
      return null;
    }
  });

  const { data: allFactions = [] } = useQuery({
    queryKey: ['allFactions'],
    queryFn: () => base44.entities.Faction.list()
  });

  const { data: factionMembers = [] } = useQuery({
    queryKey: ['factionMembers', playerFaction?.faction?.id],
    queryFn: () => base44.entities.FactionMember.filter({ 
      faction_id: playerFaction.faction.id 
    }),
    enabled: !!playerFaction?.faction?.id
  });

  const createFactionMutation = useMutation({
    mutationFn: async () => {
      const cost = 100000;
      if (playerData.crypto_balance < cost) {
        throw new Error('Need $100,000 to create faction');
      }

      const faction = await base44.entities.Faction.create({
        name: newFactionName,
        faction_type: 'syndicate',
        leader_id: playerData.id,
        founder_player_id: playerData.id,
        member_count: 1,
        total_power: playerData.strength_score,
        ai_personality: {
          aggression: 50,
          diplomacy: 50,
          greed: 50,
          loyalty: 100,
          strategic_focus: 'expansion'
        }
      });

      await base44.entities.FactionMember.create({
        faction_id: faction.id,
        player_id: playerData.id,
        rank: 'leader',
        joined_date: new Date().toISOString(),
        permissions: ['all'],
        loyalty_score: 100
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      return faction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerFaction']);
      queryClient.invalidateQueries(['allFactions']);
      queryClient.invalidateQueries(['player']);
      toast.success('Faction created!');
      setShowCreateForm(false);
      setNewFactionName('');
    },
    onError: (error) => toast.error(error.message)
  });

  const joinFactionMutation = useMutation({
    mutationFn: async (faction) => {
      await base44.entities.FactionMember.create({
        faction_id: faction.id,
        player_id: playerData.id,
        rank: 'associate',
        joined_date: new Date().toISOString(),
        loyalty_score: 50
      });

      await base44.entities.Faction.update(faction.id, {
        member_count: faction.member_count + 1,
        total_power: faction.total_power + playerData.strength_score
      });

      return faction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerFaction']);
      queryClient.invalidateQueries(['allFactions']);
      toast.success('Joined faction!');
    },
    onError: (error) => toast.error(error.message)
  });

  if (playerFaction) {
    const { faction, membership } = playerFaction;
    
    return (
      <div className="space-y-6">
        <Card className="glass-panel border-purple-500/30">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                {faction.name}
              </div>
              <Badge className="bg-purple-600">{membership.rank}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Members</span>
                </div>
                <p className="text-lg font-bold text-white">{faction.member_count}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-gray-400">Power</span>
                </div>
                <p className="text-lg font-bold text-white">{faction.total_power}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-400">Territories</span>
                </div>
                <p className="text-lg font-bold text-white">{faction.territory_count}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-gray-400">Treasury</span>
                </div>
                <p className="text-lg font-bold text-white">${faction.treasury?.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <h4 className="text-sm font-semibold text-white mb-2">Faction Profile</h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">Type: <span className="text-white">{faction.faction_type}</span></p>
                <p className="text-gray-400">Specialization: <span className="text-white">{faction.specialization}</span></p>
                <p className="text-gray-400">Reputation: <span className="text-purple-400">{faction.reputation}</span></p>
                <p className="text-gray-400">Influence: <span className="text-purple-400">Level {faction.influence_level}</span></p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Members ({factionMembers.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {factionMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-white">Player {member.player_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{member.rank}</Badge>
                      <span className="text-xs text-gray-400">{member.contribution_points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="glass-panel border-purple-500/30">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white">Join or Create Faction</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {!showCreateForm ? (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
          >
            <Crown className="w-4 h-4 mr-2" />
            Create New Faction ($100,000)
          </Button>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Faction name"
              value={newFactionName}
              onChange={(e) => setNewFactionName(e.target.value)}
              className="bg-slate-900/50 border-purple-500/30"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => createFactionMutation.mutate()}
                disabled={!newFactionName || createFactionMutation.isPending}
                className="flex-1 bg-purple-600"
              >
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-purple-500/20 pt-4">
          <h3 className="text-sm font-semibold text-white mb-3">Available Factions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allFactions.map(faction => (
              <div key={faction.id} className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{faction.name}</h4>
                  <Badge>{faction.faction_type}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex gap-3">
                    <span className="text-gray-400">Members: {faction.member_count}</span>
                    <span className="text-gray-400">Power: {faction.total_power}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => joinFactionMutation.mutate(faction)}
                    disabled={joinFactionMutation.isPending}
                  >
                    Join
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}