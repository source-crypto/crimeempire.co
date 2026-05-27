import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Truck, AlertTriangle, MapPin, Plus, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const CARGO_TYPES = ['narcotics', 'weapons', 'stolen_goods', 'forgeries', 'electronics', 'currency'];
const DIFFICULTIES = ['low', 'medium', 'high', 'extreme'];

const DIFFICULTY_CONFIG = {
  low:     { risk_min: 10, risk_max: 25, profit_min: 200, profit_max: 500,  label: 'Low',     color: 'bg-green-700' },
  medium:  { risk_min: 25, risk_max: 50, profit_min: 500, profit_max: 1200, label: 'Medium',  color: 'bg-yellow-700' },
  high:    { risk_min: 50, risk_max: 70, profit_min: 1200,profit_max: 3000, label: 'High',    color: 'bg-orange-700' },
  extreme: { risk_min: 70, risk_max: 90, profit_min: 3000,profit_max: 8000, label: 'Extreme', color: 'bg-red-700' },
};

export default function ContrabandSmugglingManager({ playerData, enterpriseNPCs }) {
  const queryClient = useQueryClient();
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ route_name: '', origin: '', destination: '', cargo_type: 'narcotics', cargo_quantity: 10, difficulty: 'medium', law_enforcement_risk: 35, profit_per_unit: 800 });

  const { data: smugglingRoutes = [], isLoading } = useQuery({
    queryKey: ['smugglingRoutes', playerData?.id],
    queryFn: () => base44.entities.ContrabandRoute.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list(),
  });

  const executeRouteMutation = useMutation({
    mutationFn: async (route) => {
      // Correct: rng > law_enforcement_risk = success (high risk = low success)
      const rng = Math.random() * 100;
      const success = rng > route.law_enforcement_risk;
      const profit = success ? route.cargo_quantity * route.profit_per_unit : 0;
      const newRuns = (route.times_run || 0) + 1;
      const newSuccesses = (route.times_successful || 0) + (success ? 1 : 0);

      await base44.entities.ContrabandRoute.update(route.id, {
        status: success ? 'completed' : 'busted',
        times_run: newRuns,
        times_successful: newSuccesses,
        success_rate: Math.round((newSuccesses / newRuns) * 100),
      });

      if (success) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: (playerData.crypto_balance || 0) + profit,
          total_earnings: (playerData.total_earnings || 0) + profit,
        });
        return { success: true, profit };
      } else {
        await base44.entities.Player.update(playerData.id, {
          wanted_level: Math.min(5, (playerData.wanted_level || 0) + 1),
        });
        return { success: false };
      }
    },
    onSuccess: ({ success, profit }) => {
      queryClient.invalidateQueries(['smugglingRoutes']);
      queryClient.invalidateQueries(['player']);
      if (success) toast.success(`✅ Smuggle successful! +$${profit.toLocaleString()}`);
      else toast.error('🚨 Route intercepted! Wanted level increased.');
    },
    onError: (e) => toast.error(e.message),
  });

  const resetRouteMutation = useMutation({
    mutationFn: async (route) => {
      await base44.entities.ContrabandRoute.update(route.id, { status: 'planning' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['smugglingRoutes']);
      toast.success('Route reset to planning');
    },
  });

  const createRouteMutation = useMutation({
    mutationFn: async () => {
      if (!form.route_name || !form.origin || !form.destination) throw new Error('Fill in all required fields');
      await base44.entities.ContrabandRoute.create({
        player_id: playerData.id,
        route_name: form.route_name,
        origin_location: form.origin,
        destination_location: form.destination,
        cargo_type: form.cargo_type,
        cargo_quantity: parseInt(form.cargo_quantity),
        difficulty: form.difficulty,
        law_enforcement_risk: parseInt(form.law_enforcement_risk),
        profit_per_unit: parseInt(form.profit_per_unit),
        status: 'planning',
        times_run: 0,
        times_successful: 0,
        success_rate: 100 - parseInt(form.law_enforcement_risk),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['smugglingRoutes']);
      toast.success('✅ Smuggling route established!');
      setShowCreateForm(false);
      setForm({ route_name: '', origin: '', destination: '', cargo_type: 'narcotics', cargo_quantity: 10, difficulty: 'medium', law_enforcement_risk: 35, profit_per_unit: 800 });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDifficultyChange = (diff) => {
    const cfg = DIFFICULTY_CONFIG[diff];
    setForm(f => ({
      ...f,
      difficulty: diff,
      law_enforcement_risk: Math.floor((cfg.risk_min + cfg.risk_max) / 2),
      profit_per_unit: Math.floor((cfg.profit_min + cfg.profit_max) / 2),
    }));
  };

  const totalProfit = smugglingRoutes.filter(r => r.status === 'completed').reduce((s, r) => s + ((r.cargo_quantity || 0) * (r.profit_per_unit || 0)), 0);
  const avgSuccessRate = smugglingRoutes.length ? Math.round(smugglingRoutes.reduce((s, r) => s + (r.success_rate || 0), 0) / smugglingRoutes.length) : 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Routes', value: smugglingRoutes.length, color: 'text-purple-400' },
          { label: 'Total Profit', value: `$${(totalProfit / 1000).toFixed(1)}k`, color: 'text-green-400' },
          { label: 'Avg Success', value: `${avgSuccessRate}%`, color: 'text-cyan-400' },
          { label: 'Busted', value: smugglingRoutes.filter(r => r.status === 'busted').length, color: 'text-red-400' },
        ].map(s => (
          <Card key={s.label} className="glass-panel border-red-500/20">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Routes List */}
      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-red-400 mx-auto" /></div>
      ) : smugglingRoutes.length === 0 ? (
        <Card className="glass-panel border-red-500/20">
          <CardContent className="p-8 text-center text-gray-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No smuggling routes established yet</p>
            <p className="text-xs mt-1">Create one below to start operations</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {smugglingRoutes.map(route => {
            const isExpanded = expandedRoute === route.id;
            const cfg = DIFFICULTY_CONFIG[route.difficulty] || DIFFICULTY_CONFIG.medium;
            return (
              <Card key={route.id} className={`glass-panel border transition-all cursor-pointer ${isExpanded ? 'border-red-500/50' : 'border-red-500/20'}`}
                onClick={() => setExpandedRoute(isExpanded ? null : route.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold">{route.route_name}</h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{route.origin_location} → {route.destination_location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={route.status === 'planning' ? 'bg-blue-700' : route.status === 'completed' ? 'bg-green-700' : 'bg-red-700'}>
                        {route.status}
                      </Badge>
                      <Badge className={cfg.color}>{route.difficulty}</Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-1.5 rounded bg-slate-800/60">
                      <p className="text-gray-400">Cargo</p>
                      <p className="text-cyan-400 font-bold">{route.cargo_quantity} {route.cargo_type}</p>
                    </div>
                    <div className="p-1.5 rounded bg-slate-800/60">
                      <p className="text-gray-400">Profit/u</p>
                      <p className="text-green-400 font-bold">${route.profit_per_unit}</p>
                    </div>
                    <div className="p-1.5 rounded bg-slate-800/60">
                      <p className="text-gray-400">LE Risk</p>
                      <p className={`font-bold ${route.law_enforcement_risk > 60 ? 'text-red-400' : 'text-yellow-400'}`}>{route.law_enforcement_risk}%</p>
                    </div>
                    <div className="p-1.5 rounded bg-slate-800/60">
                      <p className="text-gray-400">Record</p>
                      <p className="text-purple-400 font-bold">{route.times_successful}/{route.times_run}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-red-500/20 space-y-3" onClick={e => e.stopPropagation()}>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Law Enforcement Risk</span><span>{route.law_enforcement_risk}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-700">
                          <div className={`h-full rounded-full ${route.law_enforcement_risk > 60 ? 'bg-red-500' : 'bg-yellow-500'}`}
                            style={{ width: `${route.law_enforcement_risk}%` }} />
                        </div>
                      </div>
                      <div className="bg-slate-900/40 rounded-lg p-2 text-xs">
                        <p className="text-gray-400">Potential profit per run: <span className="text-green-400 font-bold">${(route.cargo_quantity * route.profit_per_unit).toLocaleString()}</span></p>
                        <p className="text-gray-400">Success probability: <span className="text-cyan-400 font-bold">{100 - route.law_enforcement_risk}%</span></p>
                      </div>
                      <div className="flex gap-2">
                        {route.status === 'planning' && (
                          <Button size="sm" className="flex-1 bg-red-700 hover:bg-red-600 h-8 text-xs"
                            onClick={() => executeRouteMutation.mutate(route)} disabled={executeRouteMutation.isPending}>
                            {executeRouteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Truck className="w-3 h-3 mr-1" />Execute Run</>}
                          </Button>
                        )}
                        {(route.status === 'completed' || route.status === 'busted') && (
                          <Button size="sm" variant="outline" className="flex-1 border-gray-600 text-gray-300 h-8 text-xs"
                            onClick={() => resetRouteMutation.mutate(route)} disabled={resetRouteMutation.isPending}>
                            <RefreshCw className="w-3 h-3 mr-1" />Reset Route
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Form */}
      <Button className="w-full bg-red-700 hover:bg-red-600" onClick={() => setShowCreateForm(!showCreateForm)}>
        <Plus className="w-4 h-4 mr-2" />{showCreateForm ? 'Cancel' : 'Establish Smuggling Route'}
      </Button>

      {showCreateForm && (
        <Card className="glass-panel border-red-500/30">
          <CardHeader className="border-b border-red-500/20">
            <CardTitle className="text-white text-sm">New Smuggling Route</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <input
              type="text" placeholder="Route name *" value={form.route_name}
              onChange={e => setForm(f => ({ ...f, route_name: e.target.value }))}
              className="w-full p-2 rounded bg-slate-900 text-white text-sm border border-gray-600 focus:border-red-500 outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Origin city *" value={form.origin}
                onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                className="p-2 rounded bg-slate-900 text-white text-sm border border-gray-600 focus:border-red-500 outline-none" />
              <input type="text" placeholder="Destination city *" value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                className="p-2 rounded bg-slate-900 text-white text-sm border border-gray-600 focus:border-red-500 outline-none" />
            </div>

            {/* Cargo type */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cargo Type</label>
              <div className="flex flex-wrap gap-2">
                {CARGO_TYPES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, cargo_type: c }))}
                    className={`px-2 py-1 text-xs rounded border transition-all ${form.cargo_type === c ? 'border-red-500 bg-red-900/30 text-red-300' : 'border-gray-600 text-gray-400 hover:text-white'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Difficulty (auto-sets risk & profit)</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => handleDifficultyChange(d)}
                    className={`flex-1 px-2 py-1.5 text-xs rounded border transition-all capitalize ${form.difficulty === d ? `${DIFFICULTY_CONFIG[d].color} border-transparent text-white` : 'border-gray-600 text-gray-400 hover:text-white'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Cargo Qty</label>
                <input type="number" value={form.cargo_quantity}
                  onChange={e => setForm(f => ({ ...f, cargo_quantity: e.target.value }))}
                  className="w-full p-2 rounded bg-slate-900 text-white text-sm border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">LE Risk %</label>
                <input type="number" value={form.law_enforcement_risk}
                  onChange={e => setForm(f => ({ ...f, law_enforcement_risk: e.target.value }))}
                  className="w-full p-2 rounded bg-slate-900 text-white text-sm border border-gray-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Profit/Unit</label>
                <input type="number" value={form.profit_per_unit}
                  onChange={e => setForm(f => ({ ...f, profit_per_unit: e.target.value }))}
                  className="w-full p-2 rounded bg-slate-900 text-white text-sm border border-gray-600 outline-none" />
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-2 text-xs text-gray-400">
              💰 Estimated profit per run: <span className="text-green-400 font-bold">${(form.cargo_quantity * form.profit_per_unit).toLocaleString()}</span>
              &nbsp;•&nbsp; Success chance: <span className="text-cyan-400 font-bold">{100 - form.law_enforcement_risk}%</span>
            </div>

            <Button className="w-full bg-green-700 hover:bg-green-600 h-9 text-sm"
              onClick={() => createRouteMutation.mutate()} disabled={createRouteMutation.isPending}>
              {createRouteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Establish Route'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}