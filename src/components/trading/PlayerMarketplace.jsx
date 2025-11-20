import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, DollarSign, Package, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerMarketplace({ playerData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: myItems = [] } = useQuery({
    queryKey: ['items', 'mine', playerData?.id],
    queryFn: () => base44.entities.Item.filter({ owner_id: playerData.id, is_tradeable: true }),
    enabled: !!playerData
  });

  const { data: tradeOffers = [] } = useQuery({
    queryKey: ['tradeOffers'],
    queryFn: () => base44.entities.TradeOffer.filter({ status: 'listed' })
  });

  const { data: myOffers = [] } = useQuery({
    queryKey: ['tradeOffers', 'mine'],
    queryFn: () => base44.entities.TradeOffer.filter({ seller_id: playerData.id }),
    enabled: !!playerData
  });

  const listItemMutation = useMutation({
    mutationFn: async ({ itemId, price }) => {
      const item = myItems.find(i => i.id === itemId);
      
      return await base44.entities.TradeOffer.create({
        seller_id: playerData.id,
        seller_username: playerData.username,
        item_id: item.id,
        item_name: item.name,
        item_quantity: item.quantity,
        asking_price: price,
        payment_type: 'crypto',
        status: 'listed',
        transaction_fee: Math.floor(price * 0.05),
        listed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tradeOffers']);
      toast.success('Item listed on marketplace!');
      setSelectedItem(null);
      setOfferAmount('');
    }
  });

  const buyItemMutation = useMutation({
    mutationFn: async (offer) => {
      if (playerData.crypto_balance < offer.asking_price) {
        throw new Error('Insufficient funds');
      }

      // Transfer item
      const items = await base44.entities.Item.filter({ id: offer.item_id });
      const item = items[0];
      
      await base44.entities.Item.update(item.id, {
        owner_id: playerData.id
      });

      // Update balances
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - offer.asking_price,
        stats: {
          ...playerData.stats,
          items_traded: (playerData.stats?.items_traded || 0) + 1
        }
      });

      const sellers = await base44.entities.Player.filter({ id: offer.seller_id });
      if (sellers[0]) {
        const netAmount = offer.asking_price - offer.transaction_fee;
        await base44.entities.Player.update(sellers[0].id, {
          crypto_balance: sellers[0].crypto_balance + netAmount,
          total_earnings: sellers[0].total_earnings + netAmount
        });
      }

      // Complete trade
      await base44.entities.TradeOffer.update(offer.id, {
        status: 'completed',
        buyer_id: playerData.id,
        buyer_username: playerData.username,
        completed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tradeOffers']);
      queryClient.invalidateQueries(['items']);
      queryClient.invalidateQueries(['player']);
      toast.success('Purchase successful!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <Card className="glass-panel border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <ShoppingCart className="w-5 h-5 text-cyan-400" />
          Player Marketplace
          <Badge className="ml-auto bg-cyan-600">
            Balance: ${playerData?.crypto_balance?.toLocaleString() || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="browse">
          <TabsList className="glass-panel border border-cyan-500/20 mb-4">
            <TabsTrigger value="browse">Browse Items</TabsTrigger>
            <TabsTrigger value="myitems">My Items</TabsTrigger>
            <TabsTrigger value="mysales">My Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {tradeOffers.filter(o => o.seller_id !== playerData?.id).length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400">No items for sale</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tradeOffers.filter(o => o.seller_id !== playerData?.id).map((offer) => (
                  <div key={offer.id} className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{offer.item_name}</h4>
                        <p className="text-xs text-gray-400">Seller: {offer.seller_username}</p>
                      </div>
                      <Badge className="bg-green-600">
                        ${offer.asking_price.toLocaleString()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Qty: {offer.item_quantity}</p>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => buyItemMutation.mutate(offer)}
                      disabled={buyItemMutation.isPending}
                    >
                      {buyItemMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="myitems">
            {myItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400">No items to sell</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myItems.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{item.name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{item.item_type}</p>
                      </div>
                      <Badge className="bg-purple-600">Qty: {item.quantity}</Badge>
                    </div>
                    {selectedItem === item.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Price"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          className="bg-slate-900/50 border-purple-500/20 text-white text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => listItemMutation.mutate({
                            itemId: item.id,
                            price: parseInt(offerAmount)
                          })}
                          disabled={!offerAmount || listItemMutation.isPending}
                        >
                          {listItemMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-cyan-500/30"
                        onClick={() => setSelectedItem(item.id)}
                      >
                        List for Sale
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mysales">
            {myOffers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400">No active listings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOffers.map((offer) => (
                  <div key={offer.id} className="p-3 rounded-lg bg-slate-900/50 border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white">{offer.item_name}</h4>
                        <p className="text-xs text-gray-400">
                          Listed for ${offer.asking_price.toLocaleString()}
                        </p>
                      </div>
                      <Badge className={
                        offer.status === 'completed' ? 'bg-green-600' :
                        offer.status === 'pending' ? 'bg-yellow-600' : 'bg-blue-600'
                      }>
                        {offer.status}
                      </Badge>
                    </div>
                    {offer.status === 'completed' && offer.buyer_username && (
                      <p className="text-xs text-green-400 mt-2">
                        Sold to {offer.buyer_username}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}