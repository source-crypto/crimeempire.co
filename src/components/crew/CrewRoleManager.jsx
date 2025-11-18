import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, Shield, Zap, Users, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const roleHierarchy = {
  boss: 5,
  underboss: 4,
  capo: 3,
  soldier: 2,
  associate: 1
};

const rolePermissions = {
  boss: {
    manage_members: true,
    assign_roles: true,
    initiate_battles: true,
    manage_territories: true,
    approve_heists: true,
    access_treasury: true,
    create_supply_lines: true,
    kick_members: true,
    view_analytics: true
  },
  underboss: {
    manage_members: true,
    assign_roles: true,
    initiate_battles: true,
    manage_territories: true,
    approve_heists: true,
    access_treasury: false,
    create_supply_lines: true,
    kick_members: true,
    view_analytics: true
  },
  capo: {
    manage_members: false,
    assign_roles: false,
    initiate_battles: true,
    manage_territories: true,
    approve_heists: false,
    access_treasury: false,
    create_supply_lines: true,
    kick_members: false,
    view_analytics: true
  },
  soldier: {
    manage_members: false,
    assign_roles: false,
    initiate_battles: false,
    manage_territories: false,
    approve_heists: false,
    access_treasury: false,
    create_supply_lines: false,
    kick_members: false,
    view_analytics: false
  },
  associate: {
    manage_members: false,
    assign_roles: false,
    initiate_battles: false,
    manage_territories: false,
    approve_heists: false,
    access_treasury: false,
    create_supply_lines: false,
    kick_members: false,
    view_analytics: false
  }
};

const roleIcons = {
  boss: Crown,
  underboss: Shield,
  capo: Zap,
  soldier: Users,
  associate: Users
};

export default function CrewRoleManager({ crewId, currentPlayerRole, canManageRoles }) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState(null);

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ crew_id: crewId });
      const permissions = await base44.entities.CrewPermission.filter({ crew_id: crewId });
      
      return players.map(player => {
        const perm = permissions.find(p => p.player_id === player.id);
        return {
          ...player,
          role: perm?.role || player.crew_role || 'associate',
          permissions: perm?.permissions || rolePermissions.associate
        };
      });
    },
    enabled: !!crewId
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ playerId, newRole }) => {
      const existingPerms = await base44.entities.CrewPermission.filter({
        crew_id: crewId,
        player_id: playerId
      });

      const permissionData = {
        crew_id: crewId,
        player_id: playerId,
        role: newRole,
        permissions: rolePermissions[newRole]
      };

      if (existingPerms.length > 0) {
        await base44.entities.CrewPermission.update(existingPerms[0].id, permissionData);
      } else {
        await base44.entities.CrewPermission.create(permissionData);
      }

      await base44.entities.Player.update(playerId, { crew_role: newRole });

      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'role_changed',
        title: 'Role Updated',
        description: `Member promoted to ${newRole}`,
        player_id: playerId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crewMembers', crewId]);
      toast.success('Role updated successfully');
      setSelectedMember(null);
    }
  });

  const handleRoleChange = (member, newRole) => {
    if (roleHierarchy[newRole] >= roleHierarchy[currentPlayerRole]) {
      toast.error('Cannot assign a role equal to or higher than your own');
      return;
    }

    updateRoleMutation.mutate({
      playerId: member.id,
      newRole
    });
  };

  const permissionsList = [
    { key: 'manage_members', label: 'Manage Members' },
    { key: 'assign_roles', label: 'Assign Roles' },
    { key: 'initiate_battles', label: 'Initiate Battles' },
    { key: 'manage_territories', label: 'Manage Territories' },
    { key: 'approve_heists', label: 'Approve Heists' },
    { key: 'access_treasury', label: 'Access Treasury' },
    { key: 'create_supply_lines', label: 'Create Supply Lines' },
    { key: 'kick_members', label: 'Kick Members' },
    { key: 'view_analytics', label: 'View Analytics' }
  ];

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white">Crew Roles & Permissions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {crewMembers.map((member) => {
            const RoleIcon = roleIcons[member.role];
            const isBoss = member.role === 'boss';

            return (
              <div
                key={member.id}
                className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-900/30">
                      <RoleIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{member.username}</h4>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  
                  {canManageRoles && !isBoss && (
                    <Select
                      value={member.role}
                      onValueChange={(newRole) => handleRoleChange(member, newRole)}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-32 bg-slate-900/50 border-purple-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="associate">Associate</SelectItem>
                        <SelectItem value="soldier">Soldier</SelectItem>
                        <SelectItem value="capo">Capo</SelectItem>
                        {roleHierarchy[currentPlayerRole] >= roleHierarchy.underboss && (
                          <SelectItem value="underboss">Underboss</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Permissions */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {permissionsList.map((perm) => {
                    const hasPermission = member.permissions?.[perm.key];
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center gap-2 text-xs"
                      >
                        {hasPermission ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-gray-600" />
                        )}
                        <span className={hasPermission ? 'text-gray-300' : 'text-gray-600'}>
                          {perm.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}