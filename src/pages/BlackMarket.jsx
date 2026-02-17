import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import BlackMarketUI from '../components/blackmarket/BlackMarketUI';
import ContrabandSmugglingManager from '../components/blackmarket/ContrabandSmugglingManager';
import MarketTrendAnalyzer from '../components/blackmarket/MarketTrendAnalyzer';
import AIDynamicPricing from '../components/blackmarket/AIDynamicPricing';
import { ShoppingCart, Truck, TrendingUp } from 'lucide-react';

export default function BlackMarket() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser?.email,
    staleTime: 30000
  });

  const { data: enterpriseNPCs = [] } = useQuery({
    queryKey: ['enterpriseNPCs', playerData?.id],
    queryFn: async () => {
      if (!playerData?.id) return [];
      const allNPCs = await base44.entities.EnterpriseNPC.filter({});
      return allNPCs.filter(npc => npc.enterprise_id);
    },
    enabled: !!playerData?.id,
    staleTime: 30000
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading black market...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-red-500/30 bg-gradient-to-r from-slate-900/50 via-red-900/20 to-slate-900/50 p-6">
        <div>
          <h1 className="text-3xl font-bold text-red-400 mb-2">Dark Web Operations</h1>
          <p className="text-gray-400">Manage illegal trading, smuggling routes, and market intelligence</p>
        </div>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="marketplace" className="space-y-4">
        <TabsList className="glass-panel border border-red-500/20 w-full flex-wrap h-auto p-1">
          <TabsTrigger value="marketplace" className="flex items-center gap-2 text-xs md:text-sm">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Available on Black Market</span>
            <span className="sm:hidden">Market</span>
          </TabsTrigger>
          <TabsTrigger value="smuggling" className="flex items-center gap-2 text-xs md:text-sm">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Smuggling Routes</span>
            <span className="sm:hidden">Smuggling</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2 text-xs md:text-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Market Intelligence</span>
            <span className="sm:hidden">Intel</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace">
          <div className="space-y-4">
            <AIDynamicPricing playerData={playerData} />
            <BlackMarketUI playerData={playerData} />
          </div>
        </TabsContent>

        <TabsContent value="smuggling">
          <ContrabandSmugglingManager 
            playerData={playerData}
            enterpriseNPCs={enterpriseNPCs}
          />
        </TabsContent>

        <TabsContent value="trends">
          <MarketTrendAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}