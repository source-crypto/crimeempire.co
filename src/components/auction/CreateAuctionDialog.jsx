import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateAuctionDialog({ open, onOpenChange, playerData }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startingBid, setStartingBid] = useState(1000);
  const [duration, setDuration] = useState(24);
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['playerVehicles', playerData?.id],
    queryFn: () => base44.entities.Vehicle.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id && open
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle) throw new Error('Select a vehicle to auction');
      
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      if (!vehicle) throw new Error('Vehicle not found');

      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + duration);

      const auction = await base44.entities.Auction.create({
        item_id: vehicle.id,
        item_type: 'vehicle',
        item_name: vehicle.name,
        item_image: vehicle.image_url,
        seller_id: playerData.id,
        starting_bid: startingBid,
        current_bid: startingBid,
        is_active: true,
        ends_at: endsAt.toISOString(),
        bid_count: 0
      });

      await base44.entities.Vehicle.update(vehicle.id, {
        auction_id: auction.id
      });

      if (playerData.crew_id) {
        await base44.entities.CrewActivity.create({
          crew_id: playerData.crew_id,
          activity_type: 'heist_completed',
          title: 'Vehicle Listed',
          description: `${playerData.username} listed ${vehicle.name} for auction`,
          player_id: playerData.id,
          player_username: playerData.username
        });
      }

      return auction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['auctions']);
      queryClient.invalidateQueries(['playerVehicles']);
      toast.success('Auction created successfully!');
      setSelectedVehicle('');
      setStartingBid(1000);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-purple-500/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Create Auction</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="vehicle" className="text-white">Select Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white mt-2">
                <SelectValue placeholder="Choose a vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.filter(v => !v.auction_id).map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - ${vehicle.value?.toLocaleString() || 0}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVehicleData && (
            <div className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/20">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="text-white capitalize">{selectedVehicleData.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Value</span>
                  <span className="text-green-400">${selectedVehicleData.value?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Condition</span>
                  <span className="text-cyan-400">{selectedVehicleData.durability}%</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="startingBid" className="text-white">Starting Bid ($)</Label>
            <Input
              id="startingBid"
              type="number"
              value={startingBid}
              onChange={(e) => setStartingBid(parseInt(e.target.value) || 0)}
              className="bg-slate-900/50 border-purple-500/20 text-white mt-2"
            />
          </div>

          <div>
            <Label htmlFor="duration" className="text-white">Duration (hours)</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !selectedVehicle}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Auction'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}