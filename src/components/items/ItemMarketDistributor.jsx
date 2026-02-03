import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, TrendingUp, DollarSign, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function ItemMarketDistributor({ playerData, items = [] }) {
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const queryClient = useQueryClient();

  const createMarketListingMutation = useMutation({
    mutationFn: async ({ itemId, quantity, price }) => {
      const item = items.find(i => i.id === itemId);
      if (!item || item.quantity < quantity) {
        throw new Error('Insufficient quantity');
      }

      // Update item quantity
      await base44.entities.Item.update(itemId, {
        quantity: item.quantity - quantity
      });

      // Create market listing
      await base44.entities.BlackMarketListing.create({
        seller_id: playerData.id,
        item_name: item.name,
        item_type: item.item_type,
        quantity: quantity,
        price_per_unit: price,
        total_price: price * quantity,
        rarity: item.rarity,
        status: 'active',
        metadata: {
          item_id: itemId,
          original_item_data: item
        }
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allItems'] });
      toast.success('Item listed on Black Market');
      setSelectedItem('');
      setQuantity(1);
      setPricePerUnit(0);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create listing');
    }
  });

  const selectedItemData = items.find(i => i.id === selectedItem);
  const totalPrice = pricePerUnit * quantity;
  const canList = selectedItem && quantity > 0 && pricePerUnit > 0 && 
                  selectedItemData?.quantity >= quantity;

  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-cyan-400" />
          List on Black Market
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-gray-300">Select Item to Sell</Label>
            <Select value={selectedItem} onValueChange={(val) => {
              setSelectedItem(val);
              const item = items.find(i => i.id === val);
              if (item) setPricePerUnit(item.current_market_value);
            }}>
              <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                <SelectValue placeholder="Choose item to sell" />
              </SelectTrigger>
              <SelectContent>
                {items.filter(i => i.quantity > 0 && i.is_tradeable).map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.quantity} available) - ${item.current_market_value} each
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              max={selectedItemData?.quantity || 1}
              className="bg-slate-900/50 border-purple-500/20 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Price Per Unit</Label>
            <Input
              type="number"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(parseInt(e.target.value) || 0)}
              min="1"
              className="bg-slate-900/50 border-purple-500/20 text-white"
            />
          </div>
        </div>

        {selectedItemData && (
          <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-400">Base Value</p>
                <p className="text-white">${selectedItemData.current_market_value}</p>
              </div>
              <div>
                <p className="text-gray-400">Your Price</p>
                <p className="text-cyan-400 font-semibold">${pricePerUnit}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Sale Value</p>
                <p className="text-green-400 font-bold text-lg">${totalPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Profit Margin</p>
                <p className={`font-semibold ${
                  pricePerUnit > selectedItemData.current_market_value ? 'text-green-400' : 
                  pricePerUnit < selectedItemData.current_market_value ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {pricePerUnit > 0 ? 
                    ((pricePerUnit - selectedItemData.current_market_value) / selectedItemData.current_market_value * 100).toFixed(1) 
                    : '0'}%
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => createMarketListingMutation.mutate({ 
            itemId: selectedItem, 
            quantity, 
            price: pricePerUnit 
          })}
          disabled={!canList || createMarketListingMutation.isPending}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
        >
          {createMarketListingMutation.isPending ? 'Listing...' : `List on Market for $${totalPrice.toLocaleString()}`}
        </Button>
      </CardContent>
    </Card>
  );
}