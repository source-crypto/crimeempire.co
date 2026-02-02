import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Zap, Shield, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const accessoryTypes = {
  efficiency_boost: { icon: '⚡', color: 'bg-yellow-600' },
  capacity_increase: { icon: '📈', color: 'bg-blue-600' },
  heat_reduction: { icon: '❄️', color: 'bg-cyan-600' },
  automation: { icon: '🤖', color: 'bg-purple-600' },
  security: { icon: '🔒', color: 'bg-green-600' }
};

export default function AccessoryShop({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  const { data: accessories = [] } = useQuery({
    queryKey: ['launderingAccessories'],
    queryFn: () => base44.entities.LaunderingAccessory.filter({ is_available: true })
  });

  const purchaseAccessoryMutation = useMutation({
    mutationFn: async ({ accessory, business }) => {
      if (playerData.balance < accessory.cost) throw new Error('Insufficient funds');

      // Check compatibility
      if (accessory.compatible_business_types?.length > 0 && 
          !accessory.compatible_business_types.includes(business.business_type)) {
        throw new Error('Incompatible with this business type');
      }

      const currentAccessories = business.accessories || [];
      
      // Apply bonus with full durability
      let updates = {
        accessories: [...currentAccessories, {
          accessory_name: accessory.accessory_name,
          bonus_type: accessory.accessory_type,
          bonus_value: accessory.bonus_value,
          durability: 100
        }]
      };

      if (accessory.accessory_type === 'efficiency_boost') {
        updates.efficiency = Math.min(100, business.efficiency + accessory.bonus_value);
      } else if (accessory.accessory_type === 'capacity_increase') {
        updates.capacity_per_hour = business.capacity_per_hour + accessory.bonus_value;
      } else if (accessory.accessory_type === 'heat_reduction') {
        updates.heat_generation = Math.max(0, business.heat_generation - accessory.bonus_value);
      }

      await base44.entities.MoneyLaunderingBusiness.update(business.id, updates);

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - accessory.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      toast.success('Accessory installed!');
    },
    onError: (error) => toast.error(error.message)
  });

  // Create default accessories if none exist
  const initAccessoriesMutation = useMutation({
    mutationFn: async () => {
      const defaultAccessories = [
        { accessory_name: 'Automated Teller System', accessory_type: 'automation', tier: 1, cost: 50000, bonus_value: 10, description: 'Automate cash handling' },
        { accessory_name: 'Advanced Accounting Software', accessory_type: 'efficiency_boost', tier: 2, cost: 75000, bonus_value: 5, description: '+5% efficiency' },
        { accessory_name: 'Shell Company Network', accessory_type: 'heat_reduction', tier: 2, cost: 100000, bonus_value: 2, description: 'Reduce heat by 2 per transaction' },
        { accessory_name: 'Offshore Account Access', accessory_type: 'capacity_increase', tier: 3, cost: 150000, bonus_value: 25000, description: '+25k capacity/hour' },
        { accessory_name: 'Encrypted Ledgers', accessory_type: 'security', tier: 1, cost: 60000, bonus_value: 15, description: 'Reduce LE suspicion buildup' },
        { accessory_name: 'High-Frequency Trading Bots', accessory_type: 'efficiency_boost', tier: 3, cost: 200000, bonus_value: 8, description: '+8% efficiency', compatible_business_types: ['crypto_exchange'] },
        { accessory_name: 'VIP Lounge', accessory_type: 'capacity_increase', tier: 2, cost: 120000, bonus_value: 30000, description: '+30k capacity/hour', compatible_business_types: ['casino', 'nightclub'] },
        { accessory_name: 'AI Money Tracer Jammer', accessory_type: 'security', tier: 4, cost: 250000, bonus_value: 20, description: 'Block AI tracking systems' },
        { accessory_name: 'Network Obfuscator', accessory_type: 'heat_reduction', tier: 3, cost: 180000, bonus_value: 4, description: 'Hide digital footprints' },
        { accessory_name: 'Quantum Encryption Module', accessory_type: 'security', tier: 5, cost: 500000, bonus_value: 30, description: 'Military-grade encryption', compatible_business_types: ['crypto_exchange'] },
        { accessory_name: 'Ghost Transaction Protocol', accessory_type: 'heat_reduction', tier: 4, cost: 300000, bonus_value: 6, description: 'Untraceable transactions' }
      ];

      for (const acc of defaultAccessories) {
        await base44.entities.LaunderingAccessory.create(acc);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingAccessories']);
      toast.success('Accessories initialized!');
    }
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white text-sm">
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              Laundering Accessories
            </span>
            {accessories.length === 0 && (
              <Button
                size="sm"
                onClick={() => initAccessoriesMutation.mutate()}
                disabled={initAccessoriesMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Stock Shop
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          Upgrade your laundering operations with specialized equipment and services
        </CardContent>
      </Card>

      {/* Select Business */}
      {businesses.length > 0 && (
        <Card className="glass-panel border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Select Business to Upgrade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {businesses.map(business => (
                <button
                  key={business.id}
                  onClick={() => setSelectedBusiness(business)}
                  className={`p-2 rounded border-2 transition-all text-xs ${
                    selectedBusiness?.id === business.id
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-700 bg-slate-800/50 hover:border-gray-600'
                  }`}
                >
                  <p className="text-white font-semibold">{business.business_name}</p>
                  <p className="text-gray-400 text-[10px]">{business.accessories?.length || 0} accessories</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accessories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {accessories.map(accessory => {
          const typeInfo = accessoryTypes[accessory.accessory_type];
          const isCompatible = !accessory.compatible_business_types?.length ||
            accessory.compatible_business_types.includes(selectedBusiness?.business_type);

          return (
            <Card key={accessory.id} className={`glass-panel ${isCompatible ? 'border-green-500/20' : 'border-gray-700/20 opacity-60'}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo.icon}</span>
                    {accessory.accessory_name}
                  </span>
                  <Badge className={typeInfo.color}>
                    Tier {accessory.tier}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="text-xs text-gray-400">{accessory.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-1.5 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Cost</p>
                    <p className="text-yellow-400 font-semibold">${accessory.cost.toLocaleString()}</p>
                  </div>
                  <div className="p-1.5 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Bonus</p>
                    <p className="text-green-400 font-semibold">
                      {accessory.accessory_type === 'capacity_increase' ? `+$${(accessory.bonus_value / 1000).toFixed(0)}k` : `+${accessory.bonus_value}`}
                    </p>
                  </div>
                </div>

                {accessory.compatible_business_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {accessory.compatible_business_types.map(type => (
                      <Badge key={type} className="bg-slate-700 text-[10px] capitalize">
                        {type.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => purchaseAccessoryMutation.mutate({ accessory, business: selectedBusiness })}
                  disabled={!selectedBusiness || !isCompatible || purchaseAccessoryMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-xs"
                >
                  Install Accessory
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}