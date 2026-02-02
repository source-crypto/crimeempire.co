import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, Package, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function AccessoryMarketplace({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [sellPrice, setSellPrice] = useState('');
  const [selectedAccessory, setSelectedAccessory] = useState(null);

  const { data: trades = [] } = useQuery({
    queryKey: ['accessoryTrades'],
    queryFn: () => base44.entities.AccessoryTrade.filter({ status: 'listed' })
  });

  const listAccessoryMutation = useMutation({
    mutationFn: async ({ business, accessoryData }) => {
      const price = parseFloat(sellPrice);
      if (!price || price <= 0) throw new Error('Invalid price');

      // Remove accessory from business
      const updatedAccessories = business.accessories.filter(a => a.accessory_name !== accessoryData.accessory_name);
      await base44.entities.MoneyLaunderingBusiness.update(business.id, {
        accessories: updatedAccessories
      });

      await base44.entities.AccessoryTrade.create({
        seller_id: playerData.id,
        accessory_name: accessoryData.accessory_name,
        accessory_type: accessoryData.bonus_type,
        tier: 2,
        price: price,
        condition: Math.floor(Math.random() * 30) + 70,
        bonus_value: accessoryData.bonus_value
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accessoryTrades']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      setSellPrice('');
      setSelectedAccessory(null);
      toast.success('Accessory listed for sale!');
    },
    onError: (error) => toast.error(error.message)
  });

  const buyAccessoryMutation = useMutation({
    mutationFn: async ({ trade, business }) => {
      if (playerData.balance < trade.price) throw new Error('Insufficient funds');

      // Add accessory to business
      const updatedAccessories = [...(business.accessories || []), {
        accessory_name: trade.accessory_name,
        bonus_type: trade.accessory_type,
        bonus_value: trade.bonus_value * (trade.condition / 100) // Degraded by condition
      }];

      await base44.entities.MoneyLaunderingBusiness.update(business.id, {
        accessories: updatedAccessories
      });

      await base44.entities.AccessoryTrade.update(trade.id, {
        status: 'sold',
        buyer_id: playerData.id
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - trade.price
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accessoryTrades']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      toast.success('Accessory purchased!');
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-panel border-orange-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <ShoppingCart className="w-4 h-4 text-orange-400" />
            Accessory Trading
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          Buy and sell used accessories between players. Condition affects performance.
        </CardContent>
      </Card>

      {/* Sell Accessories */}
      {businesses.some(b => b.accessories?.length > 0) && (
        <Card className="glass-panel border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Sell Your Accessories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {businesses.map(business => 
              business.accessories?.map(acc => (
                <div key={`${business.id}-${acc.accessory_name}`} className="p-2 bg-slate-900/50 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs">
                      <p className="text-white">{acc.accessory_name}</p>
                      <p className="text-gray-400 text-[10px]">From: {business.business_name}</p>
                    </div>
                    <Badge className="bg-blue-600 text-[10px]">+{acc.bonus_value}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={selectedAccessory?.name === acc.accessory_name ? sellPrice : ''}
                      onChange={(e) => {
                        setSelectedAccessory({ name: acc.accessory_name, business });
                        setSellPrice(e.target.value);
                      }}
                      className="bg-slate-800 text-white text-xs"
                    />
                    <Button
                      onClick={() => listAccessoryMutation.mutate({ business, accessoryData: acc })}
                      disabled={!sellPrice || selectedAccessory?.name !== acc.accessory_name || listAccessoryMutation.isPending}
                      className="bg-yellow-600 hover:bg-yellow-700 text-xs"
                    >
                      List
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Trades */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Marketplace Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trades.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">No accessories for sale</p>
            ) : (
              trades.map(trade => {
                const isOwnTrade = trade.seller_id === playerData.id;

                return (
                  <div key={trade.id} className="p-3 bg-slate-900/50 rounded border border-green-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs">
                        <p className="text-white font-semibold">{trade.accessory_name}</p>
                        <p className="text-gray-400 text-[10px] capitalize">{trade.accessory_type.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-purple-600 text-[10px]">Tier {trade.tier}</Badge>
                        {isOwnTrade && <Badge className="bg-blue-600 text-[10px]">Your Listing</Badge>}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400 text-[10px]">Price</p>
                        <p className="text-yellow-400 font-semibold">${(trade.price / 1000).toFixed(0)}k</p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400 text-[10px]">Condition</p>
                        <p className={`font-semibold ${trade.condition > 80 ? 'text-green-400' : trade.condition > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {trade.condition}%
                        </p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400 text-[10px]">Bonus</p>
                        <p className="text-cyan-400 font-semibold">+{trade.bonus_value}</p>
                      </div>
                    </div>

                    {!isOwnTrade && businesses.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {businesses.slice(0, 2).map(business => (
                          <Button
                            key={business.id}
                            onClick={() => buyAccessoryMutation.mutate({ trade, business })}
                            disabled={buyAccessoryMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-[10px]"
                          >
                            Install on {business.business_name.substring(0, 10)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}