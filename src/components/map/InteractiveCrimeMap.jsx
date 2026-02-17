import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Tooltip } from 'react-leaflet';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Package, Shield, DollarSign, Truck, 
  Users, Car, AlertTriangle, Target, Crown, Swords 
} from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

export default function InteractiveCrimeMap({
  playerData,
  territories,
  supplyRoutes,
  lawEnforcement,
  contrabandCaches,
  materialDeposits,
  vehicles,
  allPlayers,
  activeLayers
}) {
  const queryClient = useQueryClient();
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Fetch faction diplomacy data for map visualization
  const { data: factionRelations = [] } = useQuery({
    queryKey: ['factionDiplomacy'],
    queryFn: () => base44.entities.FactionDiplomacy.filter({ status: 'negotiating' }),
    refetchInterval: 30000
  });

  const { data: factions = [] } = useQuery({
    queryKey: ['rivalFactions'],
    queryFn: () => base44.entities.RivalFaction.list()
  });

  const claimContrabandMutation = useMutation({
    mutationFn: async (cache) => {
      if (playerData.crypto_balance < 1000) {
        throw new Error('Need $1,000 to claim contraband');
      }

      await base44.entities.ContrabandCache.update(cache.id, {
        is_claimed: true,
        discovered_by: playerData.id
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - 1000 + cache.value
      });

      return cache;
    },
    onSuccess: (cache) => {
      queryClient.invalidateQueries(['contrabandCaches']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Claimed ${cache.cache_type} worth $${cache.value.toLocaleString()}!`);
    },
    onError: (error) => toast.error(error.message)
  });

  const extractMaterialMutation = useMutation({
    mutationFn: async (deposit) => {
      const extractAmount = 100;
      const totalCost = deposit.extraction_cost * extractAmount;

      if (playerData.crypto_balance < totalCost) {
        throw new Error(`Need $${totalCost.toLocaleString()} to extract materials`);
      }

      await base44.entities.MaterialDeposit.update(deposit.id, {
        quantity_available: deposit.quantity_available - extractAmount,
        controlled_by_crew_id: playerData.crew_id
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - totalCost
      });

      return { deposit, extractAmount };
    },
    onSuccess: ({ deposit, extractAmount }) => {
      queryClient.invalidateQueries(['materialDeposits']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Extracted ${extractAmount} units of ${deposit.material_type}!`);
    },
    onError: (error) => toast.error(error.message)
  });

  const center = [40.7128, -74.0060];

  const getTerritoryColor = (territory) => {
    const colors = {
      financial: '#10B981',
      industrial: '#F59E0B',
      residential: '#3B82F6',
      tactical: '#EF4444'
    };
    return colors[territory.resource_type] || '#9333EA';
  };

  const getRouteColor = (route) => {
    return route.risk_level > 70 ? '#EF4444' : route.risk_level > 40 ? '#F59E0B' : '#10B981';
  };

  return (
    <div className="relative h-[600px] w-full">
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full rounded-lg"
        style={{ background: '#0f172a' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />

        {/* Faction Diplomacy Relations - Visualized on Map */}
        {factionRelations.map((relation) => {
          const faction = factions.find(f => f.id === relation.target_faction_id);
          if (!faction?.territory_coordinates) return null;
          
          const playerTerritory = territories.find(t => t.owner_id === playerData?.id);
          if (!playerTerritory) return null;

          return (
            <React.Fragment key={relation.id}>
              <Polyline
                positions={[
                  [playerTerritory.coordinates.lat, playerTerritory.coordinates.lng],
                  [faction.territory_coordinates.lat, faction.territory_coordinates.lng]
                ]}
                pathOptions={{
                  color: relation.action_type === 'declare_war' ? '#EF4444' :
                         relation.action_type === 'form_alliance' ? '#10B981' : '#3B82F6',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '5, 10'
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4" />
                      Diplomatic Action
                    </h4>
                    <p className="text-xs"><strong>Type:</strong> {relation.action_type.replace('_', ' ')}</p>
                    <p className="text-xs"><strong>Target:</strong> {relation.target_faction_name}</p>
                    <Badge className={relation.status === 'negotiating' ? 'bg-yellow-600' : 'bg-green-600'}>
                      {relation.status}
                    </Badge>
                  </div>
                </Popup>
              </Polyline>
              
              <Marker
                position={[faction.territory_coordinates.lat, faction.territory_coordinates.lng]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `<div class="${
                    relation.action_type === 'declare_war' ? 'bg-red-600' :
                    relation.action_type === 'form_alliance' ? 'bg-green-600' : 'bg-blue-600'
                  } rounded-full p-2 border-2 border-white">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
                    </svg>
                  </div>`
                })}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-bold mb-2">{faction.name}</h4>
                    <p className="text-sm mb-1">Diplomatic Status:</p>
                    <Badge className={
                      relation.relationship_change > 0 ? 'bg-green-600' : 'bg-red-600'
                    }>
                      {relation.relationship_change > 0 ? 'Improving' : 'Deteriorating'}
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Territories */}
        {activeLayers.territories && territories.map((territory) => (
          <Circle
            key={territory.id}
            center={[territory.coordinates.lat, territory.coordinates.lng]}
            radius={500}
            pathOptions={{
              color: getTerritoryColor(territory),
              fillColor: getTerritoryColor(territory),
              fillOpacity: 0.2
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {territory.name}
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Type:</strong> {territory.resource_type}</p>
                  <p><strong>Control:</strong> {territory.control_percentage}%</p>
                  <p><strong>Revenue:</strong> {territory.revenue_multiplier}x</p>
                  <Badge variant={territory.is_contested ? 'destructive' : 'secondary'}>
                    {territory.is_contested ? 'Contested' : 'Controlled'}
                  </Badge>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Supply Routes & Smuggling Routes */}
        {(activeLayers.supplyLines || activeLayers.smugglingRoutes) && supplyRoutes.map((route) => (
          <Polyline
            key={route.id}
            positions={[
              [route.start_coordinates.lat, route.start_coordinates.lng],
              [route.end_coordinates.lat, route.end_coordinates.lng]
            ]}
            pathOptions={{
              color: getRouteColor(route),
              weight: 3,
              opacity: 0.7,
              dashArray: route.route_type === 'smuggling' ? '10, 10' : null
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  {route.route_type === 'smuggling' ? 'Smuggling Route' : 'Supply Line'}
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Risk:</strong> {route.risk_level}%</p>
                  <p><strong>Efficiency:</strong> {route.efficiency}%</p>
                  {route.cargo_type && <p><strong>Cargo:</strong> {route.cargo_type}</p>}
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Law Enforcement */}
        {activeLayers.lawEnforcement && lawEnforcement.map((unit) => (
          <Marker
            key={unit.id}
            position={[unit.coordinates.lat, unit.coordinates.lng]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div class="bg-red-500 rounded-full p-2 animate-pulse">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
                </svg>
              </div>`
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  Law Enforcement
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Type:</strong> {unit.unit_type}</p>
                  <p><strong>Threat Level:</strong> {unit.threat_level}/100</p>
                  <p><strong>Patrol Radius:</strong> {unit.patrol_radius} km</p>
                  <Badge variant="destructive">Active</Badge>
                </div>
              </div>
            </Popup>
            <Circle
              center={[unit.coordinates.lat, unit.coordinates.lng]}
              radius={unit.patrol_radius * 1000}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.1
              }}
            />
          </Marker>
        ))}

        {/* Contraband Caches */}
        {activeLayers.contraband && contrabandCaches.map((cache) => (
          <Marker
            key={cache.id}
            position={[cache.coordinates.lat, cache.coordinates.lng]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div class="bg-yellow-500 rounded-full p-2">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                </svg>
              </div>`
            })}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-yellow-500" />
                  Contraband Cache
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Type:</strong> {cache.cache_type}</p>
                  <p><strong>Value:</strong> ${cache.value.toLocaleString()}</p>
                  <p><strong>Quantity:</strong> {cache.quantity}</p>
                  <p><strong>Heat:</strong> {cache.heat_level}/100</p>
                  <Button
                    size="sm"
                    onClick={() => claimContrabandMutation.mutate(cache)}
                    disabled={claimContrabandMutation.isPending}
                    className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700"
                  >
                    Claim ($1,000)
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Material Deposits */}
        {activeLayers.materials && materialDeposits.map((deposit) => (
          <Marker
            key={deposit.id}
            position={[deposit.coordinates.lat, deposit.coordinates.lng]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div class="bg-green-500 rounded-full p-2">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
                </svg>
              </div>`
            })}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  Material Deposit
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Type:</strong> {deposit.material_type}</p>
                  <p><strong>Available:</strong> {deposit.quantity_available} units</p>
                  <p><strong>Cost:</strong> ${deposit.extraction_cost}/unit</p>
                  <p><strong>Rate:</strong> {deposit.extraction_rate}/hr</p>
                  <Button
                    size="sm"
                    onClick={() => extractMaterialMutation.mutate(deposit)}
                    disabled={extractMaterialMutation.isPending}
                    className="w-full mt-2 bg-green-600 hover:bg-green-700"
                  >
                    Extract 100 Units
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Players */}
        {activeLayers.players && allPlayers.map((player) => (
          <Marker
            key={player.id}
            position={[
              40.7128 + (Math.random() - 0.5) * 0.1,
              -74.0060 + (Math.random() - 0.5) * 0.1
            ]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div class="bg-blue-500 rounded-full p-2">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                </svg>
              </div>`
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  {player.username}
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Level:</strong> {player.level}</p>
                  <p><strong>Power:</strong> {player.strength_score}</p>
                  <p><strong>Territories:</strong> {player.territory_count || 0}</p>
                  <Badge>{player.crew_role || 'Solo'}</Badge>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Vehicles */}
        {activeLayers.vehicles && vehicles.slice(0, 10).map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[
              40.7128 + (Math.random() - 0.5) * 0.1,
              -74.0060 + (Math.random() - 0.5) * 0.1
            ]}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `<div class="bg-purple-500 rounded-full p-2">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                </svg>
              </div>`
            })}
          >
            <Tooltip>{vehicle.name}</Tooltip>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Car className="w-4 h-4 text-purple-500" />
                  {vehicle.name}
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Type:</strong> {vehicle.type}</p>
                  <p><strong>Speed:</strong> {vehicle.top_speed} mph</p>
                  <p><strong>Value:</strong> ${vehicle.value.toLocaleString()}</p>
                  {vehicle.is_stolen && <Badge variant="destructive">Stolen</Badge>}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}