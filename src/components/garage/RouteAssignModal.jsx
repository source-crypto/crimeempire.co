import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, AlertTriangle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RouteAssignModal({ vehicle, playerData, onClose }) {
  const queryClient = useQueryClient();

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['supplyRoutes', playerData?.crew_id],
    queryFn: () => base44.entities.SupplyRoute.filter({ crew_id: playerData.crew_id }),
    enabled: !!playerData?.crew_id,
  });

  const assignMutation = useMutation({
    mutationFn: async (route) => {
      await base44.entities.Vehicle.update(vehicle.id, {
        assigned_route_id: route.id,
        assigned_route_name: route.route_name,
        status: 'in_transit',
      });
      await base44.entities.SupplyRoute.update(route.id, {
        assigned_vehicle_id: vehicle.id,
        assigned_vehicle_name: vehicle.name,
        status: 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['supplyRoutes']);
      toast.success(`${vehicle.name} assigned to route`);
      onClose();
    },
    onError: () => toast.error('Failed to assign vehicle'),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-panel border border-purple-500/30 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Route className="w-5 h-5 text-cyan-400" />
            Assign {vehicle.name} to Route
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" /></div>
          ) : routes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No supply routes found. Create routes in the Territory page.</p>
            </div>
          ) : (
            routes.map(route => (
              <div key={route.id} className="p-3 rounded-lg bg-slate-900/40 border border-purple-500/10 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-semibold text-sm">{route.route_name}</h4>
                    <p className="text-xs text-gray-400">
                      {route.from_territory_name || 'Origin'} → {route.to_territory_name || 'Destination'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {route.assigned_vehicle_name && (
                      <Badge className="bg-yellow-700 text-xs">{route.assigned_vehicle_name}</Badge>
                    )}
                    <Badge className={route.status === 'active' ? 'bg-green-600' : 'bg-gray-600'} >
                      {route.status || 'inactive'}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-xs"
                  onClick={() => assignMutation.mutate(route)}
                  disabled={assignMutation.isPending}
                >
                  {assignMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign Vehicle'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}