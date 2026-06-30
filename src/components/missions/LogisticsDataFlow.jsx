import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Route, Package, Zap, ArrowRight, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';

const STATUS_CONFIG = {
  idle:        { color: 'bg-gray-700', text: 'text-gray-300',   label: 'Idle',        dot: 'bg-gray-400' },
  in_transit:  { color: 'bg-cyan-900', text: 'text-cyan-300',   label: 'In Transit',  dot: 'bg-cyan-400' },
  maintenance: { color: 'bg-red-900',  text: 'text-red-300',    label: 'Maintenance', dot: 'bg-red-400' },
};

const ROUTE_STATUS_CONFIG = {
  active:   { color: 'text-green-400',  icon: <CheckCircle className="w-3 h-3" /> },
  inactive: { color: 'text-gray-500',   icon: <Clock className="w-3 h-3" /> },
  disrupted:{ color: 'text-red-400',    icon: <AlertTriangle className="w-3 h-3" /> },
};

function FlowLine({ from, to, active }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className={active ? 'text-white' : 'text-gray-500'}>{from}</span>
      <ArrowRight className={`w-3 h-3 flex-shrink-0 ${active ? 'text-cyan-400' : 'text-gray-600'}`} />
      <span className={active ? 'text-cyan-300' : 'text-gray-500'}>{to}</span>
      {active && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
    </div>
  );
}

