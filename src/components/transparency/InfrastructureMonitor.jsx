import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Car, Hammer, Zap, AlertTriangle, CheckCircle, Activity, Truck } from 'lucide-react';

const healthColor = (v) => v >= 80 ? 'text-green-400' : v >= 50 ? 'text-yellow-400' : 'text-red-400';
const healthBg = (v) => v >= 80 ? 'bg-green-500' : v >= 50 ? 'bg-yellow-500' : 'bg-red-500';

function HealthBar({ value = 100, max = 100 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-slate-700 rounded-full h-1.5">
      <div className={`h-full rounded-full ${healthBg(pct)}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function AssetCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="p-3 rounded-lg bg-slate-900/50 border border-gray-700 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function InfrastructureMonitor() {
  const { data: facilities = [], isLoading: loadFacilities } = useQuery({
    queryKey: ['infra-facilities'],
    queryFn: () => base44.entities.BaseFacility.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: vehicles = [], isLoading: loadVehicles } = useQuery({
    queryKey: ['infra-vehicles'],
    queryFn: () => base44.entities.FleetVehicle.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: fleetRoutes = [] } = useQuery({
    queryKey: ['infra-routes'],
    queryFn: () => base44.entities.FleetSupplyRoute.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const { data: auditInfra = [] } = useQuery({
    queryKey: ['infra-audit'],
    queryFn: () => base44.entities.AuditEvent.filter({ event_type: 'infrastructure' }, '-created_date', 20),
  });

  if (loadFacilities || loadVehicles) {
    return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading infrastructure…</div>;
  }

  // Aggregate stats
  const facilityCount = facilities.length;
  const activeFacilities = facilities.filter((f) => f.status === 'active' || f.is_operational).length;
  const avgFacilityHealth = facilityCount
    ? Math.round(facilities.reduce((a, f) => a + (f.health || f.condition || 100), 0) / facilityCount)
    : 100;

  const vehicleCount = vehicles.length;
  const vehiclesInTransit = vehicles.filter((v) => v.status === 'in_transit').length;
  const vehiclesInMaintenance = vehicles.filter((v) => v.status === 'maintenance' || v.status === 'hijacked').length;
  const avgVehicleCondition = vehicleCount
    ? Math.round(vehicles.reduce((a, v) => a + (v.condition || 100), 0) / vehicleCount)
    : 100;

  const routeCount = fleetRoutes.length;
  const activeRoutes = fleetRoutes.filter((r) => r.status === 'active').length;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AssetCard icon={Building2} label="Total Facilities" value={facilityCount} sub={`${activeFacilities} active`} color="text-amber-400" />
        <AssetCard icon={Activity} label="Avg Facility Health" value={`${avgFacilityHealth}%`} color={healthColor(avgFacilityHealth)} />
        <AssetCard icon={Car} label="Fleet Vehicles" value={vehicleCount} sub={`${vehiclesInTransit} in transit`} color="text-cyan-400" />
        <AssetCard icon={Zap} label="Avg Vehicle Condition" value={`${avgVehicleCondition}%`} color={healthColor(avgVehicleCondition)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Facility asset table */}
        <Card className="glass-panel border border-amber-500/20">
          <CardHeader className="border-b border-amber-500/20 pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" /> Base Facilities
              <Badge className="ml-auto bg-amber-900/30 text-amber-300">{facilityCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {facilities.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No facilities built yet.</p>
            ) : (
              <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
                {facilities.map((f) => {
                  const health = f.health || f.condition || 100;
                  const isActive = f.status === 'active' || f.is_operational;
                  return (
                    <div key={f.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">{f.name || f.facility_type || 'Facility'}</span>
                          {isActive
                            ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            : <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 capitalize">{f.facility_type?.replace(/_/g, ' ') || f.type?.replace(/_/g, ' ') || '—'}</p>
                        <HealthBar value={health} />
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${healthColor(health)}`}>{health}%</p>
                        <p className="text-xs text-gray-500">health</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet vehicle table */}
        <Card className="glass-panel border border-cyan-500/20">
          <CardHeader className="border-b border-cyan-500/20 pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-cyan-400" /> Fleet Vehicles
              <div className="ml-auto flex gap-2">
                {vehiclesInTransit > 0 && <Badge className="bg-blue-900/30 text-blue-300">{vehiclesInTransit} in transit</Badge>}
                {vehiclesInMaintenance > 0 && <Badge className="bg-red-900/30 text-red-300">{vehiclesInMaintenance} maintenance</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vehicles.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No fleet vehicles registered.</p>
            ) : (
              <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
                {vehicles.map((v) => {
                  const cond = v.condition || 100;
                  const statusColors = { idle: 'text-gray-400', in_transit: 'text-blue-400', maintenance: 'text-yellow-400', hijacked: 'text-red-400' };
                  return (
                    <div key={v.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">{v.name}</span>
                          <span className={`text-xs capitalize ${statusColors[v.status] || 'text-gray-400'}`}>{v.status}</span>
                        </div>
                        <p className="text-xs text-gray-500 capitalize">{v.vehicle_class?.replace(/_/g, ' ')} · {v.total_deliveries || 0} deliveries · ${(v.total_revenue || 0).toLocaleString()} earned</p>
                        <HealthBar value={cond} />
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${healthColor(cond)}`}>{cond}%</p>
                        <p className="text-xs text-gray-500">condition</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supply routes */}
      {routeCount > 0 && (
        <Card className="glass-panel border border-gray-700">
          <CardHeader className="border-b border-gray-700 pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Hammer className="w-4 h-4 text-purple-400" /> Supply Routes
              <Badge className="ml-auto bg-slate-700 text-gray-300">{activeRoutes}/{routeCount} active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {fleetRoutes.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 border border-gray-700 text-xs">
                  <span className={`w-2 h-2 rounded-full ${r.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                  <span className="text-white flex-1 truncate">{r.name || r.route_name || 'Route'}</span>
                  <span className="text-gray-400 capitalize">{r.status}</span>
                  {r.risk_level && <Badge variant="outline" className="text-xs text-gray-400">{r.risk_level} risk</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent infrastructure audit events */}
      {auditInfra.length > 0 && (
        <Card className="glass-panel border border-gray-700">
          <CardHeader className="border-b border-gray-700 pb-3">
            <CardTitle className="text-white text-sm">Recent Infrastructure Events</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {auditInfra.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 border border-gray-700 text-xs">
                <span className="font-mono text-purple-300 w-28 truncate">{e.event_id}</span>
                <span className="text-gray-200 flex-1">{e.description}</span>
                {e.delta !== 0 && <span className={e.delta > 0 ? 'text-green-400' : 'text-red-400'}>{e.delta > 0 ? '+' : ''}{e.delta}</span>}
                <span className="text-gray-500">{new Date(e.created_date).toLocaleTimeString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}