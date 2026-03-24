import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Zap } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  {
    id: 'weapons', label: 'Weapons', emoji: '🔫', color: 'border-red-500/30 bg-red-900/10',
    items: [
      { name: 'Suppressed Pistol', price: 8500, rarity: 'rare', buff: '+5% combat success' },
      { name: 'AK-47 Mk II', price: 22000, rarity: 'epic', buff: '+12% combat success' },
      { name: 'Tactical Shotgun', price: 14000, rarity: 'uncommon', buff: '+8% combat success' },
      { name: 'Sniper Rifle', price: 35000, rarity: 'legendary', buff: '+20% combat range' },
    ]
  },
  {
    id: 'contraband', label: 'Contraband', emoji: '📦', color: 'border-orange-500/30 bg-orange-900/10',
    items: [
      { name: 'Grade A Narcotics', price: 12000, rarity: 'rare', buff: '+15% enterprise revenue' },
      { name: 'Stolen Electronics', price: 6500, rarity: 'common', buff: '+5% hacking bonus' },
      { name: 'Counterfeit Cash', price: 18000, rarity: 'epic', buff: '+10% laundering rate' },
      { name: 'Black Market Docs', price: 9000, rarity: 'uncommon', buff: '+8% negotiation' },
    ]
  },
  {
    id: 'vehicles', label: 'Stolen Vehicles', emoji: '🚗', color: 'border-cyan-500/30 bg-cyan-900/10',
    items: [
      { name: 'Modified Sports Car', price: 45000, rarity: 'epic', buff: '+20% escape chance' },
      { name: 'Armored SUV', price: 80000, rarity: 'legendary', buff: '+30% defense on raid' },
      { name: 'Unmarked Van', price: 25000, rarity: 'uncommon', buff: '+15% smuggling capacity' },
      { name: 'Police Interceptor', price: 55000, rarity: 'rare', buff: 'Reduce wanted level 1 star' },
    ]
  },
  {
    id: 'equipment', label: 'Equipment', emoji: '🛠️', color: 'border-purple-500/30 bg-purple-900/10',
    items: [
      { name: 'Hacking Kit Pro', price: 15000, rarity: 'rare', buff: '+10% hacking skill' },
      { name: 'Night Vision Goggles', price: 11000, rarity: 'uncommon', buff: '+10% stealth missions' },
      { name: 'Safecracker Set', price: 28000, rarity: 'epic', buff: '+20% heist payout' },
      { name: 'Encrypted Comms', price: 9500, rarity: 'uncommon', buff: '-20% police detection' },
    ]
  },
  {
    id: 'intel', label: 'Intelligence', emoji: '🕵️', color: 'border-blue-500/30 bg-blue-900/10',
    items: [
      { name: 'Police Scanner', price: 7000, rarity: 'common', buff: 'See LE raid timing' },
      { name: 'Rival Crew Dossier', price: 12000, rarity: 'rare', buff: '+15% PvP advantage' },
      { name: 'Safe House Location', price: 20000, rarity: 'epic', buff: 'Hidden base slot' },
      { name: 'Insider Contact', price: 30000, rarity: 'legendary', buff: '+25% mission payouts' },
    ]
  },
  {
    id: 'substances', label: 'Substances', emoji: '💊', color: 'border-green-500/30 bg-green-900/10',
    items: [
      { name: 'Combat Stims', price: 4000, rarity: 'common', buff: '+10% strength for 1 battle' },
      { name: 'Focus Enhancer', price: 6500, rarity: 'uncommon', buff: '+15% hacking for 1 session' },
      { name: 'Adrenaline Shot', price: 3500, rarity: 'common', buff: '+20% speed for 1 heist' },
      { name: 'Premium Batch', price: 50000, rarity: 'legendary', buff: '+30% enterprise production' },
    ]
  }
];

const rarityColors = {
  common: 'bg-gray-600',
  uncommon: 'bg-green-700',
  rare: 'bg-blue-700',
  epic: 'bg-purple-700',
  legendary: 'bg-yellow-600 text-black'
};

export default function MarketCategories({ playerData }) {
  const [activeCategory, setActiveCategory] = useState('weapons');
  const queryClient = useQueryClient();

  const buyMutation = useMutation({
    mutationFn: async (item) => {
      if ((playerData?.crypto_balance || 0) < item.price) {
        throw new Error('Insufficient crypto balance');
      }
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - item.price
      });
      await base44.entities.Item.create({
        name: item.name,
        owner_id: playerData.id,
        item_type: activeCategory,
        rarity: item.rarity,
        value: item.price,
        description: item.buff,
        is_equipped: false,
        quantity: 1
      });
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries(['player']);
      toast.success(`Purchased ${item.name}! ${item.buff}`);
    },
    onError: (err) => toast.error(err.message)
  });

  const category = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeCategory === cat.id
                ? 'border-red-500/60 bg-red-900/30 text-red-300'
                : 'border-gray-600/30 bg-slate-900/40 text-gray-400 hover:text-white hover:border-gray-500/50'
            }`}
          >
            <span>{cat.emoji}</span>
            <span className="hidden sm:inline">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {category && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {category.items.map((item, idx) => {
            const canAfford = (playerData?.crypto_balance || 0) >= item.price;
            return (
              <div key={idx} className={`p-4 rounded-xl border ${category.color} transition-all hover:scale-[1.01]`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold text-sm">{item.name}</h4>
                      <Badge className={`text-xs ${rarityColors[item.rarity]}`}>{item.rarity}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      {item.buff}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-yellow-400 font-bold">${item.price.toLocaleString()}</span>
                  <Button
                    size="sm"
                    className={`text-xs h-7 ${canAfford ? 'bg-red-700 hover:bg-red-600' : 'bg-gray-700 cursor-not-allowed'}`}
                    onClick={() => canAfford && buyMutation.mutate(item)}
                    disabled={!canAfford || buyMutation.isPending || !playerData}
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    {canAfford ? 'Buy' : 'Can\'t Afford'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Balance: <span className="text-yellow-400 font-semibold">${(playerData?.crypto_balance || 0).toLocaleString()}</span>
      </p>
    </div>
  );
}