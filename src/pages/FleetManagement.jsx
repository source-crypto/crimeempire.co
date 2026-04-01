import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, Package, AlertTriangle, Wrench, TrendingUp, 
  Plus, Route, Zap, ShieldCheck, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const VEHICLE_CATALOG = [
  { class: 'courier_bike', label: 'Courier Bike', price: 8000, speed: 90, capacity: 30, armor: 10, maintenance: 200, icon: '🏍️', desc: 'Fast but fragile. Best for small urgent deliveries.' },
  { class: 'cargo_van', label: 'Cargo Van', price: 25000, speed: 50, capacity: 150, armor: 30, maintenance: 500, icon: '🚐', desc: 'Balanced workhorse. Reliable for standard routes.' },
  { class: 'armored_truck', label: 'Armored Truck', price: 80000, speed: 30, capacity: 400, armor: 85, maintenance: 1500, icon: '🚛', desc: 'Near-impossible to hijack. Slow but secure.' },
  { class: 'speedboat', label: 'Speedboat', price: 60000, speed: 95, capacity: 200, armor: 20, maintenance: 1000, icon: '🚤', desc: 'Coastal routes only. Bypasses land checkpoints.' },
  { class: 'helicopter', label: 'Helicopter', price: 250000, speed: 100, capacity: 100, armor: 40, maintenance: 5000, icon: '🚁', desc: 'Immune to road hijacks. Extremely fast.' },
];

const VEHICLE_UPGRADE_COST = 15000;

const STATUS_COLORS = {
  idle: 'bg-gray-600',
  in_transit: 'bg-blue-600',
  maintenance: 'bg-yellow-600',
  hijacked: 'bg-red-600',
};

