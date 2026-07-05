import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, AlertTriangle, CheckCircle, DollarSign, Activity, Plus, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_META = {
  operational: { label: 'Roadworthy', color: 'bg-green-600', text: 'text-green-400', icon: CheckCircle },
  needs_repair: { label: 'Needs Repair', color: 'bg-yellow-600', text: 'text-yellow-400', icon: Wrench },
  critical: { label: 'Critical', color: 'bg-orange-600', text: 'text-orange-400', icon: AlertTriangle },
  grounded: { label: 'Grounded', color: 'bg-red-600', text: 'text-red-400', icon: Ban },
};

const REPAIR_TYPES = [
  { key: 'routine', label: 'Routine Service', baseCost: 1200 },
  { key: 'major', label: 'Major Repair', baseCost: 6500 },
  { key: 'emergency', label: 'Emergency Fix', baseCost: 12000 },
  { key: 'inspection', label: 'Inspection Only', baseCost: 500 },
];

// Derive operational status from wear & tear / damage
function deriveStatus(wearTear, damage) {
  if (damage >= 80 || wearTear >= 90) return 'grounded';
  if (damage >= 60 || wearTear >= 75) return 'critical';
  if (damage >= 40 || wearTear >= 50) return 'needs_repair';
  return 'operational';
}

