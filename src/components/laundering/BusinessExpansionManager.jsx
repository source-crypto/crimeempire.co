import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, MapPin, Shield, Cpu, Globe, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const expansionTypes = {
  new_location: {
    icon: MapPin,
    label: 'New Location',
    cost: 300000,
    capacity_boost: 40000,
    description: 'Open a new branch'
  },
  security_upgrade: {
    icon: Shield,
    label: 'Security Upgrade',
    cost: 150000,
    heat_reduction: 5,
    description: 'Advanced security systems'
  },
  automation_center: {
    icon: Cpu,
    label: 'Automation Center',
    cost: 200000,
    efficiency_boost: 10,
    description: 'AI-powered automation'
  },
  offshore_network: {
    icon: Globe,
    label: 'Offshore Network',
    cost: 500000,
    capacity_boost: 75000,
    heat_reduction: 8,
    description: 'International operations'
  },
  partnership: {
    icon: Users,
    label: 'Business Partnership',
    cost: 250000,
    efficiency_boost: 7,
    capacity_boost: 30000,
    description: 'Partner with another enterprise'
  }
};

export default function BusinessExpansionManager({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedExpansionType, setSelectedExpansionType] = useState('new_location');
  const [locationName, setLocationName] = useState('');

  const { data: expansions = [] } = useQuery({
    queryKey: ['businessExpansions', selectedBusiness?.id],
    queryFn: () => base44.entities.BusinessExpansion.filter({ business_id: selectedBusiness.id }),
    enabled: !!selectedBusiness?.id
  });

  const createExpansionMutation = useMutation({
    mutationFn: async () => {
      const expansion = expansionTypes[selectedExpansionType];
      
      if (playerData.balance < expansion.cost) throw new Error('Insufficient funds');

      await base44.entities.BusinessExpansion.create({
        business_id: selectedBusiness.id,
        expansion_type: selectedExpansionType,
        location_name: selectedExpansionType === 'new_location' ? locationName : expansion.label,
        cost: expansion.cost,
        capacity_boost: expansion.capacity_boost || 0,
        efficiency_boost: expansion.efficiency_boost || 0,
        heat_reduction: expansion.heat_reduction || 0,
        status: 'construction',
        completion_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - expansion.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessExpansions']);
      queryClient.invalidateQueries(['player']);
      setLocationName('');
      toast.success('Expansion started!');
    },
    onError: (error) => toast.error(error.message)
  });

  const activateExpansionMutation = useMutation({
    mutationFn: async (expansion) => {
      await base44.entities.BusinessExpansion.update(expansion.id, {
        status: 'operational',
        is_active: true
      });

      const business = businesses.find(b => b.id === expansion.business_id);
      if (business) {
        await base44.entities.MoneyLaunderingBusiness.update(business.id, {
          capacity_per_hour: business.capacity_per_hour + expansion.capacity_boost,
          efficiency: Math.min(100, business.efficiency + expansion.efficiency_boost),
          heat_generation: Math.max(0, business.heat_generation - expansion.heat_reduction)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessExpansions']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      toast.success('Expansion activated!');
    }
  });

  const activeExpansions = expansions.filter(e => e.status === 'operational');
  const constructionExpansions = expansions.filter(e => e.status === 'construction');

  return (
    <div className="space-y-4">
      {/* Select Business */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Select Business to Expand</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {businesses.map(business => (
              <button
                key={business.id}
                onClick={() => setSelectedBusiness(business)}
                className={`p-3 rounded border-2 transition-all ${
                  selectedBusiness?.id === business.id
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-700 bg-slate-800/50 hover:border-gray-600'
                }`}
              >
                <p className="text-white text-xs font-semibold">{business.business_name}</p>
                <p className="text-gray-400 text-[10px]">Level {business.level}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expansion Options */}
      {selectedBusiness && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="glass-panel border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white text-sm">Available Expansions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(expansionTypes).map(([type, info]) => {
                  const Icon = info.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedExpansionType(type)}
                      className={`p-3 rounded border-2 transition-all ${
                        selectedExpansionType === type
                          ? 'border-green-500 bg-green-900/30'
                          : 'border-gray-700 bg-slate-800/50 hover:border-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6 text-green-400 mb-1 mx-auto" />
                      <p className="text-white text-xs font-semibold">{info.label}</p>
                      <p className="text-gray-400 text-[10px]">${(info.cost / 1000).toFixed(0)}k</p>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-900/50 rounded border border-green-500/30">
                <p className="text-green-400 text-xs font-semibold mb-2">
                  {expansionTypes[selectedExpansionType].label}
                </p>
                <p className="text-gray-300 text-xs mb-2">
                  {expansionTypes[selectedExpansionType].description}
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="p-1.5 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Cost</p>
                    <p className="text-yellow-400 font-semibold">${expansionTypes[selectedExpansionType].cost.toLocaleString()}</p>
                  </div>
                  {expansionTypes[selectedExpansionType].capacity_boost && (
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">+Capacity</p>
                      <p className="text-blue-400 font-semibold">+${(expansionTypes[selectedExpansionType].capacity_boost / 1000).toFixed(0)}k/hr</p>
                    </div>
                  )}
                  {expansionTypes[selectedExpansionType].efficiency_boost && (
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">+Efficiency</p>
                      <p className="text-green-400 font-semibold">+{expansionTypes[selectedExpansionType].efficiency_boost}%</p>
                    </div>
                  )}
                  {expansionTypes[selectedExpansionType].heat_reduction && (
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">-Heat Gen</p>
                      <p className="text-cyan-400 font-semibold">-{expansionTypes[selectedExpansionType].heat_reduction}</p>
                    </div>
                  )}
                </div>

                {selectedExpansionType === 'new_location' && (
                  <Input
                    placeholder="Location Name"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="bg-slate-800 text-white text-xs mb-2"
                  />
                )}

                <Button
                  onClick={() => createExpansionMutation.mutate()}
                  disabled={createExpansionMutation.isPending || (selectedExpansionType === 'new_location' && !locationName)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Start Expansion
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Active Expansions */}
      {selectedBusiness && (constructionExpansions.length > 0 || activeExpansions.length > 0) && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Expansion Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {constructionExpansions.map(expansion => {
              const Icon = expansionTypes[expansion.expansion_type]?.icon || Building2;
              const timeRemaining = new Date(expansion.completion_time) - new Date();
              const canActivate = timeRemaining <= 0;

              return (
                <motion.div
                  key={expansion.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-yellow-900/20 rounded border border-yellow-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-yellow-400" />
                      <span className="text-white text-xs font-semibold">{expansion.location_name}</span>
                    </div>
                    <Badge className="bg-yellow-600">Construction</Badge>
                  </div>

                  {canActivate ? (
                    <Button
                      size="sm"
                      onClick={() => activateExpansionMutation.mutate(expansion)}
                      disabled={activateExpansionMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-xs"
                    >
                      Activate Expansion
                    </Button>
                  ) : (
                    <p className="text-gray-400 text-xs">
                      Completes in {Math.ceil(timeRemaining / (1000 * 60 * 60))} hours
                    </p>
                  )}
                </motion.div>
              );
            })}

            {activeExpansions.map(expansion => {
              const Icon = expansionTypes[expansion.expansion_type]?.icon || Building2;
              return (
                <div key={expansion.id} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-green-400" />
                      <span className="text-white text-xs font-semibold">{expansion.location_name}</span>
                    </div>
                    <Badge className="bg-green-600">Operational</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}