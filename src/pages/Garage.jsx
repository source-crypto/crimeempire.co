import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import VehicleCard from '../components/garage/VehicleCard';
import RouteAssignModal from '../components/garage/RouteAssignModal';
import MaintenanceLog from '../components/garage/MaintenanceLog';
import { Car, ShoppingCart, Loader2, TrendingUp, Wrench } from 'lucide-react';
import { toast } from 'sonner';

// ─── Purchasable Vehicle Catalog ─────────────────────────────────────────────
const VEHICLE_CATALOG = [
  {
    name: 'Shadow Courier',    type: 'courier_bike',   base_price: 15000,
    speed: 85, cargo_capacity: 20, stealth: 90, armor: 15,
    description: 'Ultra-fast bike. Low cargo, invisible to cops.',
  },
  {
    name: 'Ghost Van',         type: 'cargo_van',      base_price: 35000,
    speed: 55, cargo_capacity: 150, stealth: 70, armor: 40,
    description: 'Inconspicuous workhorse with massive storage.',
  },
  {
    name: 'Phantom Runner',    type: 'muscle_car',     base_price: 60000,
    speed: 90, cargo_capacity: 40, stealth: 50, armor: 55,
    description: 'Raw power for high-speed runs and pursuits.',
  },
  {
    name: 'Iron Fortress',     type: 'armored_truck',  base_price: 120000,
    speed: 40, cargo_capacity: 300, stealth: 20, armor: 95,
    description: 'Near-indestructible. Ideal for high-value hauls.',
  },
  {
    name: 'Sea Wraith',        type: 'speedboat',      base_price: 85000,
    speed: 95, cargo_capacity: 80, stealth: 75, armor: 35,
    description: 'Off-radar water transport. Fastest escape route.',
  },
  {
    name: 'Night Hawk',        type: 'helicopter',     base_price: 250000,
    speed: 100, cargo_capacity: 60, stealth: 45, armor: 50,
    description: 'Air superiority. Crosses any terrain instantly.',
  },
];

