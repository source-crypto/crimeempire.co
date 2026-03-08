import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Home, Shield, Package, Wrench, DollarSign, 
  MapPin, Lock, Zap, Loader2, Settings, Palette,
  Plus, ArrowUpCircle, Target, Brain, AlertTriangle, Users
} from 'lucide-react';
import { toast } from 'sonner';
import BaseMissionCenter from '../components/base/BaseMissionCenter';
import AIFacilityManager from '../components/base/AIFacilityManager';
import BaseSecuritySystem from '../components/base/BaseSecuritySystem';

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

  const { data: aiEmployees = [] } = useQuery({
    queryKey: ['aiEmployees', playerBases[0]?.id],
    queryFn: () => base44.entities.AIEmployeeManager.filter({ base_id: playerBases[0].id }),
    enabled: !!playerBases[0]
  });

  const availableProperties = [
    {
      name: 'Warehouse District Loft',
      type: 'apartment',
      price: 50000,
      capacity: 100,
      security: 30,
      description: 'Basic hideout in industrial area',
      emoji: '🏭'
    },
    {
      name: 'Downtown Penthouse',
      type: 'penthouse',
      price: 250000,
      capacity: 300,
      security: 70,
      description: 'Luxury base with high security',
      emoji: '🏙️'
    },
    {
      name: 'Underground Bunker',
      type: 'bunker',
      price: 500000,
      capacity: 500,
      security: 95,
      description: 'Maximum security compound',
      emoji: '🏗️'
    },
    {
      name: 'Abandoned Factory',
      type: 'factory',
      price: 150000,
      capacity: 400,
      security: 50,
      description: 'Large industrial space',
      emoji: '🏚️'
    }
  ];

  const facilityModules = [
    { type: 'storage', name: 'Storage Vault', cost: 15000, benefit: '+100 storage capacity / enables AI income', icon: Package },
    { type: 'armory', name: 'Armory', cost: 25000, benefit: '+20% weapon damage / arms missions', icon: Shield },
    { type: 'workshop', name: 'Crafting Workshop', cost: 30000, benefit: 'Craft items + base missions', icon: Wrench },
    { type: 'laboratory', name: 'Laboratory', cost: 40000, benefit: 'Research + high-value missions', icon: Zap },
    { type: 'intelligence', name: 'Intelligence Center', cost: 35000, benefit: 'Track enemies + heist planning', icon: MapPin },
    { type: 'medical', name: 'Medical Bay', cost: 20000, benefit: 'Heal + medical ops income', icon: Plus }
  ];

  const purchasePropertyMutation = useMutation({
    mutationFn: async (property) => {
      if (playerData.crypto_balance < property.price) throw new Error('Insufficient funds');

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
        is_active: true
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
    },
    onError: (error) => toast.error(error.message)
  });

  const installFacilityMutation = useMutation({
    mutationFn: async ({ facility, baseId }) => {
      if (playerData.crypto_balance < facility.cost) throw new Error('Insufficient funds');

      await base44.entities.BaseFacility.create({
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseFacilities']);
      queryClient.invalidateQueries(['player']);
      toast.success('Facility installed!');
    },
    onError: (error) => toast.error(error.message)
  });

  const upgradeFacilityMutation = useMutation({
    mutationFn: async (facility) => {
      const cost = facility.upgrade_cost || 20000;
      if (playerData.crypto_balance < cost) throw new Error('Insufficient funds');
      await base44.entities.BaseFacility.update(facility.id, {
        level: (facility.level || 1) + 1,
        efficiency: Math.min(100, (facility.efficiency || 100) + 10),
        upgrade_cost: cost * 1.5
      });
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baseFacilities']);
      queryClient.invalidateQueries(['player']);
      toast.success('Facility upgraded!');
    },
    onError: (err) => toast.error(err.message)
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
  const totalPassiveIncome = aiEmployees.reduce((sum, e) => sum + (e.passive_income_rate || 0), 0);

  if (!playerData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-purple-500/30 bg-gradient-to-r from-slate-900/60 via-purple-900/20 to-slate-900/60">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-white text-2xl">
                <Home className="w-6 h-6 text-purple-400" />
                Personal Hideout
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">Your criminal empire's base of operations</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-green-800 text-green-200 text-sm px-3">
                <DollarSign className="w-3 h-3 mr-1" />
                ${(playerData.crypto_balance || 0).toLocaleString()}
              </Badge>
              {totalPassiveIncome > 0 && (
                <Badge className="bg-purple-800 text-purple-200 text-sm px-3 animate-pulse">
                  <Brain className="w-3 h-3 mr-1" />
                  +${totalPassiveIncome.toLocaleString()}/hr passive
                </Badge>
              )}
              {currentBase && (
                <Badge className={currentBase.is_spawn_point ? 'bg-cyan-800 text-cyan-200' : 'bg-gray-700 text-gray-300'}>
                  {currentBase.is_spawn_point ? '⚡ Spawn Active' : 'No Spawn Set'}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {!currentBase ? (
        /* Purchase Property */
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Purchase Your First Property</CardTitle>
            <p className="text-gray-400 text-sm">Choose a base that fits your playstyle. Each unlocks different mission types and facilities.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProperties.map((property) => (
                <div
                  key={property.name}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedProperty?.name === property.name
                      ? 'border-purple-400 bg-purple-900/30'
                      : 'border-purple-500/20 bg-slate-900/30 hover:border-purple-400/50'
                  }`}
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{property.emoji}</span>
                    <div>
                      <h3 className="text-white font-semibold">{property.name}</h3>
                      <p className="text-sm text-gray-400">{property.description}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Storage Capacity:</span>
                      <span className="text-cyan-400 font-semibold">{property.capacity} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Security:</span>
                      <span className="text-green-400 font-semibold">{property.security}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <span className="text-yellow-400 font-bold">${property.price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Security Level</span>
                      <span>{property.security}%</span>
                    </div>
                    <Progress value={property.security} className="h-1.5" />
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      purchasePropertyMutation.mutate(property);
                    }}
                    disabled={purchasePropertyMutation.isPending || playerData?.crypto_balance < property.price}
                  >
                    {purchasePropertyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : playerData?.crypto_balance < property.price ? (
                      'Insufficient Funds'
                    ) : (
                      'Purchase Property'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Main Hideout Tabs */
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-panel border border-purple-500/20 flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
              <Home className="w-3.5 h-3.5" />Overview
            </TabsTrigger>
            <TabsTrigger value="facilities" className="flex items-center gap-1.5 text-xs">
              <Wrench className="w-3.5 h-3.5" />Facilities
            </TabsTrigger>
            <TabsTrigger value="missions" className="flex items-center gap-1.5 text-xs">
              <Target className="w-3.5 h-3.5" />Missions
            </TabsTrigger>
            <TabsTrigger value="ai_staff" className="flex items-center gap-1.5 text-xs">
              <Brain className="w-3.5 h-3.5" />AI Staff
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5" />Security
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5" />Storage
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <Card className="glass-panel border-purple-500/20">
                <CardHeader className="border-b border-purple-500/20">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Home className="w-5 h-5 text-purple-400" />
                    {currentBase.base_name}
                    <Badge className="capitalize bg-purple-800">{currentBase.base_type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30 text-center">
                      <Package className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Storage</p>
                      <p className="text-lg font-bold text-white">
                        {currentBase.current_storage || 0}/{currentBase.storage_capacity}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-900/20 border border-green-500/30 text-center">
                      <Shield className="w-5 h-5 text-green-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Security</p>
                      <p className="text-lg font-bold text-white">{currentBase.security_level}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-900/20 border border-cyan-500/30 text-center">
                      <Wrench className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Facilities</p>
                      <p className="text-lg font-bold text-white">{baseFacilities.length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-yellow-900/20 border border-yellow-500/30 text-center">
                      <Brain className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Passive/hr</p>
                      <p className="text-lg font-bold text-white">${totalPassiveIncome.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Base Security Level</span>
                      <span>{currentBase.security_level}%</span>
                    </div>
                    <Progress value={currentBase.security_level} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setSpawnPointMutation.mutate(currentBase.id)}
                      disabled={currentBase.is_spawn_point || setSpawnPointMutation.isPending}
                      variant={currentBase.is_spawn_point ? 'secondary' : 'default'}
                      className={currentBase.is_spawn_point ? '' : 'bg-cyan-700 hover:bg-cyan-600'}
                    >
                      {currentBase.is_spawn_point ? '⚡ Spawn Point Active' : 'Set as Spawn Point'}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-purple-500/40 text-purple-300 hover:bg-purple-900/30"
                      onClick={() => toast.info('Navigate to Facilities tab to upgrade')}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Level {currentBase.upgrade_level}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-900/10 text-center">
                  <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{baseFacilities.filter(f => ['workshop','laboratory','intelligence'].includes(f.facility_type)).length}</p>
                  <p className="text-xs text-gray-400">Mission Types</p>
                </div>
                <div className="p-3 rounded-xl border border-pink-500/20 bg-pink-900/10 text-center">
                  <Brain className="w-5 h-5 text-pink-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{aiEmployees.length}</p>
                  <p className="text-xs text-gray-400">AI Employees</p>
                </div>
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-900/10 text-center">
                  <Siren className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{currentBase.security_level || 0}%</p>
                  <p className="text-xs text-gray-400">Defense Rating</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Facilities */}
          <TabsContent value="facilities">
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white">Facility Modules</CardTitle>
                <p className="text-sm text-gray-400">Each facility unlocks missions, AI staff, and passive income streams</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {facilityModules.map((facility) => {
                    const Icon = facility.icon;
                    const isInstalled = baseFacilities.some(f => f.facility_type === facility.type);
                    const installed = baseFacilities.find(f => f.facility_type === facility.type);

                    return (
                      <div
                        key={facility.type}
                        className={`p-4 rounded-xl border transition-all ${
                          isInstalled
                            ? 'bg-green-900/20 border-green-500/30'
                            : 'bg-slate-900/30 border-purple-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${isInstalled ? 'bg-green-700' : 'bg-gradient-to-br from-purple-600 to-pink-600'}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold">{facility.name}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{facility.benefit}</p>
                          </div>
                        </div>

                        {isInstalled ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-green-700">Level {installed?.level || 1}</Badge>
                              <Badge className="bg-green-900 text-green-300">Operational</Badge>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Efficiency</span>
                              <span>{installed?.efficiency || 100}%</span>
                            </div>
                            <Progress value={installed?.efficiency || 100} className="h-1.5" />
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/30"
                              onClick={() => upgradeFacilityMutation.mutate(installed)}
                              disabled={upgradeFacilityMutation.isPending || playerData.crypto_balance < (installed?.upgrade_cost || 20000)}
                            >
                              Upgrade — ${(installed?.upgrade_cost || 20000).toLocaleString()}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full bg-purple-700 hover:bg-purple-600"
                            onClick={() => installFacilityMutation.mutate({
                              facility,
                              baseId: currentBase.id
                            })}
                            disabled={installFacilityMutation.isPending || playerData?.crypto_balance < facility.cost}
                          >
                            Install — ${facility.cost.toLocaleString()}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Missions */}
          <TabsContent value="missions">
            <Card className="glass-panel border-blue-500/20">
              <CardHeader className="border-b border-blue-500/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Base-Hosted Missions
                </CardTitle>
                <p className="text-sm text-gray-400">Host exclusive operations from your facilities. Each facility unlocks unique mission types.</p>
              </CardHeader>
              <CardContent className="p-6">
                <BaseMissionCenter
                  currentBase={currentBase}
                  baseFacilities={baseFacilities}
                  playerData={playerData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Staff */}
          <TabsContent value="ai_staff">
            <Card className="glass-panel border-pink-500/20">
              <CardHeader className="border-b border-pink-500/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-pink-400" />
                  AI Employee Management
                </CardTitle>
                <p className="text-sm text-gray-400">Assign AI employees to generate passive income and manage facilities automatically.</p>
              </CardHeader>
              <CardContent className="p-6">
                <AIFacilityManager
                  currentBase={currentBase}
                  baseFacilities={baseFacilities}
                  playerData={playerData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card className="glass-panel border-red-500/20">
              <CardHeader className="border-b border-red-500/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Security Systems
                </CardTitle>
                <p className="text-sm text-gray-400">Install defensive systems and respond to rival player attacks or LE raids.</p>
              </CardHeader>
              <CardContent className="p-6">
                <BaseSecuritySystem
                  currentBase={currentBase}
                  playerData={playerData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage */}
          <TabsContent value="storage">
            <Card className="glass-panel border-cyan-500/20">
              <CardHeader className="border-b border-cyan-500/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  Base Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-900/10 text-center">
                      <p className="text-3xl font-bold text-white">{currentBase.current_storage || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">Units Used</p>
                    </div>
                    <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-900/10 text-center">
                      <p className="text-3xl font-bold text-cyan-400">{currentBase.storage_capacity}</p>
                      <p className="text-xs text-gray-400 mt-1">Total Capacity</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Storage Used</span>
                      <span>{Math.round(((currentBase.current_storage || 0) / currentBase.storage_capacity) * 100)}%</span>
                    </div>
                    <Progress 
                      value={((currentBase.current_storage || 0) / currentBase.storage_capacity) * 100}
                      className="h-3"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-600/30">
                    <p className="text-xs text-gray-400 mb-2">Storage Facilities</p>
                    {baseFacilities.filter(f => f.facility_type === 'storage').length > 0 ? (
                      baseFacilities.filter(f => f.facility_type === 'storage').map(f => (
                        <div key={f.id} className="flex justify-between text-sm">
                          <span className="text-white">{f.facility_name}</span>
                          <Badge className="bg-green-700">+{f.capacity || 200} units</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No storage facilities installed</p>
                    )}
                  </div>

                  <Button 
                    className="w-full bg-cyan-700 hover:bg-cyan-600"
                    onClick={() => toast.info('Install a Storage Vault in the Facilities tab for extra capacity')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Expand Storage
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}