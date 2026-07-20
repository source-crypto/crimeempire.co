import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PropertyCatalog from '@/components/property/PropertyCatalog';
import MyProperties from '@/components/property/MyProperties';
import PropertyROIAnalytics from '@/components/property/PropertyROIAnalytics';
import { Loader2 } from 'lucide-react';

export default function PropertyMarket() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0] || null;
    },
    enabled: !!user?.email,
  });
  const { data: owned = [] } = useQuery({
    queryKey: ['properties', playerData?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: playerData.id }, '-acquired_at', 50),
    enabled: !!playerData?.id,
  });

  if (!playerData) return (
    <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
  );

  const ownedNames = owned.map(p => p.name);
  const portfolioValue = owned.reduce((s, p) => s + (p.market_value || p.purchase_price), 0);
  const totalIncome = owned.reduce((s, p) => s + (p.income_per_hour || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Property Market
          </h1>
          <p className="text-gray-400 mt-1">Acquire property, collect passive income, build your empire</p>
        </div>
        <div className="flex gap-3">
          <div className="glass-panel border border-purple-500/20 rounded-lg px-4 py-2 text-right">
            <p className="text-xs text-gray-400">Balance</p>
            <p className="text-lg font-bold text-cyan-400">${playerData.crypto_balance?.toLocaleString()}</p>
          </div>
          <div className="glass-panel border border-purple-500/20 rounded-lg px-4 py-2 text-right">
            <p className="text-xs text-gray-400">Portfolio · Income/hr</p>
            <p className="text-lg font-bold"><span className="text-green-400">${portfolioValue.toLocaleString()}</span> <span className="text-gray-500">·</span> <span className="text-purple-400">${totalIncome.toLocaleString()}</span></p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="market">
        <TabsList className="glass-panel border border-purple-500/20">
          <TabsTrigger value="market">🏙️ Market</TabsTrigger>
          <TabsTrigger value="owned">🏘️ My Properties ({owned.length})</TabsTrigger>
          <TabsTrigger value="analytics">📊 Empire Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="market" className="mt-4">
          <PropertyCatalog playerData={playerData} ownedNames={ownedNames} />
        </TabsContent>
        <TabsContent value="owned" className="mt-4">
          <MyProperties playerData={playerData} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <PropertyROIAnalytics playerData={playerData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}