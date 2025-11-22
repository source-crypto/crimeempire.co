import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LiveMarketTracker({ playerData }) {
  const queryClient = useQueryClient();

  const { data: playerItems = [] } = useQuery({
    queryKey: ['playerItems', playerData?.id],
    queryFn: () => base44.entities.Item.filter({ owner_id: playerData.id }),
    enabled: !!playerData,
    refetchInterval: 15000
  });

  const { data: marketFluctuations = [] } = useQuery({
    queryKey: ['marketFluctuations'],
    queryFn: () => base44.entities.MarketFluctuation.list('-last_updated', 50),
    refetchInterval: 20000
  });

  const syncItemPricesMutation = useMutation({
    mutationFn: async () => {
      let updated = 0;
      
      for (const item of playerItems) {
        const marketData = marketFluctuations.find(m => m.item_type === item.item_type);
        
        if (marketData && marketData.current_price !== item.current_market_value) {
          await base44.entities.Item.update(item.id, {
            current_market_value: marketData.current_price,
            market_data: {
              ...item.market_data,
              last_price_check: new Date().toISOString(),
              market_trend: marketData.trend,
              purchase_price: item.market_data?.purchase_price || item.base_value
            }
          });
          updated++;
        }
      }
      
      return updated;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['playerItems']);
      toast.success(`Updated ${count} item prices`);
    }
  });

  const { data: territoryItems = [] } = useQuery({
    queryKey: ['territoryItems', playerData?.crew_id],
    queryFn: async () => {
      const territories = await base44.entities.Territory.filter({ 
        controlling_crew_id: playerData.crew_id 
      });
      
      const allItems = [];
      for (const territory of territories) {
        const items = await base44.entities.Item.filter({ 
          location: territory.id,
          owner_type: 'territory'
        });
        allItems.push(...items.map(i => ({ ...i, territoryName: territory.name })));
      }
      return allItems;
    },
    enabled: !!playerData?.crew_id,
    refetchInterval: 15000
  });

  if (!playerData) return null;

  const totalValue = playerItems.reduce((sum, item) => 
    sum + (item.current_market_value || 0) * (item.quantity || 1), 0
  );

  const territoryValue = territoryItems.reduce((sum, item) => 
    sum + (item.current_market_value || 0) * (item.quantity || 1), 0
  );

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-green-500/20">
        <CardHeader className="border-b border-green-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Live Market Tracker
            </CardTitle>
            <Button
              size="sm"
              onClick={() => syncItemPricesMutation.mutate()}
              disabled={syncItemPricesMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {syncItemPricesMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Sync Prices</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30">
              <p className="text-sm text-gray-400 mb-1">Personal Inventory Value</p>
              <p className="text-2xl font-bold text-green-400">${totalValue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{playerItems.length} items</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <p className="text-sm text-gray-400 mb-1">Territory Storage Value</p>
              <p className="text-2xl font-bold text-blue-400">${territoryValue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{territoryItems.length} items</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm mb-2">Your Items (Live Market Prices)</h4>
            {playerItems.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">No items</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {playerItems.map((item) => {
                  const marketData = marketFluctuations.find(m => m.item_type === item.item_type);
                  const priceChange = item.market_data?.purchase_price 
                    ? ((item.current_market_value - item.market_data.purchase_price) / item.market_data.purchase_price * 100)
                    : 0;

                  return (
                    <div key={item.id} className="p-3 rounded-lg bg-slate-900/30 border border-green-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-white font-semibold text-sm">{item.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{item.item_type} x{item.quantity || 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">${(item.current_market_value || 0).toLocaleString()}</p>
                          {priceChange !== 0 && (
                            <p className={`text-xs flex items-center gap-1 ${priceChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {priceChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {priceChange.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                      {marketData && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={
                            marketData.trend === 'rising' ? 'bg-green-600' :
                            marketData.trend === 'falling' ? 'bg-red-600' : 'bg-gray-600'
                          }>
                            {marketData.trend}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Demand: {marketData.demand_level} | Supply: {marketData.supply_level}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {territoryItems.length > 0 && (
            <div className="mt-4">
              <h4 className="text-white font-semibold text-sm mb-2">Territory Storage</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {territoryItems.map((item) => (
                  <div key={item.id} className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">{item.name} x{item.quantity || 1}</p>
                        <p className="text-xs text-gray-400">{item.territoryName}</p>
                      </div>
                      <p className="text-sm text-cyan-400">${(item.current_market_value || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}