export default function FleetManagement() {
  const queryClient = useQueryClient();
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [routeForm, setRouteForm] = useState({ name: '', from: '', fromName: '', to: '', toName: '', vehicleId: '' });

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: fleet = [] } = useQuery({
    queryKey: ['fleet', playerData?.id],
    queryFn: () => base44.entities.FleetVehicle.filter({ owner_id: playerData.id }, '-created_date', 20),
    enabled: !!playerData?.id,
    refetchInterval: 30000
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['fleetRoutes', playerData?.id],
    queryFn: () => base44.entities.FleetSupplyRoute.filter({ owner_id: playerData.id }, '-created_date', 20),
    enabled: !!playerData?.id,
    refetchInterval: 30000
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }, '-created_date', 20),
    enabled: !!playerData?.id
  });

  const buyVehicle = useMutation({
    mutationFn: async (vehicleClass) => {
      const spec = VEHICLE_CATALOG.find(v => v.class === vehicleClass);
      if ((playerData?.crypto_balance || 0) < spec.price) throw new Error('Insufficient funds');
      await base44.entities.Player.update(playerData.id, { crypto_balance: playerData.crypto_balance - spec.price });
      return base44.entities.FleetVehicle.create({
        owner_id: playerData.id,
        crew_id: playerData.crew_id,
        name: `${spec.label} #${Math.floor(Math.random() * 9000) + 1000}`,
        vehicle_class: vehicleClass,
        level: 1,
        speed: spec.speed,
        capacity: spec.capacity,
        armor: spec.armor,
        condition: 100,
        status: 'idle',
        maintenance_cost_per_day: spec.maintenance,
        last_maintenance: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success('Vehicle purchased!');
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      queryClient.invalidateQueries({ queryKey: ['player'] });
      setShowBuyMenu(false);
    },
    onError: (e) => toast.error(e.message)
  });

  const upgradeVehicle = useMutation({
    mutationFn: async (vehicle) => {
      if ((playerData?.crypto_balance || 0) < VEHICLE_UPGRADE_COST) throw new Error('Insufficient funds');
      await base44.entities.Player.update(playerData.id, { crypto_balance: playerData.crypto_balance - VEHICLE_UPGRADE_COST });
      await base44.entities.FleetVehicle.update(vehicle.id, {
        level: (vehicle.level || 1) + 1,
        speed: Math.min(100, vehicle.speed + 10),
        capacity: vehicle.capacity + 50,
        armor: Math.min(100, vehicle.armor + 10),
      });
    },
    onSuccess: () => { toast.success('Vehicle upgraded!'); queryClient.invalidateQueries({ queryKey: ['fleet'] }); }
  });

  const repairVehicle = useMutation({
    mutationFn: async (vehicle) => {
      const cost = Math.floor((100 - vehicle.condition) * 100);
      if ((playerData?.crypto_balance || 0) < cost) throw new Error(`Repair costs $${cost.toLocaleString()}`);
      await base44.entities.Player.update(playerData.id, { crypto_balance: playerData.crypto_balance - cost });
      await base44.entities.FleetVehicle.update(vehicle.id, { condition: 100, status: 'idle' });
    },
    onSuccess: () => { toast.success('Vehicle repaired!'); queryClient.invalidateQueries({ queryKey: ['fleet'] }); }
  });

  const createRoute = useMutation({
    mutationFn: async () => {
      if (!routeForm.from || !routeForm.to || !routeForm.name) throw new Error('Fill in all route fields');
      const vehicle = fleet.find(v => v.id === routeForm.vehicleId);
      const hijackRisk = vehicle ? Math.max(5, 40 - vehicle.armor / 2) : 25;
      const revenue = enterprises.find(e => e.id === routeForm.to)?.production_rate * 50 || 5000;

      const route = await base44.entities.FleetSupplyRoute.create({
        owner_id: playerData.id,
        crew_id: playerData.crew_id,
        route_name: routeForm.name,
        from_enterprise_id: routeForm.from,
        from_enterprise_name: routeForm.fromName,
        to_enterprise_id: routeForm.to,
        to_enterprise_name: routeForm.toName,
        assigned_vehicle_id: routeForm.vehicleId || null,
        assigned_vehicle_name: vehicle?.name || null,
        status: routeForm.vehicleId ? 'active' : 'no_vehicle',
        revenue_per_trip: Math.min(revenue, 15000),
        trip_duration_hours: 2,
        hijack_risk: hijackRisk,
        next_trip_at: new Date(Date.now() + 2 * 3600000).toISOString()
      });

      if (routeForm.vehicleId) {
        await base44.entities.FleetVehicle.update(routeForm.vehicleId, { assigned_route_id: route.id, status: 'in_transit' });
      }
      return route;
    },
    onSuccess: () => {
      toast.success('Supply route created!');
      queryClient.invalidateQueries({ queryKey: ['fleetRoutes'] });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      setRouteForm({ name: '', from: '', fromName: '', to: '', toName: '', vehicleId: '' });
    },
    onError: (e) => toast.error(e.message)
  });

  const collectRoute = useMutation({
    mutationFn: async (route) => {
      const now = new Date();
      const nextTrip = route.next_trip_at ? new Date(route.next_trip_at) : now;
      if (now < nextTrip) throw new Error(`Next delivery in ${Math.ceil((nextTrip - now) / 60000)} minutes`);

      const vehicle = fleet.find(v => v.id === route.assigned_vehicle_id);
      const hijacked = vehicle && Math.random() * 100 < route.hijack_risk;

      if (hijacked) {
        await base44.entities.FleetSupplyRoute.update(route.id, {
          total_hijacks: (route.total_hijacks || 0) + 1,
          status: 'disrupted',
          next_trip_at: new Date(Date.now() + 4 * 3600000).toISOString(),
          events_log: [...(route.events_log || []), { type: 'hijack', timestamp: now.toISOString(), message: 'Shipment hijacked!' }]
        });
        if (vehicle) {
          await base44.entities.FleetVehicle.update(vehicle.id, {
            condition: Math.max(0, vehicle.condition - 30),
            status: vehicle.condition <= 30 ? 'maintenance' : 'idle'
          });
        }
        throw new Error('🚨 Shipment was hijacked! Vehicle damaged.');
      }

      const earned = route.revenue_per_trip || 5000;
      const maintenance = vehicle?.maintenance_cost_per_day || 500;
      const net = earned - maintenance;

      await base44.entities.Player.update(playerData.id, { crypto_balance: (playerData.crypto_balance || 0) + net });
      await base44.entities.FleetSupplyRoute.update(route.id, {
        total_trips: (route.total_trips || 0) + 1,
        total_revenue: (route.total_revenue || 0) + net,
        status: 'active',
        last_trip_at: now.toISOString(),
        next_trip_at: new Date(Date.now() + (route.trip_duration_hours || 2) * 3600000).toISOString(),
        events_log: [...(route.events_log || []).slice(-9), { type: 'delivery', timestamp: now.toISOString(), message: `Delivered. Net: +$${net.toLocaleString()}` }]
      });
      if (vehicle) {
        await base44.entities.FleetVehicle.update(vehicle.id, {
          condition: Math.max(0, vehicle.condition - 5),
          total_deliveries: (vehicle.total_deliveries || 0) + 1,
          total_revenue: (vehicle.total_revenue || 0) + net,
          status: 'in_transit'
        });
      }
      return net;
    },
    onSuccess: (net) => {
      toast.success(`Delivery complete! +$${net.toLocaleString()} net profit`);
      queryClient.invalidateQueries({ queryKey: ['fleetRoutes'] });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      queryClient.invalidateQueries({ queryKey: ['player'] });
    },
    onError: (e) => toast.error(e.message)
  });

  const idleVehicles = fleet.filter(v => v.status === 'idle');

  if (!playerData) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <Truck className="w-8 h-8 text-purple-400" /> Fleet Management
          </h1>
          <p className="text-gray-400 mt-1">Purchase vehicles, assign routes, collect profits — watch for hijackers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Fleet Size</p>
            <p className="text-2xl font-bold text-white">{fleet.length}</p>
          </div>
          <Button onClick={() => setShowBuyMenu(!showBuyMenu)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Buy Vehicle
          </Button>
        </div>
      </div>

      {/* Buy Vehicle Panel */}
      {showBuyMenu && (
        <Card className="glass-panel border border-purple-500/40">
          <CardHeader><CardTitle className="text-white">Vehicle Dealership</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {VEHICLE_CATALOG.map(v => (
                <div key={v.class} className="p-4 rounded-lg bg-slate-900/60 border border-gray-700 hover:border-purple-500/50 transition-all">
                  <div className="text-3xl mb-2">{v.icon}</div>
                  <p className="text-white font-semibold">{v.label}</p>
                  <p className="text-xs text-gray-400 mb-3">{v.desc}</p>
                  <div className="grid grid-cols-3 gap-1 text-xs mb-3">
                    <div className="text-center"><p className="text-gray-500">Speed</p><p className="text-cyan-400 font-bold">{v.speed}</p></div>
                    <div className="text-center"><p className="text-gray-500">Cap</p><p className="text-green-400 font-bold">{v.capacity}</p></div>
                    <div className="text-center"><p className="text-gray-500">Armor</p><p className="text-yellow-400 font-bold">{v.armor}</p></div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Maintenance: ${v.maintenance.toLocaleString()}/day</p>
                  <Button className="w-full bg-green-700 hover:bg-green-600 text-sm" onClick={() => buyVehicle.mutate(v.class)} disabled={buyVehicle.isPending}>
                    Buy — ${v.price.toLocaleString()}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="fleet">
        <TabsList className="glass-panel border-purple-500/30">
          <TabsTrigger value="fleet"><Truck className="w-4 h-4 mr-1" />My Fleet ({fleet.length})</TabsTrigger>
          <TabsTrigger value="routes"><Route className="w-4 h-4 mr-1" />Supply Routes ({routes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="space-y-3 mt-4">
          {fleet.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No vehicles. Purchase one to get started.</div>
          ) : (
            fleet.map(v => {
              const spec = VEHICLE_CATALOG.find(s => s.class === v.vehicle_class);
              const repairCost = Math.floor((100 - v.condition) * 100);
              return (
                <Card key={v.id} className="glass-panel border border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{spec?.icon || '🚗'}</span>
                        <div>
                          <p className="text-white font-semibold">{v.name}</p>
                          <p className="text-xs text-gray-400">Level {v.level} · {spec?.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[v.status]}>{v.status}</Badge>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => upgradeVehicle.mutate(v)} disabled={upgradeVehicle.isPending}>
                          <Zap className="w-3 h-3 mr-1" /> Upgrade (${VEHICLE_UPGRADE_COST.toLocaleString()})
                        </Button>
                        {v.condition < 100 && (
                          <Button size="sm" variant="outline" className="text-xs border-yellow-500 text-yellow-400" onClick={() => repairVehicle.mutate(v)}>
                            <Wrench className="w-3 h-3 mr-1" /> Repair (${repairCost.toLocaleString()})
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                      <div><p className="text-gray-400">Speed</p><p className="text-cyan-400 font-bold">{v.speed}</p></div>
                      <div><p className="text-gray-400">Capacity</p><p className="text-green-400 font-bold">{v.capacity}</p></div>
                      <div><p className="text-gray-400">Armor</p><p className="text-yellow-400 font-bold">{v.armor}</p></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Condition</span><span>{v.condition}%</span>
                      </div>
                      <Progress value={v.condition} className={`h-2 ${v.condition < 30 ? 'bg-red-900' : ''}`} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Total Deliveries: {v.total_deliveries || 0}</span>
                      <span>Revenue: ${(v.total_revenue || 0).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="routes" className="space-y-4 mt-4">
          {/* Create Route Form */}
          <Card className="glass-panel border border-purple-500/30">
            <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Plus className="w-4 h-4" />New Supply Route</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input value={routeForm.name} onChange={e => setRouteForm(p => ({...p, name: e.target.value}))}
                placeholder="Route name" className="w-full bg-slate-800 border border-gray-600 text-white rounded p-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={routeForm.from} onChange={e => {
                  const ent = enterprises.find(x => x.id === e.target.value);
                  setRouteForm(p => ({...p, from: e.target.value, fromName: ent?.name || ''}));
                }} className="bg-slate-800 border border-gray-600 text-white rounded p-2 text-sm">
                  <option value="">From enterprise...</option>
                  {enterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={routeForm.to} onChange={e => {
                  const ent = enterprises.find(x => x.id === e.target.value);
                  setRouteForm(p => ({...p, to: e.target.value, toName: ent?.name || ''}));
                }} className="bg-slate-800 border border-gray-600 text-white rounded p-2 text-sm">
                  <option value="">To enterprise...</option>
                  {enterprises.filter(e => e.id !== routeForm.from).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <select value={routeForm.vehicleId} onChange={e => setRouteForm(p => ({...p, vehicleId: e.target.value}))}
                className="w-full bg-slate-800 border border-gray-600 text-white rounded p-2 text-sm">
                <option value="">Assign vehicle (optional)</option>
                {idleVehicles.map(v => <option key={v.id} value={v.id}>{v.name} (Armor: {v.armor})</option>)}
              </select>
              <Button className="bg-purple-600 hover:bg-purple-700 w-full" onClick={() => createRoute.mutate()} disabled={createRoute.isPending}>
                Create Route
              </Button>
            </CardContent>
          </Card>

          {routes.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No routes yet. Create one above.</div>
          ) : (
            routes.map(route => {
              const now = new Date();
              const nextTrip = route.next_trip_at ? new Date(route.next_trip_at) : now;
              const ready = now >= nextTrip;
              const minutesLeft = Math.max(0, Math.ceil((nextTrip - now) / 60000));
              return (
                <Card key={route.id} className="glass-panel border border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-semibold">{route.route_name}</p>
                        <p className="text-xs text-gray-400">{route.from_enterprise_name} → {route.to_enterprise_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[route.status] || 'bg-gray-600'}>{route.status}</Badge>
                        <Button size="sm" className={ready ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700'} onClick={() => collectRoute.mutate(route)} disabled={!ready || collectRoute.isPending}>
                          {ready ? '📦 Collect' : <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{minutesLeft}m</span>}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><p className="text-gray-400">Revenue/Trip</p><p className="text-green-400 font-bold">${(route.revenue_per_trip||0).toLocaleString()}</p></div>
                      <div><p className="text-gray-400">Hijack Risk</p><p className="text-red-400 font-bold">{route.hijack_risk}%</p></div>
                      <div><p className="text-gray-400">Total Trips</p><p className="text-white font-bold">{route.total_trips||0}</p></div>
                      <div><p className="text-gray-400">Net Revenue</p><p className="text-yellow-400 font-bold">${(route.total_revenue||0).toLocaleString()}</p></div>
                    </div>
                    {route.assigned_vehicle_name && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <Truck className="w-3 h-3" />{route.assigned_vehicle_name}
                        {route.total_hijacks > 0 && <span className="text-red-400 ml-2"><AlertTriangle className="w-3 h-3 inline" /> {route.total_hijacks} hijacks</span>}
                      </div>
                    )}
                    {/* Last event */}
                    {(route.events_log || []).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 italic">{route.events_log[route.events_log.length - 1]?.message}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}