export default function Garage() {
  const [assigningVehicle, setAssigningVehicle] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', playerData?.id],
    queryFn: () => base44.entities.Vehicle.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (catalogItem) => {
      if (playerData.crypto_balance < catalogItem.base_price) {
        throw new Error('Insufficient funds');
      }
      await base44.entities.Vehicle.create({
        ...catalogItem,
        owner_id: playerData.id,
        crew_id: playerData.crew_id,
        value: catalogItem.base_price,
        horsepower: Math.round(catalogItem.speed * 4),
        top_speed: Math.round(catalogItem.speed * 1.8),
        handling: Math.round((catalogItem.speed + catalogItem.stealth) / 2),
        durability: catalogItem.armor,
        upgrade_level: 0,
        status: 'idle',
        is_stolen: false,
      });
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - catalogItem.base_price,
      });
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['player']);
      toast.success(`${item.name} purchased!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const upgradeMutation = useMutation({
    mutationFn: async (vehicle) => {
      const level = vehicle.upgrade_level || 0;
      if (level >= 5) throw new Error('Already at max level');
      const cost = 8000 * (level + 1);
      if (playerData.crypto_balance < cost) throw new Error('Insufficient funds');

      await base44.entities.Vehicle.update(vehicle.id, {
        upgrade_level: level + 1,
        speed: Math.min(100, (vehicle.speed || 60) + 5),
        cargo_capacity: Math.round((vehicle.cargo_capacity || 50) * 1.1),
        stealth: Math.min(100, (vehicle.stealth || 50) + 4),
        armor: Math.min(100, (vehicle.armor || 30) + 5),
      });
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost,
      });
      return cost;
    },
    onSuccess: (cost) => {
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Vehicle upgraded for $${cost.toLocaleString()}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const unassignMutation = useMutation({
    mutationFn: async (vehicle) => {
      if (vehicle.assigned_route_id) {
        await base44.entities.SupplyRoute.update(vehicle.assigned_route_id, {
          assigned_vehicle_id: null,
          assigned_vehicle_name: null,
          status: 'no_vehicle',
        });
      }
      await base44.entities.Vehicle.update(vehicle.id, {
        assigned_route_id: null,
        assigned_route_name: null,
        status: 'idle',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['supplyRoutes']);
      toast.success('Vehicle unassigned from route');
    },
    onError: (e) => toast.error(e.message),
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Vehicle Garage
          </h1>
          <p className="text-gray-400 mt-1">Purchase, upgrade, and deploy smuggling vehicles</p>
        </div>
        <div className="glass-panel border border-purple-500/20 rounded-lg px-4 py-2">
          <p className="text-xs text-gray-400">Balance</p>
          <p className="text-lg font-bold text-cyan-400">${playerData.crypto_balance?.toLocaleString()}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Owned Vehicles', value: vehicles.length, color: 'text-purple-400' },
          { label: 'Assigned to Routes', value: vehicles.filter(v => v.assigned_route_id).length, color: 'text-cyan-400' },
          { label: 'Total Cargo Capacity', value: `${vehicles.reduce((s, v) => s + (v.cargo_capacity || 0), 0)} u`, color: 'text-green-400' },
        ].map(stat => (
          <Card key={stat.label} className="glass-panel border-purple-500/20">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="garage">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="garage">🚗 My Garage ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="shop">🛒 Vehicle Shop</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="w-4 h-4 inline mr-1" />Maintenance</TabsTrigger>
        </TabsList>

        {/* MY GARAGE */}
        <TabsContent value="garage" className="mt-4">
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>
          ) : vehicles.length === 0 ? (
            <Card className="glass-panel border-purple-500/20">
              <CardContent className="p-12 text-center">
                <Car className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-40" />
                <h3 className="text-xl font-bold text-white mb-2">Empty Garage</h3>
                <p className="text-gray-400 mb-4">Purchase vehicles from the shop to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onUpgrade={(v) => upgradeMutation.mutate(v)}
                  onAssignRoute={(v) => setAssigningVehicle(v)}
                  onUnassign={(v) => unassignMutation.mutate(v)}
                  upgrading={upgradeMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* SHOP */}
        <TabsContent value="shop" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VEHICLE_CATALOG.map(item => {
              const canAfford = playerData.crypto_balance >= item.base_price;
              const owned = vehicles.filter(v => v.name === item.name).length;
              return (
                <Card key={item.name} className={`glass-panel border-purple-500/20 transition-all ${!canAfford ? 'opacity-60' : 'hover:border-purple-500/50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-bold">{item.name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{item.type.replace('_', ' ')}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {owned > 0 && <Badge className="bg-purple-700 text-xs">Owned ×{owned}</Badge>}
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-3">{item.description}</p>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-4">
                      <div className="flex justify-between"><span className="text-gray-400">⚡ Speed</span><span className="text-cyan-400">{item.speed}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">📦 Cargo</span><span className="text-green-400">{item.cargo_capacity}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">👁 Stealth</span><span className="text-purple-400">{item.stealth}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">🛡 Armor</span><span className="text-orange-400">{item.armor}</span></div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-green-400">${item.base_price.toLocaleString()}</span>
                      {!canAfford && <span className="text-xs text-red-400">Insufficient funds</span>}
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                      size="sm"
                      onClick={() => purchaseMutation.mutate(item)}
                      disabled={purchaseMutation.isPending || !canAfford}
                    >
                      {purchaseMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><ShoppingCart className="w-4 h-4 mr-2" />Purchase</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

        {/* MAINTENANCE LOG */}
        <TabsContent value="maintenance" className="mt-4">
          <MaintenanceLog vehicles={vehicles} playerId={playerData.id} playerData={playerData} />
        </TabsContent>

      {/* Route Assign Modal */}
      {assigningVehicle && (
        <RouteAssignModal
          vehicle={assigningVehicle}
          playerData={playerData}
          onClose={() => setAssigningVehicle(null)}
        />
      )}
    </div>
  );
}