import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import LaunderingBusinessManager from '../components/laundering/LaunderingBusinessManager';
import CurrencyMarketplace from '../components/laundering/CurrencyMarketplace';
import AccessoryShop from '../components/laundering/AccessoryShop';
import { DollarSign, TrendingUp, ShoppingBag, Database } from 'lucide-react';

export default function MoneyLaundering() {
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
    enabled: !!currentUser?.email
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['launderingBusinesses', playerData?.id],
    queryFn: () => base44.entities.MoneyLaunderingBusiness.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-green-500/20 p-6">
          <p className="text-white">Loading money laundering operations...</p>
        </Card>
      </div>
    );
  }

  const totalCapacity = businesses.reduce((sum, b) => sum + b.capacity_per_hour, 0);
  const totalClean = businesses.reduce((sum, b) => sum + b.clean_money_generated, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-panel border-green-500/30 bg-gradient-to-r from-slate-900/50 via-green-900/20 to-slate-900/50 p-6">
        <div>
          <h1 className="text-3xl font-bold text-green-400 mb-2">Money Laundering</h1>
          <p className="text-gray-400">Clean your dirty money through legitimate business fronts</p>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-green-500/20">
          <CardHeader className="p-4">
            <div className="text-xs text-gray-400">Active Businesses</div>
            <div className="text-2xl font-bold text-green-400">{businesses.length}</div>
          </CardHeader>
        </Card>
        <Card className="glass-panel border-blue-500/20">
          <CardHeader className="p-4">
            <div className="text-xs text-gray-400">Hourly Capacity</div>
            <div className="text-2xl font-bold text-blue-400">${(totalCapacity / 1000).toFixed(0)}k</div>
          </CardHeader>
        </Card>
        <Card className="glass-panel border-yellow-500/20">
          <CardHeader className="p-4">
            <div className="text-xs text-gray-400">Total Cleaned</div>
            <div className="text-2xl font-bold text-yellow-400">${(totalClean / 1000).toFixed(0)}k</div>
          </CardHeader>
        </Card>
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="p-4">
            <div className="text-xs text-gray-400">Avg Efficiency</div>
            <div className="text-2xl font-bold text-purple-400">
              {businesses.length > 0 ? Math.round(businesses.reduce((s, b) => s + b.efficiency, 0) / businesses.length) : 0}%
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="businesses" className="space-y-4">
        <TabsList className="glass-panel border border-green-500/20">
          <TabsTrigger value="businesses" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            My Businesses
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Currency Exchange
          </TabsTrigger>
          <TabsTrigger value="accessories" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Accessories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="businesses">
          <LaunderingBusinessManager playerData={playerData} businesses={businesses} />
        </TabsContent>

        <TabsContent value="marketplace">
          <CurrencyMarketplace playerData={playerData} businesses={businesses} />
        </TabsContent>

        <TabsContent value="accessories">
          <AccessoryShop playerData={playerData} businesses={businesses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}