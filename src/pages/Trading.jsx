import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel, ShoppingCart } from 'lucide-react';
import Auction from './Auction';
import PlayerMarketplace from '../components/trading/PlayerMarketplace';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Trading() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0] || null;
    },
    enabled: !!user,
    staleTime: 30000
  });

  if (!playerData) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Trading Hub</h1>
        <p className="text-gray-400">Buy, sell, and trade items with other players</p>
      </div>

      <Tabs defaultValue="auction" className="space-y-4">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="auction" className="flex items-center gap-2">
            <Gavel className="w-4 h-4" />
            Auction House
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auction">
          <Auction />
        </TabsContent>

        <TabsContent value="marketplace">
          <PlayerMarketplace playerData={playerData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}