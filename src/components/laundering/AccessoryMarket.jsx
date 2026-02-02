import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Wrench, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AccessoryMarket({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [showSellForm, setShowSellForm] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [condition, setCondition] = useState('100');

  const { data: trades = [] } = useQuery({
    queryKey: ['accessoryTrades'],
    queryFn: () => base44.entities.AccessoryTrade.filter({ status: 'active' })
  });

  const { data: accessories = [] } = useQuery({
    queryKey: ['launderingAccessories'],
    queryFn: () => base44.entities.LaunderingAccessory.filter({ is_available: true })
  });

  const createTradeMutation = useMutation({
    mutationFn: async () => {
      const price = parseFloat(sellPrice);
      const cond = parseFloat(condition);

      if (!selectedAccessory || !price || !cond) throw new Error('Invalid values');

      await base44.entities.AccessoryTrade.create({
        seller_id: playerData.id,
        accessory_id: selectedAccessory.id,
        accessory_name: selectedAccessory.accessory_name,
        price,
        condition: cond,
        durability_remaining: cond,
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accessoryTrades']);
      setShowSellForm(false);
      setSellPrice('');
      setCondition('100');
      toast.success('Accessory listed for sale!');
    },
    onError: (error) => toast.error(error.message)
  });

  const buyAccessoryMutation = useMutation({
    mutationFn: async ({ trade, business }) => {
      if (playerData.balance < trade.price) throw new Error('Insufficient funds');

      const accessory = accessories.find(a => a.id === trade.accessory_id);
      if (!accessory) throw new Error('Accessory not found');

      // Apply accessory to business with reduced effectiveness based on condition
      const effectiveBonus = accessory.bonus_value * (trade.condition / 100);

      const currentAccessories = business.accessories || [];
      let updates = {
        accessories: [...currentAccessories, {
          accessory_name: accessory.accessory_name,
          bonus_type: accessory.accessory_type,
          bonus_value: effectiveBonus,
          durability: trade.durability_remaining
        }]
      };

      if (accessory.accessory_type === 'efficiency_boost') {
        updates.efficiency = Math.min(100, business.efficiency + effectiveBonus);
      } else if (accessory.accessory_type === 'capacity_increase') {
        updates.capacity_per_hour = business.capacity_per_hour + effectiveBonus;
      } else if (accessory.accessory_type === 'heat_reduction') {
        updates.heat_generation = Math.max(0, business.heat_generation - effectiveBonus);
      }

      await base44.entities.MoneyLaunderingBusiness.update(business.id, updates);

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - trade.price
      });

      await base44.entities.AccessoryTrade.update(trade.id, {
        status: 'sold'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accessoryTrades']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      toast.success('Accessory purchased and installed!');
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="space-y-4">
      {/* Sell Accessory */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white text-sm">
            <span>Sell Accessory</span>
            <Button
              size="sm"
              onClick={() => setShowSellForm(!showSellForm)}
              className="bg-green-600 hover:bg-green-700"
            >
              {showSellForm ? 'Cancel' : 'List Item'}
            </Button>
          </CardTitle>
        </CardHeader>

        {showSellForm && (
          <CardContent className="space-y-3">
            <select
              onChange={(e) => setSelectedAccessory(accessories.find(a => a.id === e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded text-xs"
            >
              <option value="">Select Accessory</option>
              {accessories.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.accessory_name}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Price ($)"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="bg-slate-800 text-white text-xs"
              />
              <Input
                type="number"
                placeholder="Condition %"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                max="100"
                className="bg-slate-800 text-white text-xs"
              />
            </div>

            <Button
              onClick={() => createTradeMutation.mutate()}
              disabled={createTradeMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              List Accessory
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Market Listings */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <ShoppingCart className="w-4 h-4 text-purple-400" />
            Player Accessory Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trades.length === 0 ? (
              <p className="text-gray-400 text-xs">No accessories for sale</p>
            ) : (
              trades.map(trade => {
                const isOwnTrade = trade.seller_id === playerData.id;

                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-slate-900/50 rounded border border-purple-500/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white text-xs font-semibold">{trade.accessory_name}</p>
                        {isOwnTrade && (
                          <Badge className="bg-blue-600 text-[10px] mt-1">Your Listing</Badge>
                        )}
                      </div>
                      <Badge className={trade.condition > 80 ? 'bg-green-600' : trade.condition > 50 ? 'bg-yellow-600' : 'bg-red-600'}>
                        {trade.condition}% Condition
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Price</p>
                        <p className="text-green-400 font-semibold">${trade.price.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Durability</p>
                        <p className="text-blue-400 font-semibold">{trade.durability_remaining}%</p>
                      </div>
                    </div>

                    {!isOwnTrade && businesses.length > 0 && (
                      <select
                        className="w-full px-2 py-1.5 bg-slate-800 text-white rounded text-xs"
                        onChange={(e) => {
                          const business = businesses.find(b => b.id === e.target.value);
                          if (business) {
                            buyAccessoryMutation.mutate({ trade, business });
                          }
                        }}
                      >
                        <option value="">Select Business & Buy</option>
                        {businesses.map(b => (
                          <option key={b.id} value={b.id}>{b.business_name}</option>
                        ))}
                      </select>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}