export default function LogisticsDataFlow({ playerData }) {
  const [expandedMission, setExpandedMission] = useState(null);

  const { data: routes = [] } = useQuery({
    queryKey: ['supplyRoutes', playerData?.id],
    queryFn: () => base44.entities.SupplyRoute.filter({ owner_id: playerData.id }, '-created_date', 20),
    enabled: !!playerData?.id,
    staleTime: 30000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', playerData?.id],
    queryFn: () => base44.entities.Vehicle.filter({ owner_id: playerData.id }, '-created_date', 20),
    enabled: !!playerData?.id,
    staleTime: 30000,
  });

  const { data: missions = [] } = useQuery({
    queryKey: ['missions', 'logistics', playerData?.id],
    queryFn: () => base44.entities.Mission.filter({ assigned_to_player: playerData.id, status: 'active' }, '-created_date', 10),
    enabled: !!playerData?.id,
    staleTime: 20000,
  });

  const activeRoutes = routes.filter(r => r.status === 'active');
  const inTransitVehicles = vehicles.filter(v => v.status === 'in_transit');
  const assignedVehicles = vehicles.filter(v => v.assigned_route_id);

  // Match routes → vehicles → missions
  function getRouteVehicle(route) {
    return vehicles.find(v => v.assigned_route_id === route.id);
  }

  function getMissionLogisticsScore(mission) {
    const hasVehicle = inTransitVehicles.length > 0;
    const hasRoute = activeRoutes.length > 0;
    const score = (hasVehicle ? 40 : 0) + (hasRoute ? 40 : 0) + (mission.participants?.length > 0 ? 20 : 0);
    return score;
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel border border-cyan-500/20 p-3 rounded-xl text-center">
          <Route className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{activeRoutes.length}</p>
          <p className="text-xs text-gray-400">Active Routes</p>
        </div>
        <div className="glass-panel border border-amber-500/20 p-3 rounded-xl text-center">
          <Truck className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{inTransitVehicles.length}</p>
          <p className="text-xs text-gray-400">In Transit</p>
        </div>
        <div className="glass-panel border border-purple-500/20 p-3 rounded-xl text-center">
          <Package className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{assignedVehicles.length}</p>
          <p className="text-xs text-gray-400">Deployed</p>
        </div>
      </div>

      {/* Mission → Logistics Flow */}
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader className="border-b border-purple-500/10 pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Mission Logistics Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {missions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No active missions with logistics data.
            </div>
          ) : (
            missions.map((mission) => {
              const score = getMissionLogisticsScore(mission);
              const isExpanded = expandedMission === mission.id;
              const scoreColor = score >= 80 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';

              return (
                <div
                  key={mission.id}
                  className="border border-gray-700/50 rounded-xl overflow-hidden"
                >
                  {/* Mission header — clickable */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
                    onClick={() => setExpandedMission(isExpanded ? null : mission.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white font-semibold text-sm truncate">{mission.title}</span>
                      <Badge className="bg-slate-700 text-xs capitalize flex-shrink-0">
                        {(mission.mission_type || 'mission').replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <div className="text-xs text-gray-400">Logistics</div>
                      <div className="w-16 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div className={`h-full rounded-full ${scoreColor} transition-all`} style={{ width: `${score}%` }} />
                      </div>
                      <span className="text-xs text-white font-bold w-8">{score}%</span>
                    </div>
                  </div>

                  {/* Expanded: data flow detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-700/50 bg-slate-950/40 p-3 space-y-3">
                      {/* Flow diagram */}
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <div className="flex flex-col gap-1">
                          <FlowLine
                            from="Supply Route"
                            to="Vehicle"
                            active={activeRoutes.length > 0 && assignedVehicles.length > 0}
                          />
                          <FlowLine
                            from="Vehicle"
                            to="Mission Sector"
                            active={inTransitVehicles.length > 0}
                          />
                          <FlowLine
                            from="Crew Members"
                            to="Mission"
                            active={(mission.participants || []).length > 0}
                          />
                        </div>
                      </div>

                      {/* Checklist */}
                      <div className="space-y-1.5 text-xs">
                        <LogisticsCheck
                          label="Supply route active"
                          ok={activeRoutes.length > 0}
                          detail={activeRoutes.length > 0 ? `${activeRoutes.length} route(s) running` : 'No active routes'}
                        />
                        <LogisticsCheck
                          label="Vehicle deployed"
                          ok={inTransitVehicles.length > 0}
                          detail={inTransitVehicles.length > 0
                            ? inTransitVehicles.map(v => v.name).join(', ')
                            : 'All vehicles idle'}
                        />
                        <LogisticsCheck
                          label="Crew assigned"
                          ok={(mission.participants || []).length > 0}
                          detail={(mission.participants || []).length > 0
                            ? (mission.participants || []).map(p => p.username).join(', ')
                            : 'No crew assigned yet'}
                        />
                        <LogisticsCheck
                          label="Cargo capacity"
                          ok={vehicles.length > 0}
                          detail={vehicles.length > 0
                            ? `${vehicles.reduce((s, v) => s + (v.cargo_capacity || 0), 0)} total units`
                            : 'No vehicles available'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Active Routes */}
      {routes.length > 0 && (
        <Card className="glass-panel border border-cyan-500/20">
          <CardHeader className="border-b border-cyan-500/10 pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Route className="w-4 h-4 text-cyan-400" />
              Supply Routes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {routes.map((route) => {
              const vehicle = getRouteVehicle(route);
              const rCfg = ROUTE_STATUS_CONFIG[route.status] || ROUTE_STATUS_CONFIG.inactive;
              return (
                <div key={route.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-gray-700/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={rCfg.color}>{rCfg.icon}</span>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{route.name || route.route_name || 'Unnamed Route'}</p>
                      <p className="text-xs text-gray-400 truncate">{route.origin || '—'} → {route.destination || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {vehicle && (
                      <Badge className="bg-amber-900/50 text-amber-300 text-xs border border-amber-500/30">
                        <Truck className="w-3 h-3 mr-1" />{vehicle.name}
                      </Badge>
                    )}
                    <Badge className="bg-slate-700 text-xs capitalize">{route.status || 'inactive'}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Fleet Status */}
      {vehicles.length > 0 && (
        <Card className="glass-panel border border-amber-500/20">
          <CardHeader className="border-b border-amber-500/10 pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vehicles.map((vehicle) => {
              const vCfg = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.idle;
              return (
                <div key={vehicle.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${vCfg.color} border-gray-700/40`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${vCfg.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${vCfg.text}`}>{vehicle.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{(vehicle.type || '').replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`text-xs font-bold ${vCfg.text}`}>{vCfg.label}</p>
                    {vehicle.assigned_route_name && (
                      <p className="text-xs text-gray-500 truncate max-w-[80px]">{vehicle.assigned_route_name}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {routes.length === 0 && vehicles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No logistics resources found.</p>
          <p className="text-xs mt-1">Visit Fleet Management and Garage to set up supply routes and vehicles.</p>
        </div>
      )}
    </div>
  );
}

function LogisticsCheck({ label, ok, detail }) {
  return (
    <div className="flex items-start gap-2">
      {ok
        ? <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
        : <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />}
      <div>
        <span className={`font-medium ${ok ? 'text-green-300' : 'text-yellow-300'}`}>{label}</span>
        <span className="text-gray-500 ml-1">— {detail}</span>
      </div>
    </div>
  );
}