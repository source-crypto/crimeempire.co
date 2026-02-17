import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContrabandCaches() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: contrabandCaches = [] } = useQuery({
    queryKey: ['contrabandCaches'],
    queryFn: () => base44.entities.ContrabandCache.list(),
    refetchInterval: 30000
  });

  const { data: myInventory = [] } = useQuery({
    queryKey: ['contrabandInventory', playerData?.id],
    queryFn: () => base44.entities.ContrabandInventory.filter({ player_id: playerData.id }),
    enabled: !!playerData
  });

  const claimCacheMutation = useMutation({
    mutationFn: async (cache) => {
      if (playerData.crypto_balance < 1000) {
        throw new Error('Need $1,000 to claim contraband');
      }

      await base44.entities.ContrabandCache.update(cache.id, {
        is_claimed: true,
        discovered_by: playerData.id
      });

      await base44.entities.ContrabandInventory.create({
        player_id: playerData.id,
        item_name: cache.cache_type,
        quantity: cache.quantity,
        quality: 100 - cache.heat_level,
        value_per_unit: cache.value / cache.quantity,
        total_value: cache.value,
        storage_location: 'hideout'
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - 1000
      });

      return cache;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contrabandCaches']);
      queryClient.invalidateQueries(['contrabandInventory']);
      queryClient.invalidateQueries(['player']);
      toast.success('Contraband claimed!');
    },
    onError: (error) => toast.error(error.message)
  });

  const unclaimedCaches = contrabandCaches.filter(c => !c.is_claimed);
  const totalInventoryValue = myInventory.reduce((sum, item) => sum + (item.total_value || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="w-6 h-6 text-yellow-400" />
            Contraband Caches
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Discover and claim hidden contraband around the city
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel border-yellow-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Available Caches</p>
            <p className="text-2xl font-bold text-yellow-400">{unclaimedCaches.length}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Your Inventory</p>
            <p className="text-2xl font-bold text-purple-400">{myInventory.length} items</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-green-400">${totalInventoryValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-yellow-500/20">
        <CardHeader className="border-b border-yellow-500/20">
          <CardTitle className="text-white">Available Caches</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {unclaimedCaches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No caches available</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for new discoveries</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unclaimedCaches.map((cache) => (
                <div
                  key={cache.id}
                  className="p-4 rounded-lg bg-slate-900/30 border border-yellow-500/30"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold capitalize">{cache.cache_type}</h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {cache.coordinates?.lat.toFixed(4)}, {cache.coordinates?.lng.toFixed(4)}
                      </p>
                    </div>
                    <Badge className={
                      cache.heat_level > 70 ? 'bg-red-600' :
                      cache.heat_level > 40 ? 'bg-yellow-600' : 'bg-green-600'
                    }>
                      Heat: {cache.heat_level}%
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Value:</span>
                      <span className="text-green-400 font-semibold">${cache.value.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Quantity:</span>
                      <span className="text-cyan-400 font-semibold">{cache.quantity} units</span>
                    </div>
                    {cache.guarded_by && (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        Guarded by {cache.guarded_by}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600"
                    onClick={() => claimCacheMutation.mutate(cache)}
                    disabled={claimCacheMutation.isPending || playerData?.crypto_balance < 1000}
                  >
                    {claimCacheMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Claim ($1,000)
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {myInventory.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white">Your Contraband Inventory</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {myInventory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">{item.item_name}</h4>
                      <p className="text-xs text-gray-400">
                        {item.quantity} units @ ${item.value_per_unit}/unit
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-semibold">${item.total_value.toLocaleString()}</p>
                      <Badge className="mt-1 bg-cyan-600 text-xs">Quality: {item.quality}%</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}