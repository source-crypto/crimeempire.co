import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Package, Eye, Shield, ArrowUpCircle, Route, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_EMOJI = {
  courier_bike:   '🏍️',
  cargo_van:      '🚐',
  muscle_car:     '🚗',
  armored_truck:  '🚛',
  speedboat:      '🚤',
  helicopter:     '🚁',
  sports:         '🏎️',
  muscle:         '💪',
  luxury:         '🚘',
  suv:            '🚙',
  motorcycle:     '🏍️',
  truck:          '🚚',
};

const STATUS_COLOR = {
  idle:        'bg-green-600',
  in_transit:  'bg-blue-600',
  maintenance: 'bg-yellow-600',
};

export default function VehicleCard({ vehicle, onUpgrade, onAssignRoute, onUnassign, upgrading }) {
  const upgradeLevel = vehicle.upgrade_level || 0;
  const upgradeCost = 8000 * (upgradeLevel + 1);

  return (
    <Card className="glass-panel border-purple-500/20 hover:border-purple-500/40 transition-all">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{TYPE_EMOJI[vehicle.type] || '🚗'}</span>
            <div>
              <h4 className="font-bold text-white">{vehicle.name}</h4>
              <p className="text-xs text-gray-400 capitalize">{vehicle.type?.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={STATUS_COLOR[vehicle.status || 'idle']}>
              {vehicle.status || 'idle'}
            </Badge>
            {upgradeLevel > 0 && (
              <Badge className="bg-purple-700 text-xs">Lv {upgradeLevel}</Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-4">
          <StatBar icon={<Zap className="w-3 h-3 text-cyan-400" />} label="Speed" value={vehicle.speed || 60} color="bg-cyan-500" />
          <StatBar icon={<Package className="w-3 h-3 text-green-400" />} label="Cargo" value={Math.min(100, (vehicle.cargo_capacity / 2))} display={`${vehicle.cargo_capacity} u`} color="bg-green-500" />
          <StatBar icon={<Eye className="w-3 h-3 text-purple-400" />} label="Stealth" value={vehicle.stealth || 50} color="bg-purple-500" />
          <StatBar icon={<Shield className="w-3 h-3 text-orange-400" />} label="Armor" value={vehicle.armor || 30} color="bg-orange-500" />
        </div>

        {/* Route Assignment */}
        {vehicle.assigned_route_name ? (
          <div className="mb-3 p-2 rounded-lg bg-blue-900/20 border border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400">{vehicle.assigned_route_name}</span>
            </div>
            <button
              onClick={() => onUnassign(vehicle)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Unassign
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full mb-2 border-blue-500/30 text-blue-400 text-xs hover:bg-blue-900/20"
            onClick={() => onAssignRoute(vehicle)}
          >
            <Route className="w-3 h-3 mr-1" />
            Assign to Route
          </Button>
        )}

        {/* Upgrade */}
        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-xs"
          onClick={() => onUpgrade(vehicle)}
          disabled={upgrading || upgradeLevel >= 5}
        >
          {upgradeLevel >= 5 ? (
            <><Wrench className="w-3 h-3 mr-1" /> Max Level</>
          ) : (
            <><ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade — ${upgradeCost.toLocaleString()}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function StatBar({ icon, label, value, display, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {icon}
      <span className="text-gray-400 w-12">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-white w-10 text-right">{display ?? `${Math.round(value)}`}</span>
    </div>
  );
}