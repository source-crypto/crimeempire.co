import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import InteractiveCrimeMap from '../components/map/InteractiveCrimeMap';
import MapLegend from '../components/map/MapLegend';
import MapControls from '../components/map/MapControls';
import { Map, Layers, Filter } from 'lucide-react';

export default function CrimeMap() {
  const [mapLayers, setMapLayers] = useState({
    territories: true,
    smugglingRoutes: true,
    supplyLines: true,
    materials: true,
    contraband: true,
    players: true,
    lawEnforcement: true,
    vehicles: false
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: () => base44.entities.Player.filter({ created_by: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0]
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list()
  });

  const { data: supplyRoutes = [] } = useQuery({
    queryKey: ['supplyRoutes'],
    queryFn: () => base44.entities.SupplyRoute.list(),
    enabled: mapLayers.smugglingRoutes || mapLayers.supplyLines
  });

  const { data: lawEnforcement = [] } = useQuery({
    queryKey: ['lawEnforcement'],
    queryFn: () => base44.entities.LawEnforcement.list(),
    enabled: mapLayers.lawEnforcement,
    refetchInterval: 10000
  });

  const { data: contrabandCaches = [] } = useQuery({
    queryKey: ['contrabandCaches'],
    queryFn: () => base44.entities.ContrabandCache.filter({ is_claimed: false }),
    enabled: mapLayers.contraband,
    refetchInterval: 15000
  });

  const { data: materialDeposits = [] } = useQuery({
    queryKey: ['materialDeposits'],
    queryFn: () => base44.entities.MaterialDeposit.filter({ is_active: true }),
    enabled: mapLayers.materials
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    enabled: mapLayers.vehicles
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    enabled: mapLayers.players,
    refetchInterval: 20000
  });

  const toggleLayer = (layer) => {
    setMapLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Map className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading Crime Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
            Crime Map
          </h1>
          <p className="text-gray-400 mt-1">Real-time criminal underworld intelligence</p>
        </div>
        <MapControls layers={mapLayers} onToggleLayer={toggleLayer} />
      </div>

      {/* Map Container */}
      <Card className="glass-panel border-red-500/30">
        <CardHeader className="border-b border-red-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Map className="w-5 h-5 text-red-400" />
            Live Intelligence Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InteractiveCrimeMap
            playerData={playerData}
            territories={territories}
            supplyRoutes={supplyRoutes}
            lawEnforcement={lawEnforcement}
            contrabandCaches={contrabandCaches}
            materialDeposits={materialDeposits}
            vehicles={vehicles}
            allPlayers={allPlayers}
            activeLayers={mapLayers}
          />
        </CardContent>
      </Card>

      {/* Legend and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MapLegend layers={mapLayers} />
        </div>
        
        <Card className="glass-panel border-purple-500/30">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white text-sm">Intelligence Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Active Territories</span>
              <span className="text-purple-400 font-semibold">{territories.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Supply Routes</span>
              <span className="text-cyan-400 font-semibold">{supplyRoutes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Law Enforcement</span>
              <span className="text-red-400 font-semibold">{lawEnforcement.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Contraband Caches</span>
              <span className="text-yellow-400 font-semibold">{contrabandCaches.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Material Deposits</span>
              <span className="text-green-400 font-semibold">{materialDeposits.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Online Players</span>
              <span className="text-blue-400 font-semibold">{allPlayers.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}