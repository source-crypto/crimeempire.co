import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, TrendingUp, AlertTriangle, DollarSign, RefreshCw, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ITEM_TYPES = {
  drugs:           { icon: '💊', label: 'Drugs',            basePrice: 500  },
  weapons:         { icon: '🔫', label: 'Weapons',          basePrice: 2000 },
  stolen_goods:    { icon: '💎', label: 'Stolen Goods',     basePrice: 1500 },
  hacking_service: { icon: '💻', label: 'Hacking Service',  basePrice: 3000 },
  data_breach:     { icon: '📊', label: 'Data Breach',      basePrice: 2500 },
  forgery:         { icon: '📄', label: 'Forged Documents', basePrice: 1000 },
};

// Static generated listings when DB is empty (always playable)
const STATIC_LISTINGS = [
  { id: 's1', item_name: 'Grade-A Stimulants',       item_type: 'drugs',           current_price: 850,  quantity: 50, quality: 90, heat_level: 55, demand_level: 75, price_multiplier: 1.7 },
  { id: 's2', item_name: 'Synthetic Opioids',         item_type: 'drugs',           current_price: 1200, quantity: 30, quality: 95, heat_level: 80, demand_level: 90, price_multiplier: 2.2 },
  { id: 's3', item_name: 'Suppressed Pistol (x3)',    item_type: 'weapons',         current_price: 7500, quantity: 5,  quality: 85, heat_level: 70, demand_level: 65, price_multiplier: 1.5 },
  { id: 's4', item_name: 'Military Rifle (modified)', item_type: 'weapons',         current_price: 22000,quantity: 2,  quality: 95, heat_level: 90, demand_level: 80, price_multiplier: 2.0 },
  { id: 's5', item_name: 'Stolen Jewelry Haul',       item_type: 'stolen_goods',    current_price: 18000,quantity: 8,  quality: 80, heat_level: 45, demand_level: 70, price_multiplier: 1.6 },
  { id: 's6', item_name: 'Luxury Watch Collection',   item_type: 'stolen_goods',    current_price: 35000,quantity: 3,  quality: 98, heat_level: 50, demand_level: 85, price_multiplier: 1.9 },
  { id: 's7', item_name: 'Zero-Day Exploit Package',  item_type: 'hacking_service', current_price: 15000,quantity: 10, quality: 90, heat_level: 35, demand_level: 95, price_multiplier: 2.5 },
  { id: 's8', item_name: 'Corporate Breach Bundle',   item_type: 'data_breach',     current_price: 9500, quantity: 15, quality: 75, heat_level: 40, demand_level: 80, price_multiplier: 1.8 },
  { id: 's9', item_name: 'EU Passport Set',           item_type: 'forgery',         current_price: 25000,quantity: 4,  quality: 92, heat_level: 65, demand_level: 88, price_multiplier: 2.1 },
  { id: 's10',item_name: 'Counterfeit Currency Block', item_type: 'forgery',        current_price: 6000, quantity: 20, quality: 70, heat_level: 60, demand_level: 72, price_multiplier: 1.4 },
];

