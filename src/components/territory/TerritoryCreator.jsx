import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function TerritoryCreator({ playerData, crewData }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    resource_type: 'residential',
    lat: 40.7128,
    lng: -74.0060
  });

  const createTerritoryMutation = useMutation({
    mutationFn: async (data) => {
      if (!crewData) {
        throw new Error('You must be in a crew to create territories');
      }

      const cost = 50000;
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds (Cost: $50,000)');
      }

      const territory = await base44.entities.Territory.create({
        name: data.name,
        controlling_crew_id: crewData.id,
        coordinates: { lat: parseFloat(data.lat), lng: parseFloat(data.lng) },
        control_percentage: 100,
        revenue_multiplier: 1,
        defense_bonus: 0,
        is_contested: false,
        resource_type: data.resource_type,
        benefits: []
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost,
        territory_count: (playerData.territory_count || 0) + 1
      });

      await base44.entities.Crew.update(crewData.id, {
        territory_count: (crewData.territory_count || 0) + 1
      });

      return territory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territories']);
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['crew']);
      toast.success('Territory established!');
      setShowForm(false);
      setFormData({ name: '', resource_type: 'residential', lat: 40.7128, lng: -74.0060 });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="bg-gradient-to-r from-cyan-600 to-blue-600"
      >
        <Plus className="w-4 h-4 mr-2" />
        Establish New Territory
      </Button>
    );
  }

  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Establish Territory
          </span>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Territory Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter territory name"
            className="bg-slate-900/50 border-cyan-500/30"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Resource Type</label>
          <Select
            value={formData.resource_type}
            onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
          >
            <SelectTrigger className="bg-slate-900/50 border-cyan-500/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financial">Financial District</SelectItem>
              <SelectItem value="industrial">Industrial Zone</SelectItem>
              <SelectItem value="residential">Residential Area</SelectItem>
              <SelectItem value="tactical">Tactical Position</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Latitude</label>
            <Input
              type="number"
              step="0.0001"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              className="bg-slate-900/50 border-cyan-500/30"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Longitude</label>
            <Input
              type="number"
              step="0.0001"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              className="bg-slate-900/50 border-cyan-500/30"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-yellow-400">Cost:</span> $50,000
          </p>
        </div>

        <Button
          onClick={() => createTerritoryMutation.mutate(formData)}
          disabled={!formData.name || createTerritoryMutation.isPending}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
        >
          {createTerritoryMutation.isPending ? 'Establishing...' : 'Establish Territory ($50k)'}
        </Button>
      </CardContent>
    </Card>
  );
}