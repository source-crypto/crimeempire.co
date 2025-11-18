import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Zap, Gauge, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Garage() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', playerData?.id],
    queryFn: () => base44.entities.Vehicle.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  const upgradeVehicleMutation = useMutation({
    mutationFn: async (vehicle) => {
      const upgradeCost = 5000;

      if (playerData.crypto_balance < upgradeCost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - upgradeCost
      });

      await base44.entities.Vehicle.update(vehicle.id, {
        horsepower: vehicle.horsepower * 1.1,
        top_speed: vehicle.top_speed * 1.05,
        handling: Math.min(100, vehicle.handling + 5)
      });

      return upgradeCost;
    },
    onSuccess: (cost) => {
      queryClient.invalidateQueries(['vehicles']);
      refetchPlayer();
      toast.success(`Vehicle upgraded for $${cost.toLocaleString()}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const stealVehicleMutation = useMutation({
    mutationFn: async () => {
      // Generate random vehicle
      const types = ['sports', 'muscle', 'luxury', 'suv', 'motorcycle'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      const newVehicle = await base44.entities.Vehicle.create({
        name: `Stolen ${randomType.charAt(0).toUpperCase() + randomType.slice(1)}`,
        type: randomType,
        owner_id: playerData.id,
        horsepower: Math.floor(Math.random() * 300) + 200,
        top_speed: Math.floor(Math.random() * 100) + 120,
        handling: Math.floor(Math.random() * 30) + 60,
        durability: 100,
        is_stolen: true,
        license_plate: `STOLEN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      });

      // Increase wanted level
      await base44.entities.Player.update(playerData.id, {
        wanted_level: Math.min(5, (playerData.wanted_level || 0) + 1)
      });

      return newVehicle;
    },
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries(['vehicles']);
      refetchPlayer();
      toast.success(`Stole ${vehicle.name}! Wanted level increased.`);
    }
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Garage</h1>
            <p className="text-gray-400">Manage your vehicle collection</p>
          </div>
          <Button
            className="bg-gradient-to-r from-red-600 to-orange-600"
            onClick={() => stealVehicleMutation.mutate()}
            disabled={stealVehicleMutation.isPending}
          >
            {stealVehicleMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Stealing...
              </>
            ) : (
              <>
                <Car className="w-4 h-4 mr-2" />
                Steal Vehicle
              </>
            )}
          </Button>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-12 text-center">
            <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-white mb-2">No Vehicles</h3>
            <p className="text-gray-400">You don't own any vehicles yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white flex items-center justify-between">
                  {vehicle.name}
                  <Badge className="capitalize">{vehicle.type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Horsepower</span>
                    <span className="text-white font-semibold">{vehicle.horsepower} HP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Top Speed</span>
                    <span className="text-white font-semibold">{vehicle.top_speed} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Condition</span>
                    <span className="text-green-400 font-semibold">{vehicle.durability}%</span>
                  </div>
                  {vehicle.is_stolen && (
                    <Badge className="w-full justify-center bg-red-600">Stolen</Badge>
                  )}
                </div>
                <div className="pt-3 border-t border-purple-500/20">
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
                    onClick={() => upgradeVehicleMutation.mutate(vehicle)}
                    disabled={upgradeVehicleMutation.isPending}
                  >
                    {upgradeVehicleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Upgrading...
                      </>
                    ) : (
                      <>
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Upgrade - $5,000
                      </>
                    )}
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