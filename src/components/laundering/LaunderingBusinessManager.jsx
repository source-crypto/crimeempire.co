import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const businessTypes = {
  casino: { label: 'Casino', icon: '🎰', baseCost: 500000, baseCapacity: 50000, baseEfficiency: 75 },
  car_wash: { label: 'Car Wash', icon: '🚗', baseCost: 200000, baseCapacity: 25000, baseEfficiency: 80 },
  restaurant: { label: 'Restaurant', icon: '🍽️', baseCost: 300000, baseCapacity: 30000, baseEfficiency: 85 },
  nightclub: { label: 'Nightclub', icon: '🎵', baseCost: 400000, baseCapacity: 40000, baseEfficiency: 70 },
  real_estate: { label: 'Real Estate', icon: '🏢', baseCost: 1000000, baseCapacity: 100000, baseEfficiency: 90 },
  art_gallery: { label: 'Art Gallery', icon: '🖼️', baseCost: 750000, baseCapacity: 75000, baseEfficiency: 88 },
  crypto_exchange: { label: 'Crypto Exchange', icon: '₿', baseCost: 600000, baseCapacity: 80000, baseEfficiency: 65 }
};

export default function LaunderingBusinessManager({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState('casino');
  const [businessName, setBusinessName] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [launderAmount, setLaunderAmount] = useState('');

  const createBusinessMutation = useMutation({
    mutationFn: async () => {
      const typeInfo = businessTypes[selectedType];
      
      if (playerData.balance < typeInfo.baseCost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.MoneyLaunderingBusiness.create({
        owner_id: playerData.id,
        business_name: businessName,
        business_type: selectedType,
        capacity_per_hour: typeInfo.baseCapacity,
        efficiency: typeInfo.baseEfficiency,
        transaction_fee: 15
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - typeInfo.baseCost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      setShowCreateForm(false);
      setBusinessName('');
      toast.success('Business established!');
    },
    onError: (error) => toast.error(error.message)
  });

  const launderMoneyMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(launderAmount);
      if (!amount || amount <= 0) throw new Error('Invalid amount');
      if (amount > selectedBusiness.capacity_per_hour) throw new Error('Exceeds capacity');

      const fee = amount * (selectedBusiness.transaction_fee / 100);
      const cleanAmount = amount * (selectedBusiness.efficiency / 100) - fee;

      await base44.entities.MoneyLaunderingBusiness.update(selectedBusiness.id, {
        dirty_money_pool: (selectedBusiness.dirty_money_pool || 0) + amount,
        clean_money_generated: (selectedBusiness.clean_money_generated || 0) + cleanAmount,
        suspicion_level: Math.min(100, (selectedBusiness.suspicion_level || 0) + (amount / 10000))
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance + cleanAmount,
        heat: Math.min(100, (playerData.heat || 0) + selectedBusiness.heat_generation)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      setLaunderAmount('');
      toast.success('Money laundered successfully!');
    },
    onError: (error) => toast.error(error.message)
  });

  const upgradeBusinessMutation = useMutation({
    mutationFn: async (business) => {
      const upgradeCost = business.level * 100000;
      if (playerData.balance < upgradeCost) throw new Error('Insufficient funds');

      await base44.entities.MoneyLaunderingBusiness.update(business.id, {
        level: business.level + 1,
        capacity_per_hour: business.capacity_per_hour * 1.3,
        efficiency: Math.min(100, business.efficiency + 2)
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - upgradeCost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      toast.success('Business upgraded!');
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="space-y-4">
      {/* Create Business */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white text-sm">
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-400" />
              Establish New Front
            </span>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-green-600 hover:bg-green-700"
            >
              {showCreateForm ? 'Cancel' : 'New Business'}
            </Button>
          </CardTitle>
        </CardHeader>

        {showCreateForm && (
          <CardContent className="space-y-3">
            <Input
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="bg-slate-800 text-white"
            />

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(businessTypes).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-3 rounded border-2 transition-all ${
                    selectedType === type
                      ? 'border-green-500 bg-green-900/30'
                      : 'border-gray-700 bg-slate-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{info.icon}</div>
                  <div className="text-xs text-white font-semibold">{info.label}</div>
                  <div className="text-[10px] text-gray-400">${(info.baseCost / 1000).toFixed(0)}k</div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-800/50 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Capacity/hour:</span>
                <span className="text-blue-400 font-semibold">${businessTypes[selectedType].baseCapacity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Efficiency:</span>
                <span className="text-green-400 font-semibold">{businessTypes[selectedType].baseEfficiency}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cost:</span>
                <span className="text-yellow-400 font-semibold">${businessTypes[selectedType].baseCost.toLocaleString()}</span>
              </div>
            </div>

            <Button
              onClick={() => createBusinessMutation.mutate()}
              disabled={!businessName || createBusinessMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Establish Business
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Active Businesses */}
      <div className="space-y-3">
        {businesses.map(business => {
          const typeInfo = businessTypes[business.business_type];
          
          return (
            <Card key={business.id} className="glass-panel border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo.icon}</span>
                    {business.business_name}
                  </span>
                  <Badge className="bg-blue-600">Level {business.level}</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Capacity/hr</p>
                    <p className="text-blue-400 font-bold">${(business.capacity_per_hour / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Efficiency</p>
                    <p className="text-green-400 font-bold">{business.efficiency}%</p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded">
                    <p className="text-gray-400">Fee</p>
                    <p className="text-yellow-400 font-bold">{business.transaction_fee}%</p>
                  </div>
                </div>

                {/* Suspicion */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">LE Suspicion</span>
                    <span className={`font-semibold ${
                      business.suspicion_level > 70 ? 'text-red-400' :
                      business.suspicion_level > 40 ? 'text-orange-400' : 'text-green-400'
                    }`}>
                      {Math.round(business.suspicion_level)}%
                    </span>
                  </div>
                  <Progress value={business.suspicion_level} className="h-2" />
                </div>

                {/* Accessories */}
                {business.accessories?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {business.accessories.map((acc, idx) => (
                      <Badge key={idx} className="bg-purple-700 text-[10px]">
                        {acc.accessory_name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Launder Money */}
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount to launder"
                    value={selectedBusiness?.id === business.id ? launderAmount : ''}
                    onChange={(e) => {
                      setSelectedBusiness(business);
                      setLaunderAmount(e.target.value);
                    }}
                    className="bg-slate-800 text-white text-xs"
                  />
                  <Button
                    onClick={() => launderMoneyMutation.mutate()}
                    disabled={!launderAmount || selectedBusiness?.id !== business.id || launderMoneyMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="w-4 h-4" />
                  </Button>
                </div>

                {/* Upgrade */}
                <Button
                  onClick={() => upgradeBusinessMutation.mutate(business)}
                  disabled={upgradeBusinessMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
                >
                  Upgrade to Level {business.level + 1} (${(business.level * 100000).toLocaleString()})
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {businesses.length === 0 && !showCreateForm && (
        <Card className="glass-panel border-gray-500/20 p-8 text-center">
          <p className="text-gray-400 mb-4">No laundering businesses established</p>
          <Button onClick={() => setShowCreateForm(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Business
          </Button>
        </Card>
      )}
    </div>
  );
}