import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const itemTypes = {
  drugs: { icon: '💊', label: 'Drugs', basePrice: 500 },
  weapons: { icon: '🔫', label: 'Weapons', basePrice: 2000 },
  stolen_goods: { icon: '💎', label: 'Stolen Goods', basePrice: 1500 },
  hacking_service: { icon: '💻', label: 'Hacking Service', basePrice: 3000 },
  data_breach: { icon: '📊', label: 'Data Breach', basePrice: 2500 },
  forgery: { icon: '📄', label: 'Forged Documents', basePrice: 1000 }
};

export default function BlackMarketUI({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('drugs');
  const [quantity, setQuantity] = useState(1);

  const { data: marketListings = [] } = useQuery({
    queryKey: ['blackMarketListings', selectedCategory],
    queryFn: () => base44.entities.BlackMarketListing.filter({
      item_type: selectedCategory,
      listing_active: true
    }),
    enabled: !!playerData?.id
  });

  const { data: playerInventory = [] } = useQuery({
    queryKey: ['contrabandInventory', playerData?.id],
    queryFn: () => base44.entities.ContrabandInventory.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: marketTrends = {} } = useQuery({
    queryKey: ['marketTrends', selectedCategory],
    queryFn: async () => {
      const trends = await base44.entities.MarketTrendData.filter({ item_type: selectedCategory });
      return trends[0] || {};
    }
  });

  const buyItemMutation = useMutation({
    mutationFn: async (listing) => {
      const totalCost = listing.current_price * quantity;

      if (playerData.crypto_balance < totalCost) {
        throw new Error('Insufficient funds');
      }

      // Create inventory or update existing
      const existing = playerInventory.find(i => i.item_name === listing.item_name);
      if (existing) {
        await base44.entities.ContrabandInventory.update(existing.id, {
          quantity: existing.quantity + quantity
        });
      } else {
        await base44.entities.ContrabandInventory.create({
          player_id: playerData.id,
          item_name: listing.item_name,
          item_type: listing.item_type,
          quantity: quantity,
          quality: listing.quality,
          storage_location: 'unknown',
          risk_level: listing.heat_level,
          estimated_value: totalCost,
          acquisition_date: new Date().toISOString()
        });
      }

      // Update listing
      await base44.entities.BlackMarketListing.update(listing.id, {
        quantity: listing.quantity - quantity
      });

      // Deduct from player
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - totalCost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blackMarketListings']);
      queryClient.invalidateQueries(['contrabandInventory']);
      queryClient.invalidateQueries(['player']);
      toast.success('Purchase successful!');
      setQuantity(1);
    },
    onError: (error) => toast.error(error.message)
  });

  const itemIcon = itemTypes[selectedCategory]?.icon || '?';
  const totalInventoryValue = playerInventory.reduce((sum, item) => sum + (item.estimated_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Black Market Header */}
      <Card className="glass-panel border-red-500/30 bg-gradient-to-r from-slate-900/50 via-red-900/20 to-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShoppingCart className="w-5 h-5 text-red-400" />
            Dark Web Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Wallet</p>
              <p className="text-lg font-bold text-green-400">${playerData?.crypto_balance.toLocaleString() || 0}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Inventory Value</p>
              <p className="text-lg font-bold text-cyan-400">${totalInventoryValue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Items Owned</p>
              <p className="text-lg font-bold text-purple-400">{playerInventory.length}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-gray-400">Market Status</p>
              <p className={`text-lg font-bold ${marketTrends?.price_trend === 'rising' ? 'text-red-400' : 'text-green-400'}`}>
                {marketTrends?.price_trend === 'rising' ? '📈 Rising' : '📉 Stable'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Product Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(itemTypes).map(([key, item]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(key)}
                className={`text-sm h-10 ${
                  selectedCategory === key ? 'bg-cyan-600' : ''
                }`}
              >
                {item.icon} {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Trends */}
      {marketTrends && (
        <Card className="glass-panel border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              Market Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Average Price:</span>
              <span className="text-cyan-400 font-semibold">${marketTrends.current_price?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Demand:</span>
              <span className="text-green-400 font-semibold">{marketTrends.demand_level || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Supply:</span>
              <span className="text-blue-400 font-semibold">{marketTrends.supply_level || 0}%</span>
            </div>
            {marketTrends.trend_summary && (
              <p className="text-xs text-gray-400 mt-2 italic">{marketTrends.trend_summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Listings */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <DollarSign className="w-4 h-4 text-green-400" />
            Available on Black Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          {marketListings.length === 0 ? (
            <p className="text-gray-400 text-sm">No listings available. Check back later.</p>
          ) : (
            <div className="space-y-3">
              {marketListings.map((listing) => (
                <div key={listing.id} className="p-3 bg-slate-900/50 rounded-lg border border-green-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-semibold text-sm">{listing.item_name}</h4>
                      <p className="text-xs text-gray-400">Quantity: {listing.quantity} | Quality: {listing.quality}%</p>
                    </div>
                    {listing.heat_level > 70 && (
                      <Badge className="bg-red-600 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Hot
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                    <div className="p-2 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Price</p>
                      <p className="text-cyan-400 font-semibold">${listing.current_price.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Demand</p>
                      <p className="text-green-400 font-semibold">{listing.demand_level}%</p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Heat</p>
                      <p className={`font-semibold ${listing.heat_level > 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {listing.heat_level}%
                      </p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Multiplier</p>
                      <p className="text-purple-400 font-semibold">{listing.price_multiplier.toFixed(2)}x</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max={listing.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="flex-1 px-2 py-1 bg-slate-800 text-white rounded text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => buyItemMutation.mutate(listing)}
                      disabled={playerData?.crypto_balance < (listing.current_price * quantity) || buyItemMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                    >
                      Buy ${(listing.current_price * quantity).toLocaleString()}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Inventory */}
      {playerInventory.length > 0 && (
        <Card className="glass-panel border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              📦 Your Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playerInventory.map((item) => (
                <div key={item.id} className="p-2 bg-slate-900/50 rounded flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-white font-semibold">{item.item_name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity} | Quality: {item.quality}%</p>
                  </div>
                  <p className="text-green-400 font-semibold text-sm">${item.estimated_value?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}