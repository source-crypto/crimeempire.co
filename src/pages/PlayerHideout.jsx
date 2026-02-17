import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Home, Shield, Package, Wrench, DollarSign, 
  MapPin, Lock, Zap, Loader2, Settings, Palette,
  Plus, ArrowUpCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerHideout() {
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: playerBases = [] } = useQuery({
    queryKey: ['playerBases', playerData?.id],
    queryFn: () => base44.entities.PlayerBase.filter({ player_id: playerData.id }),
    enabled: !!playerData
  });

  const { data: baseFacilities = [] } = useQuery({
    queryKey: ['baseFacilities', playerBases[0]?.id],
    queryFn: () => base44.entities.BaseFacility.filter({ base_id: playerBases[0].id }),
    enabled: !!playerBases[0]
  });

  const availableProperties = [
    {
      name: 'Warehouse District Loft',
      type: 'apartment',
      price: 50000,
      capacity: 100,
      security: 30,
      description: 'Basic hideout in industrial area'
    },
    {
      name: 'Downtown Penthouse',
      type: 'penthouse',
      price: 250000,
      capacity: 300,
      security: 70,
      description: 'Luxury base with high security'
    },
    {
      name: 'Underground Bunker',
      type: 'bunker',
      price: 500000,
      capacity: 500,
      security: 95,
      description: 'Maximum security compound'
    },
    {
      name: 'Abandoned Factory',
      type: 'factory',
      price: 150000,
      capacity: 400,
      security: 50,
      description: 'Large industrial space'
    }
  ];

  const facilityModules = [
    {
      type: 'storage',
      name: 'Storage Vault',
      cost: 15000,
      benefit: '+100 storage capacity',
      icon: Package
    },
    {
      type: 'armory',
      name: 'Armory',
      cost: 25000,
      benefit: '+20% weapon damage',
      icon: Shield
    },
    {
      type: 'workshop',
      name: 'Crafting Workshop',
      cost: 30000,
      benefit: 'Craft items and equipment',
      icon: Wrench
    },
    {
      type: 'laboratory',
      name: 'Laboratory',
      cost: 40000,
      benefit: 'Research and development',
      icon: Zap
    },
    {
      type: 'intelligence',
      name: 'Intelligence Center',
      cost: 35000,
      benefit: 'Track enemies and missions',
      icon: MapPin
    },
    {
      type: 'medical',
      name: 'Medical Bay',
      cost: 20000,
      benefit: 'Heal and boost stats',
      icon: Plus
    }
  ];

  const purchasePropertyMutation = useMutation({
    mutationFn: async (property) => {
      if (playerData.crypto_balance < property.price) {
        throw new Error('Insufficient funds');
      }

      const base = await base44.entities.PlayerBase.create({
        player_id: playerData.id,
        base_name: property.name,
        base_type: property.type,
        location: {
          lat: 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: -74.0060 + (Math.random() - 0.5) * 0.1
        },
        storage_capacity: property.capacity,
        security_level: property.security,
        is_spawn_point: playerBases.length === 0,
        upgrade_level: 1,
        is_active: true,
        aesthetics: {
          theme: 'modern',
          color_scheme: 'dark'
        }
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - property.price
      });

      return base;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerBases']);
      queryClient.invalidateQueries(['player']);
      toast.success('Property purchased!');
      setSelectedProperty(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const installFacilityMutation = useMutation({
    mutationFn: async ({ facility, baseId }) => {
      if (playerData.crypto_balance < facility.cost) {
        throw new Error('Insufficient funds');
      }

      const newFacility = await base44.entities.BaseFacility.create({
        base_id: baseId,
        facility_type: facility.type,
        facility_name: facility.name,
        level: 1,
        efficiency: 100,
        operational: true,
        upgrade_cost: facility.cost * 1.5,
        maintenance_cost: facility.cost * 0.05
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - facility.cost
      });

      return newFacility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseFacilities']);
      queryClient.invalidateQueries(['player']);
      toast.success('Facility installed!');
    },
    onError: (error) => toast.error(error.message)
  });

  const setSpawnPointMutation = useMutation({
    mutationFn: async (baseId) => {
      await Promise.all(
        playerBases.map(base => 
          base44.entities.PlayerBase.update(base.id, { is_spawn_point: base.id === baseId })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerBases']);
      toast.success('Spawn point updated!');
    }
  });

  const currentBase = playerBases[0];

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Home className="w-6 h-6 text-purple-400" />
                Personal Hideout
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                Your base of operations
              </p>
            </div>
            {playerData && (
              <Badge className="bg-green-600">
                ${playerData.crypto_balance?.toLocaleString()}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {!currentBase ? (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Purchase Your First Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProperties.map((property) => (
                <div
                  key={property.name}
                  className="p-4 rounded-lg bg-slate-900/30 border border-purple-500/20"
                >
                  <h3 className="text-white font-semibold mb-2">{property.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{property.description}</p>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Storage:</span>
                      <span className="text-cyan-400">{property.capacity} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Security:</span>
                      <span className="text-green-400">{property.security}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <span className="text-yellow-400 font-semibold">
                        ${property.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                    onClick={() => purchasePropertyMutation.mutate(property)}
                    disabled={purchasePropertyMutation.isPending || playerData?.crypto_balance < property.price}
                  >
                    {purchasePropertyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Purchase Property</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-panel border border-purple-500/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {currentBase.base_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                    <Package className="w-5 h-5 text-purple-400 mb-2" />
                    <p className="text-xs text-gray-400">Storage</p>
                    <p className="text-lg font-bold text-white">
                      {currentBase.current_storage || 0}/{currentBase.storage_capacity}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                    <Shield className="w-5 h-5 text-green-400 mb-2" />
                    <p className="text-xs text-gray-400">Security</p>
                    <p className="text-lg font-bold text-white">{currentBase.security_level}%</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                    <Wrench className="w-5 h-5 text-cyan-400 mb-2" />
                    <p className="text-xs text-gray-400">Facilities</p>
                    <p className="text-lg font-bold text-white">{baseFacilities.length}</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30">
                    <ArrowUpCircle className="w-5 h-5 text-yellow-400 mb-2" />
                    <p className="text-xs text-gray-400">Level</p>
                    <p className="text-lg font-bold text-white">{currentBase.upgrade_level}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => setSpawnPointMutation.mutate(currentBase.id)}
                    disabled={currentBase.is_spawn_point}
                    className="w-full"
                    variant={currentBase.is_spawn_point ? "secondary" : "default"}
                  >
                    {currentBase.is_spawn_point ? 'Current Spawn Point' : 'Set as Spawn Point'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facilities">
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white">Install Facility Modules</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {facilityModules.map((facility) => {
                    const Icon = facility.icon;
                    const isInstalled = baseFacilities.some(f => f.facility_type === facility.type);
                    const canAfford = playerData?.crypto_balance >= facility.cost;

                    return (
                      <div
                        key={facility.type}
                        className={`p-4 rounded-lg border ${
                          isInstalled 
                            ? 'bg-green-900/20 border-green-500/30' 
                            : 'bg-slate-900/30 border-purple-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold">{facility.name}</h4>
                            <p className="text-xs text-gray-400 mt-1">{facility.benefit}</p>
                          </div>
                        </div>

                        {isInstalled ? (
                          <Badge className="bg-green-600">Installed</Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full bg-purple-600"
                            onClick={() => installFacilityMutation.mutate({ 
                              facility, 
                              baseId: currentBase.id 
                            })}
                            disabled={installFacilityMutation.isPending || !canAfford}
                          >
                            Install - ${facility.cost.toLocaleString()}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {baseFacilities.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-white font-semibold mb-3">Your Facilities</h4>
                    <div className="space-y-2">
                      {baseFacilities.map((facility) => (
                        <div
                          key={facility.id}
                          className="p-3 rounded-lg bg-slate-900/30 border border-cyan-500/20"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-white font-semibold">{facility.facility_name}</h5>
                              <p className="text-xs text-gray-400">Level {facility.level}</p>
                            </div>
                            <Badge className={facility.operational ? 'bg-green-600' : 'bg-red-600'}>
                              {facility.operational ? 'Operational' : 'Offline'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customize">
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Customize Hideout
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-400 text-center py-8">
                  Customization features coming soon. Add decorations, change themes, and personalize your space.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storage">
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Base Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Storage system coming soon</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Capacity: {currentBase.current_storage || 0}/{currentBase.storage_capacity}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}