export default function MaintenanceLog({ vehicles, playerId, playerData }) {
  const queryClient = useQueryClient();
  const [loggingVehicle, setLoggingVehicle] = useState(null);
  const [form, setForm] = useState({ repair_type: 'routine', mechanic_notes: '', parts_replaced: '' });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['maintenanceLogs', playerId],
    queryFn: () => base44.entities.VehicleMaintenanceLog.filter({ owner_id: playerId }, '-repaired_at', 50),
    enabled: !!playerId,
  });

  const repairMutation = useMutation({
    mutationFn: async ({ vehicle, formData }) => {
      const repairDef = REPAIR_TYPES.find(r => r.key === formData.repair_type);
      const wearTear = (vehicle.durability != null) ? Math.max(0, 100 - (vehicle.durability)) : 0;
      const damageBefore = Math.min(100, wearTear + 10);
      const cost = repairDef.baseCost + Math.round(damageBefore * 80);
      if ((playerData?.crypto_balance ?? 0) < cost) throw new Error('Insufficient funds for repair');

      const newWear = Math.max(0, wearTear - (repairDef.key === 'inspection' ? 0 : 35));
      const newDamage = Math.max(0, damageBefore - (repairDef.key === 'inspection' ? 0 : 70));
      const status = deriveStatus(newWear, newDamage);

      await base44.entities.VehicleMaintenanceLog.create({
        vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        owner_id: playerId,
        repair_type: formData.repair_type,
        wear_tear_level: Math.round(newWear),
        damage_level: Math.round(newDamage),
        repair_cost: cost,
        total_repair_cost: (logs.filter(l => l.vehicle_id === vehicle.id).reduce((s, l) => s + (l.repair_cost || 0), 0)) + cost,
        operational_status: status,
        parts_replaced: formData.parts_replaced ? formData.parts_replaced.split(',').map(p => p.trim()).filter(Boolean) : [],
        mechanic_notes: formData.mechanic_notes || '',
        repaired_at: new Date().toISOString(),
      });

      await base44.entities.Vehicle.update(vehicle.id, {
        status: status === 'grounded' ? 'maintenance' : (status === 'operational' ? 'idle' : vehicle.status),
        durability: Math.round(100 - newWear),
      });
      await base44.entities.Player.update(playerId, {
        crypto_balance: playerData.crypto_balance - cost,
      });
      return { cost, status };
    },
    onSuccess: ({ cost, status }) => {
      queryClient.invalidateQueries(['maintenanceLogs']);
      queryClient.invalidateQueries(['vehicles']);
      queryClient.invalidateQueries(['player']);
      setLoggingVehicle(null);
      setForm({ repair_type: 'routine', mechanic_notes: '', parts_replaced: '' });
      toast.success(`Repair logged — $${cost.toLocaleString()} · now ${status}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const latestByVehicle = vehicles.map(v => {
    const vLogs = logs.filter(l => l.vehicle_id === v.id);
    const latest = vLogs.sort((a, b) => new Date(b.repaired_at) - new Date(a.repaired_at))[0];
    const totalSpent = vLogs.reduce((s, l) => s + (l.repair_cost || 0), 0);
    const wearTear = latest?.wear_tear_level ?? Math.max(0, 100 - (v.durability ?? 100));
    const damage = latest?.damage_level ?? wearTear;
    const status = latest?.operational_status ?? deriveStatus(wearTear, damage);
    return { vehicle: v, latest, totalSpent, wearTear, damage, status, logCount: vLogs.length };
  });

  const grounded = latestByVehicle.filter(r => r.status === 'grounded' || r.status === 'critical');
  const totalRepairSpend = logs.reduce((s, l) => s + (l.repair_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
            <p className="text-xl font-bold text-cyan-400">{latestByVehicle.filter(r => r.status === 'operational').length}</p>
            <p className="text-xs text-gray-400">Roadworthy</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Wrench className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <p className="text-xl font-bold text-yellow-400">{latestByVehicle.filter(r => r.status === 'needs_repair').length}</p>
            <p className="text-xs text-gray-400">Needs Repair</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Ban className="w-5 h-5 mx-auto mb-1 text-red-400" />
            <p className="text-xl font-bold text-red-400">{grounded.length}</p>
            <p className="text-xs text-gray-400">Too Damaged</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <p className="text-xl font-bold text-green-400">${totalRepairSpend.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total Spent</p>
          </CardContent>
        </Card>
      </div>

      {grounded.length > 0 && (
        <Card className="glass-panel border-red-500/40 bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-300 font-bold">Grounded — Unfit for Smuggling Duty</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {grounded.map(r => (
                <Badge key={r.vehicle.id} className={`${STATUS_META[r.status].color} text-white`}>
                  {r.vehicle.name} — {STATUS_META[r.status].label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-vehicle maintenance cards */}
      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" /></div>
      ) : vehicles.length === 0 ? (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-8 text-center text-gray-400">No vehicles to maintain yet.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {latestByVehicle.map(({ vehicle, latest, totalSpent, wearTear, damage, status, logCount }) => {
            const meta = STATUS_META[status];
            const StatusIcon = meta.icon;
            return (
              <Card key={vehicle.id} className="glass-panel border-purple-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{vehicle.name}</CardTitle>
                      <p className="text-xs text-gray-400 capitalize">{vehicle.type.replace('_', ' ')}</p>
                    </div>
                    <Badge className={`${meta.color} text-white flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" /> {meta.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Wear & tear bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Wear & Tear</span>
                      <span className={wearTear >= 75 ? 'text-red-400' : wearTear >= 50 ? 'text-yellow-400' : 'text-green-400'}>{Math.round(wearTear)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${wearTear >= 75 ? 'bg-red-500' : wearTear >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${wearTear}%` }} />
                    </div>
                  </div>
                  {/* Damage bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Damage</span>
                      <span className={damage >= 60 ? 'text-red-400' : damage >= 40 ? 'text-orange-400' : 'text-green-400'}>{Math.round(damage)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${damage >= 60 ? 'bg-red-500' : damage >= 40 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${damage}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-400 pt-1">
                    <span>Repairs: {logCount}</span>
                    <span>Total spent: <span className="text-green-400">${totalSpent.toLocaleString()}</span></span>
                  </div>
                  {latest?.mechanic_notes && <p className="text-xs text-gray-500 italic">“{latest.mechanic_notes}”</p>}

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
                    onClick={() => setLoggingVehicle(vehicle)}
                    disabled={repairMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Log Maintenance
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Log maintenance modal */}
      {loggingVehicle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setLoggingVehicle(null)}>
          <Card className="glass-panel border-purple-500/40 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-white">Log Maintenance — {loggingVehicle.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Repair Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {REPAIR_TYPES.map(r => (
                    <button
                      key={r.key}
                      onClick={() => setForm(f => ({ ...f, repair_type: r.key }))}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all ${form.repair_type === r.key ? 'bg-purple-600/40 border-purple-500 text-white' : 'border-slate-700 text-gray-400 hover:border-purple-500/50'}`}
                    >
                      {r.label}<br /><span className="text-gray-500">${r.baseCost.toLocaleString()}+</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Parts Replaced (comma-separated)</Label>
                <Input value={form.parts_replaced} onChange={e => setForm(f => ({ ...f, parts_replaced: e.target.value }))} placeholder="tires, brakes, transmission" className="bg-slate-900/60 border-purple-500/20" />
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Mechanic Notes</Label>
                <Textarea value={form.mechanic_notes} onChange={e => setForm(f => ({ ...f, mechanic_notes: e.target.value }))} placeholder="Condition findings, recommendations..." className="bg-slate-900/60 border-purple-500/20" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setLoggingVehicle(null)}>Cancel</Button>
                <Button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600" onClick={() => repairMutation.mutate({ vehicle: loggingVehicle, formData: form })} disabled={repairMutation.isPending}>
                  {repairMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Pay'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}