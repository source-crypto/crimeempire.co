import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateCrewDialog({ open, onOpenChange, playerData }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#9333EA');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name) throw new Error('Crew name required');
      
      const crew = await base44.entities.Crew.create({
        name,
        description,
        boss_id: playerData.id,
        member_count: 1,
        territory_count: 0,
        total_power: playerData.strength_score || 10,
        total_revenue: 0,
        reputation: 0,
        color,
        is_recruiting: true
      });

      await base44.entities.Player.update(playerData.id, {
        crew_id: crew.id,
        crew_role: 'boss'
      });

      await base44.entities.CrewPermission.create({
        crew_id: crew.id,
        player_id: playerData.id,
        role: 'boss',
        permissions: {
          manage_members: true,
          assign_roles: true,
          initiate_battles: true,
          manage_territories: true,
          approve_heists: true,
          access_treasury: true,
          create_supply_lines: true,
          kick_members: true,
          view_analytics: true
        }
      });

      await base44.entities.CrewActivity.create({
        crew_id: crew.id,
        activity_type: 'member_joined',
        title: '👑 Crew Founded',
        description: `${playerData.username} founded ${name}`,
        player_id: playerData.id,
        player_username: playerData.username
      });

      return crew;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crew']);
      queryClient.invalidateQueries(['player']);
      toast.success('Crew created successfully!');
      setName('');
      setDescription('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-purple-500/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Create Your Crew</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="crewName" className="text-white">Crew Name</Label>
            <Input
              id="crewName"
              placeholder="Enter crew name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900/50 border-purple-500/20 text-white mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your crew's purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-900/50 border-purple-500/20 text-white mt-2"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="color" className="text-white">Crew Color</Label>
            <div className="flex gap-2 mt-2">
              {['#9333EA', '#06B6D4', '#DC2626', '#F59E0B', '#10B981', '#EC4899'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    color === c ? 'ring-2 ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Crew'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}