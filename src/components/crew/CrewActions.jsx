import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserPlus, UserMinus, Crown, Loader2, Mail
} from 'lucide-react';
import { toast } from 'sonner';

export default function CrewActions({ crewId, playerData, canManage }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: () => base44.entities.Player.filter({ crew_id: crewId }),
    enabled: !!crewId
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async () => {
      if (!inviteEmail) throw new Error('Enter an email address');

      await base44.integrations.Core.SendEmail({
        to: inviteEmail,
        subject: `Invitation to join ${playerData.username}'s crew`,
        body: `You've been invited to join a crew in CrimeEmpire! Log in to accept the invitation.`
      });

      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'member_joined',
        title: 'Invitation Sent',
        description: `Invitation sent to ${inviteEmail}`,
        player_id: playerData.id,
        player_username: playerData.username
      });
    },
    onSuccess: () => {
      toast.success('Invitation sent!');
      setInviteEmail('');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      await base44.entities.Player.update(memberId, {
        crew_id: null,
        crew_role: 'associate'
      });

      const member = crewMembers.find(m => m.id === memberId);
      
      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'member_left',
        title: 'Member Removed',
        description: `${member?.username} was removed from the crew`,
        player_id: playerData.id,
        player_username: playerData.username
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewMembers']);
      toast.success('Member removed');
    }
  });

  const promoteMemberMutation = useMutation({
    mutationFn: async ({ memberId, newRole }) => {
      await base44.entities.Player.update(memberId, {
        crew_role: newRole
      });

      const member = crewMembers.find(m => m.id === memberId);

      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'member_promoted',
        title: 'Member Promoted',
        description: `${member?.username} promoted to ${newRole}`,
        player_id: playerData.id,
        player_username: playerData.username
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewMembers']);
      toast.success('Member promoted');
    }
  });

  return (
    <div className="space-y-4">
      {/* Invite Member */}
      {canManage && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              Invite Member
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="member@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-slate-900/50 border-purple-500/20 text-white"
              />
              <Button
                onClick={() => inviteMemberMutation.mutate()}
                disabled={inviteMemberMutation.isPending || !inviteEmail}
                className="bg-gradient-to-r from-purple-600 to-cyan-600"
              >
                {inviteMemberMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crew Members */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white">Crew Members</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {crewMembers.map((member) => {
              const isBoss = member.crew_role === 'boss';
              const isSelf = member.id === playerData.id;

              return (
                <div
                  key={member.id}
                  className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{member.username}</span>
                      {isBoss && <Crown className="w-4 h-4 text-yellow-400" />}
                      {isSelf && <span className="text-xs text-purple-400">(You)</span>}
                    </div>
                    <span className="text-sm text-gray-400 capitalize">{member.crew_role}</span>
                  </div>
                  
                  {canManage && !isBoss && !isSelf && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => promoteMemberMutation.mutate({
                          memberId: member.id,
                          newRole: member.crew_role === 'associate' ? 'soldier' : 
                                   member.crew_role === 'soldier' ? 'capo' : 'underboss'
                        })}
                        disabled={promoteMemberMutation.isPending}
                      >
                        <Crown className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => kickMemberMutation.mutate(member.id)}
                        disabled={kickMemberMutation.isPending}
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}