export default function BlackMarketUI({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState({});

  const { data: dbListings = [], isLoading } = useQuery({
    queryKey: ['blackMarketListings'],
    queryFn: () => base44.entities.BlackMarketListing.filter({ listing_active: true }),
    enabled: !!playerData?.id,
  });

  const { data: playerInventory = [] } = useQuery({
    queryKey: ['contrabandInventory', playerData?.id],
    queryFn: () => base44.entities.ContrabandInventory.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  // Merge DB listings with static ones (DB ones show as real listings)
  const allListings = dbListings.length > 0 ? dbListings : STATIC_LISTINGS;
  const filtered = selectedCategory === 'all' ? allListings : allListings.filter(l => l.item_type === selectedCategory);

  const getQty = (id) => quantities[id] || 1;

  const buyMutation = useMutation({
    mutationFn: async ({ listing, qty }) => {
      const totalCost = listing.current_price * qty;
      if ((playerData.crypto_balance || 0) < totalCost) throw new Error('Insufficient crypto balance');

      // Update player balance
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - totalCost,
        wanted_level: Math.min(5, (playerData.wanted_level || 0) + (listing.heat_level > 70 ? 1 : 0)),
      });

      // Add to contraband inventory
      const existing = playerInventory.find(i => i.item_name === listing.item_name);
      if (existing) {
        await base44.entities.ContrabandInventory.update(existing.id, {
          quantity: existing.quantity + qty,
          estimated_value: (existing.estimated_value || 0) + totalCost,
        });
      } else {
        await base44.entities.ContrabandInventory.create({
          player_id: playerData.id,
          item_name: listing.item_name,
          item_type: listing.item_type,
          quantity: qty,
          quality: listing.quality,
          storage_location: 'warehouse',
          risk_level: listing.heat_level,
          estimated_value: totalCost,
          acquisition_date: new Date().toISOString(),
        });
      }

      // If real DB listing, reduce quantity
      if (listing.id && !listing.id.startsWith('s')) {
        await base44.entities.BlackMarketListing.update(listing.id, {
          quantity: Math.max(0, listing.quantity - qty),
          listing_active: listing.quantity - qty > 0,
        });
      }

      return { item: listing.item_name, cost: totalCost };
    },
    onSuccess: ({ item, cost }) => {
      queryClient.invalidateQueries(['blackMarketListings']);
      queryClient.invalidateQueries(['contrabandInventory']);
      queryClient.invalidateQueries(['player']);
      toast.success(`✅ Purchased ${item} for $${cost.toLocaleString()}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const generateListingsMutation = useMutation({
    mutationFn: async () => {
      // Seed fresh listings to DB
      const seeds = STATIC_LISTINGS.map(l => ({
        item_name: l.item_name,
        item_type: l.item_type,
        current_price: Math.round(l.current_price * (0.9 + Math.random() * 0.3)),
        quantity: Math.floor(l.quantity * (0.7 + Math.random() * 0.6)),
        quality: l.quality,
        heat_level: l.heat_level,
        demand_level: l.demand_level,
        price_multiplier: l.price_multiplier,
        listing_active: true,
        seller_id: 'dark_web',
      }));
      await Promise.all(seeds.map(s => base44.entities.BlackMarketListing.create(s)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blackMarketListings']);
      toast.success('🌐 Dark web refreshed — new listings available');
    },
    onError: () => toast.error('Failed to refresh market'),
  });

  const totalInventoryValue = playerInventory.reduce((s, i) => s + (i.estimated_value || 0), 0);

  return (
    <div className="space-y-4">
      {/* Wallet banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel border border-cyan-500/20 p-3 rounded-lg">
          <p className="text-xs text-gray-400">Crypto Wallet</p>
          <p className="text-xl font-bold text-cyan-400">${(playerData?.crypto_balance || 0).toLocaleString()}</p>
        </div>
        <div className="glass-panel border border-purple-500/20 p-3 rounded-lg">
          <p className="text-xs text-gray-400">Inventory Value</p>
          <p className="text-xl font-bold text-purple-400">${totalInventoryValue.toLocaleString()}</p>
        </div>
        <div className="glass-panel border border-red-500/20 p-3 rounded-lg">
          <p className="text-xs text-gray-400">Items Owned</p>
          <p className="text-xl font-bold text-red-400">{playerInventory.length}</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${selectedCategory === 'all' ? 'border-red-500/60 bg-red-900/30 text-red-300' : 'border-gray-700 text-gray-400 hover:text-white'}`}
          >
            All
          </button>
          {Object.entries(ITEM_TYPES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${selectedCategory === key ? 'border-red-500/60 bg-red-900/30 text-red-300' : 'border-gray-700 text-gray-400 hover:text-white'}`}
            >
              {val.icon} {val.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-600 text-gray-400 text-xs"
          onClick={() => generateListingsMutation.mutate()}
          disabled={generateListingsMutation.isPending}
        >
          {generateListingsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span className="ml-1">Refresh Market</span>
        </Button>
      </div>

      {/* Listings */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader className="border-b border-red-500/20">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-red-400" />
            Dark Web Listings ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-red-400 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No listings in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((listing) => {
                const qty = getQty(listing.id);
                const totalCost = listing.current_price * qty;
                const canAfford = (playerData?.crypto_balance || 0) >= totalCost;
                return (
                  <div key={listing.id} className="p-4 rounded-lg bg-slate-900/60 border border-red-500/20 hover:border-red-500/40 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">{ITEM_TYPES[listing.item_type]?.icon} {ITEM_TYPES[listing.item_type]?.label}</p>
                        <h4 className="text-white font-semibold text-sm">{listing.item_name}</h4>
                        <p className="text-xs text-gray-400">Qty available: {listing.quantity} • Quality: {listing.quality}%</p>
                      </div>
                      {listing.heat_level > 70 && (
                        <Badge className="bg-red-700 text-xs shrink-0">
                          <AlertTriangle className="w-3 h-3 mr-1" />Hot
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs mb-3">
                      <div className="p-1.5 rounded bg-slate-800/60 text-center">
                        <p className="text-gray-500">Price/u</p>
                        <p className="text-cyan-400 font-bold">${listing.current_price.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 rounded bg-slate-800/60 text-center">
                        <p className="text-gray-500">Demand</p>
                        <p className={`font-bold ${listing.demand_level > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{listing.demand_level}%</p>
                      </div>
                      <div className="p-1.5 rounded bg-slate-800/60 text-center">
                        <p className="text-gray-500">Heat</p>
                        <p className={`font-bold ${listing.heat_level > 60 ? 'text-red-400' : 'text-yellow-400'}`}>{listing.heat_level}%</p>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="number" min={1} max={listing.quantity} value={qty}
                        onChange={e => setQuantities(q => ({ ...q, [listing.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-16 px-2 py-1 bg-slate-800 text-white rounded text-xs border border-gray-600"
                      />
                      <Button
                        size="sm"
                        className={`flex-1 text-xs h-8 ${canAfford ? 'bg-red-700 hover:bg-red-600' : 'bg-gray-700 cursor-not-allowed'}`}
                        disabled={!canAfford || buyMutation.isPending}
                        onClick={() => buyMutation.mutate({ listing, qty })}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        {canAfford ? `Buy $${totalCost.toLocaleString()}` : 'Insufficient Funds'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Inventory */}
      {playerInventory.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              Your Contraband Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {playerInventory.map(item => (
                <div key={item.id} className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">{item.item_name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity} • Quality: {item.quality}%</p>
                  </div>
                  <p className="text-green-400 font-bold text-sm">${(item.estimated_value || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}