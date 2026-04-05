import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { sounds } from '@/utils/sounds';

const FLASH_ITEMS = [
  { id: 'armor_vest', name: 'Military Armor', icon: '🛡️', originalPrice: 12000, category: 'equipment', description: '+35 combat defense' },
  { id: 'hacking_kit', name: 'Hacking Kit', icon: '💻', originalPrice: 8000, category: 'equipment', description: '+3 hacking skill' },
  { id: 'burner_phone', name: 'Burner Phone Network', icon: '📱', originalPrice: 5000, category: 'utility', description: '-20% heat for 24h' },
  { id: 'fake_id', name: 'Fake Identity Pack', icon: '🪪', originalPrice: 15000, category: 'utility', description: 'Clear 1 wanted star' },
  { id: 'rpg', name: 'RPG Cache', icon: '🚀', originalPrice: 25000, category: 'weapon', description: '+50 power on next raid' },
  { id: 'drone', name: 'Surveillance Drone', icon: '🛸', originalPrice: 18000, category: 'intel', description: 'Reveal enemy safehouse' },
];

function getFlashSale(seed) {
  const idx = seed % FLASH_ITEMS.length;
  const item = FLASH_ITEMS[idx];
  const discount = [0.3, 0.4, 0.5, 0.6][seed % 4];
  return { ...item, discount, salePrice: Math.floor(item.originalPrice * (1 - discount)) };
}

function useCountdown(targetMs) {
  const [remaining, setRemaining] = useState(Math.max(0, targetMs - Date.now()));
  useEffect(() => {
    const interval = setInterval(() => setRemaining(Math.max(0, targetMs - Date.now())), 1000);
    return () => clearInterval(interval);
  }, [targetMs]);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { remaining, label: `${minutes}:${seconds.toString().padStart(2, '0')}` };
}

export default function FlashSales({ playerData }) {
  const queryClient = useQueryClient();
  // Generate a new flash sale every 15 minutes based on time
  const slotMs = 15 * 60 * 1000;
  const now = Date.now();
  const slotStart = Math.floor(now / slotMs) * slotMs;
  const slotEnd = slotStart + slotMs;
  const seed = Math.floor(slotStart / slotMs);
  const sale = getFlashSale(seed);
  const { remaining, label } = useCountdown(slotEnd);

  const buyFlash = useMutation({
    mutationFn: async () => {
      if ((playerData?.crypto_balance || 0) < sale.salePrice) throw new Error('Insufficient crypto');
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) - sale.salePrice,
        endgame_points: (playerData.endgame_points || 0) + 50,
      });
    },
    onSuccess: () => { sounds.cash(); toast.success(`🔥 ${sale.name} purchased at ${(sale.discount * 100).toFixed(0)}% off!`); queryClient.invalidateQueries(); },
    onError: (e) => toast.error(e.message)
  });

  const urgency = remaining < 120000; // < 2 min

  return (
    <Card className={`glass-panel border ${urgency ? 'border-red-500 animate-pulse' : 'border-orange-500/30'}`}>
      <CardHeader>
        <CardTitle className="text-orange-400 flex items-center gap-2">
          <Zap className="w-5 h-5" />⚡ Flash Sale
          <Badge className={urgency ? 'bg-red-700 ml-auto' : 'bg-orange-700 ml-auto'}>
            <Timer className="w-3 h-3 mr-1" />{label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{sale.icon}</span>
          <div>
            <h3 className="text-white font-bold text-lg">{sale.name}</h3>
            <p className="text-gray-400 text-sm">{sale.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500 line-through text-sm">${sale.originalPrice.toLocaleString()}</span>
              <span className="text-green-400 font-bold text-lg">${sale.salePrice.toLocaleString()}</span>
              <Badge className="bg-green-700">{(sale.discount * 100).toFixed(0)}% OFF</Badge>
            </div>
          </div>
        </div>
        <Button className="w-full bg-orange-600 hover:bg-orange-500 font-bold"
          onClick={() => buyFlash.mutate()} disabled={buyFlash.isPending || remaining === 0}>
          {remaining === 0 ? '⌛ Sale Ended' : buyFlash.isPending ? 'Purchasing...' : `🔥 Buy Now — $${sale.salePrice.toLocaleString()}`}
        </Button>
      </CardContent>
    </Card>
  );
}