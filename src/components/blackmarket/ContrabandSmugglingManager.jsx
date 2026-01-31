import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Truck, AlertTriangle, TrendingUp, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function ContrabandSmugglingManager({ playerData, enterpriseNPCs }) {
  const queryClient = useQueryClient();
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [creatingRoute, setCreatingRoute] = useState(false);

  const { data: smugglingRoutes = [] } = useQuery({
    queryKey: ['smugglingRoutes', playerData?.id],
    queryFn: () => base44.entities.ContrabandRoute.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const executeRouteMutation = useMutation({
    mutationFn: async (route) => {
      const rng = Math.random() * 100;
      const success = rng < route.law_enforcement_risk;

      const profit = success ? route.cargo_quantity * route.profit_per_unit : 0;
      const newSuccessRate = ((route.times_successful + (success ? 1 : 0)) / (route.times_run + 1)) * 100;

      await base44.entities.ContrabandRoute.update(route.id, {
        status: success ? 'completed' : 'busted',
        times_run: route.times_run + 1,
        times_successful: route.times_successful + (success ? 1 : 0),
        success_rate: newSuccessRate
      });

      if (success) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance + profit,
          total_earnings: playerData.total_earnings + profit
        });
        toast.success(`Smuggle successful! +$${profit.toLocaleString()}`);
      } else {
        // Risk of arrest/heat increase
        toast.error('Route intercepted by law enforcement!');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['smugglingRoutes']);
      queryClient.invalidateQueries(['player']);
    },
    onError: (error) => toast.error(error.message)
  });

  const createRouteMutation = useMutation({
    mutationFn: async (formData) => {
      await base44.entities.ContrabandRoute.create({
        player_id: playerData.id,
        route_name: formData.route_name,
        origin_location: formData.origin,
        destination_location: formData.destination,
        cargo_type: formData.cargo_type,
        cargo_quantity: parseInt(formData.cargo_quantity),
        difficulty: formData.difficulty,
        law_enforcement_risk: parseInt(formData.law_enforcement_risk),
        profit_per_unit: parseInt(formData.profit_per_unit),
        success_rate: 75
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['smugglingRoutes']);
      toast.success('Route established!');
      setCreatingRoute(false);
    },
    onError: (error) => toast.error(error.message)
  });

  const totalProfit = smugglingRoutes
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.cargo_quantity * r.profit_per_unit), 0);

  const avgSuccessRate = smugglingRoutes.length > 0
    ? Math.round(smugglingRoutes.reduce((sum, r) => sum + r.success_rate, 0) / smugglingRoutes.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="glass-panel border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-red-400" />
              Smuggling Operations
            </span>
            <Badge className="bg-red-600">{smugglingRoutes.length} routes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Total Profit</p>
              <p className="text-lg font-bold text-green-400">${(totalProfit / 1000).toFixed(1)}k</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Avg Success Rate</p>
              <p className="text-lg font-bold text-cyan-400">{avgSuccessRate}%</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Active Routes</p>
              <p className="text-lg font-bold text-purple-400">{smugglingRoutes.filter(r => r.status === 'planning').length}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-xs text-gray-400">Busted</p>
              <p className="text-lg font-bold text-red-400">{smugglingRoutes.filter(r => r.status === 'busted').length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routes */}
      <div className="space-y-3">
        {smugglingRoutes.map((route) => {
          const npcManager = route.npc_manager_id ? enterpriseNPCs?.find(n => n.id === route.npc_manager_id) : null;
          const isExpanded = expandedRoute === route.id;

          return (
            <Card
              key={route.id}
              className={`glass-panel border cursor-pointer transition-all ${
                isExpanded ? 'border-red-500/50' : 'border-red-500/20'
              }`}
              onClick={() => setExpandedRoute(isExpanded ? null : route.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-semibold">{route.route_name}</h4>
                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3" />
                      {route.origin_location} → {route.destination_location}
                    </p>
                  </div>
                  <Badge className={
                    route.status === 'planning' ? 'bg-blue-600' :
                    route.status === 'completed' ? 'bg-green-600' : 'bg-red-600'
                  }>
                    {route.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-5 gap-2 text-xs mb-3">
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Cargo</p>
                    <p className="text-cyan-400 font-semibold">{route.cargo_quantity}</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Profit/U</p>
                    <p className="text-green-400 font-semibold">${route.profit_per_unit}</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Success</p>
                    <p className={`font-semibold ${route.success_rate > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {route.success_rate}%
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Risk</p>
                    <p className={`font-semibold ${route.law_enforcement_risk > 70 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {route.law_enforcement_risk}%
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Runs</p>
                    <p className="text-purple-400 font-semibold">{route.times_successful}/{route.times_run}</p>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-red-500/20 pt-3">
                    {npcManager && (
                      <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs">
                        <p className="text-blue-300 font-semibold">Manager: {npcManager.npc_name}</p>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Risk Level</span>
                        <span>{route.law_enforcement_risk}%</span>
                      </div>
                      <Progress value={route.law_enforcement_risk} className="h-2" />
                    </div>

                    {route.status === 'planning' && (
                      <Button
                        size="sm"
                        onClick={() => executeRouteMutation.mutate(route)}
                        disabled={executeRouteMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700 h-8 text-xs"
                      >
                        <Truck className="w-3 h-3 mr-1" />
                        Execute Smuggle Run
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Route */}
      <Button
        onClick={() => setCreatingRoute(!creatingRoute)}
        className="w-full bg-red-600 hover:bg-red-700"
      >
        + Establish Smuggling Route
      </Button>

      {creatingRoute && (
        <Card className="glass-panel border-red-500/30 p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            createRouteMutation.mutate({
              route_name: fd.get('route_name'),
              origin: fd.get('origin'),
              destination: fd.get('destination'),
              cargo_type: fd.get('cargo_type'),
              cargo_quantity: fd.get('cargo_quantity'),
              difficulty: fd.get('difficulty'),
              law_enforcement_risk: fd.get('law_enforcement_risk'),
              profit_per_unit: fd.get('profit_per_unit')
            });
          }} className="space-y-3">
            <input type="text" name="route_name" placeholder="Route name" required className="w-full p-2 rounded bg-slate-900 text-white text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select name="origin" required className="p-2 rounded bg-slate-900 text-white text-sm">
                <option>From</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select name="destination" required className="p-2 rounded bg-slate-900 text-white text-sm">
                <option>To</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <input type="text" name="cargo_type" placeholder="Cargo type" required className="w-full p-2 rounded bg-slate-900 text-white text-sm" />
            <input type="number" name="cargo_quantity" placeholder="Quantity" required className="w-full p-2 rounded bg-slate-900 text-white text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" name="law_enforcement_risk" placeholder="LE Risk %" required className="p-2 rounded bg-slate-900 text-white text-sm" />
              <input type="number" name="profit_per_unit" placeholder="Profit/U" required className="p-2 rounded bg-slate-900 text-white text-sm" />
            </div>
            <Button type="submit" disabled={createRouteMutation.isPending} className="w-full bg-green-600 hover:bg-green-700 h-8 text-sm">Create</Button>
          </form>
        </Card>
      )}
    </div>
  );
}