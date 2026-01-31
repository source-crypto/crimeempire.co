import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, Plus, Settings, Zap } from 'lucide-react';
import { toast } from 'sonner';

const facilityTypes = {
  garage: { icon: '🚗', cost: 25000, capacity: 5 },
  workshop: { icon: '🔧', cost: 30000, capacity: 100 },
  storage: { icon: '📦', cost: 15000, capacity: 500 },
  laboratory: { icon: '🧪', cost: 40000, capacity: 50 },
  barracks: { icon: '⚔️', cost: 35000, capacity: 20 },
  medical: { icon: '⚕️', cost: 20000, capacity: 30 },
  armory: { icon: '🔫', cost: 45000, capacity: 100 },
  intelligence: { icon: '📡', cost: 50000, capacity: 10 }
};

export default function BaseBuilder({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedBase, setSelectedBase] = useState(null);
  const [creatingBase, setCreatingBase] = useState(false);

  const { data: bases = [] } = useQuery({
    queryKey: ['playerBases', playerData?.id],
    queryFn: () => base44.entities.PlayerBase.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: selectedBaseFacilities = [] } = useQuery({
    queryKey: ['baseFacilities', selectedBase?.id],
    queryFn: () => base44.entities.BaseFacility.filter({ base_id: selectedBase.id }),
    enabled: !!selectedBase?.id
  });

  const createBaseMutation = useMutation({
    mutationFn: async (baseData) => {
      if (playerData.crypto_balance < 50000) {
        throw new Error('Need $50,000 to establish a base');
      }

      await base44.entities.PlayerBase.create({
        player_id: playerData.id,
        base_name: baseData.name,
        base_type: baseData.type,
        location: { x: Math.random() * 100, y: Math.random() * 100, z: 0 },
        maintenance_health: 100
      });

      await base44.entities.BaseDefense.create({
        base_id: (await base44.entities.PlayerBase.filter({ player_id: playerData.id }))[0].id
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - 50000
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerBases']);
      queryClient.invalidateQueries(['player']);
      toast.success('Base established!');
      setCreatingBase(false);
    },
    onError: (error) => toast.error(error.message)
  });

  const addFacilityMutation = useMutation({
    mutationFn: async (facilityType) => {
      const cost = facilityTypes[facilityType].cost;
      if (playerData.crypto_balance < cost) {
        throw new Error(`Need $${cost} for this facility`);
      }

      await base44.entities.BaseFacility.create({
        base_id: selectedBase.id,
        facility_type: facilityType,
        facility_name: `${facilityType} Level 1`,
        upgrade_cost: Math.round(cost * 1.5)
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseFacilities']);
      queryClient.invalidateQueries(['player']);
      toast.success('Facility added!');
    },
    onError: (error) => toast.error(error.message)
  });

  const totalCapacity = selectedBaseFacilities.reduce((sum, f) => sum + (f.capacity || 0), 0);
  const totalMaintenance = selectedBaseFacilities.reduce((sum, f) => sum + (f.maintenance_cost || 0), 0) + (selectedBase?.maintenance_cost || 0);

  return (
    <div className="space-y-4">
      {/* Base List */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Your Bases
            </span>
            <Badge className="bg-cyan-600">{bases.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bases.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-400 mb-3">No bases established yet</p>
              <Button
                onClick={() => setCreatingBase(!creatingBase)}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Establish Base ($50k)
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {bases.map((base) => (
                <div
                  key={base.id}
                  onClick={() => setSelectedBase(base)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedBase?.id === base.id
                      ? 'border-cyan-500/50 bg-slate-900/50'
                      : 'border-cyan-500/20 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white font-semibold">{base.base_name}</h4>
                      <p className="text-xs text-gray-400 capitalize">{base.base_type}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-yellow-400 font-semibold">Lvl {base.level}</p>
                      <p className={`font-semibold ${base.maintenance_health > 70 ? 'text-green-400' : base.maintenance_health > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        Health: {base.maintenance_health}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {creatingBase && (
            <div className="mt-3 p-3 bg-slate-900/50 rounded border border-cyan-500/30 space-y-2">
              <select
                onChange={(e) => {}}
                className="w-full p-2 rounded bg-slate-800 text-white text-sm"
              >
                <option value="">Select base type...</option>
                <option value="safehouse">Safehouse</option>
                <option value="enterprise_hq">Enterprise HQ</option>
                <option value="hideout">Hideout</option>
              </select>
              <input
                type="text"
                placeholder="Base name"
                className="w-full p-2 rounded bg-slate-800 text-white text-sm"
              />
              <Button
                onClick={() => createBaseMutation.mutate({ name: 'New Base', type: 'hideout' })}
                className="w-full bg-cyan-600 hover:bg-cyan-700 h-8 text-sm"
              >
                Create
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Base Details */}
      {selectedBase && (
        <>
          <Card className="glass-panel border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white text-sm">
                <span>Base Status</span>
                <Badge className="bg-purple-600">Security: {selectedBase.security_level}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-gray-400">Capacity</p>
                <p className="text-cyan-400 font-semibold">{selectedBase.current_storage}/{selectedBase.capacity}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-gray-400">Maintenance</p>
                <p className="text-yellow-400 font-semibold">${totalMaintenance.toLocaleString()}/week</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-gray-400">Vulnerability</p>
                <p className={`font-semibold ${selectedBase.vulnerability_rating > 70 ? 'text-red-400' : 'text-green-400'}`}>
                  {selectedBase.vulnerability_rating}%
                </p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-gray-400">Facilities</p>
                <p className="text-purple-400 font-semibold">{selectedBaseFacilities.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Facilities */}
          <Card className="glass-panel border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white text-sm">
                <span>Facilities</span>
                <Button
                  size="sm"
                  onClick={() => setSelectedBase(null)}
                  className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBaseFacilities.length === 0 ? (
                <p className="text-gray-400 text-xs">No facilities. Build your base!</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {selectedBaseFacilities.map((facility) => (
                    <div key={facility.id} className="p-2 bg-slate-900/50 rounded border border-green-500/20 text-xs">
                      <p className="text-white font-semibold">{facilityTypes[facility.facility_type]?.icon} {facility.facility_type}</p>
                      <p className="text-gray-400">Level {facility.level}</p>
                      <p className="text-cyan-400 text-xs mt-1">Efficiency: {facility.efficiency}%</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-green-500/20 space-y-1">
                <p className="text-xs text-gray-400 font-semibold">Add Facility:</p>
                <div className="grid grid-cols-4 gap-1">
                  {Object.entries(facilityTypes).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => addFacilityMutation.mutate(type)}
                      disabled={playerData.crypto_balance < info.cost}
                      className="px-1 py-1 bg-green-600/20 hover:bg-green-600/50 border border-green-500/30 rounded text-xs text-green-300 hover:text-green-200 disabled:opacity-50"
                    >
                      {info.icon} ${Math.round(info.cost/1000)}k
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}