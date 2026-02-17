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
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [typeFilter, setTypeFilter] = useState('all');
  const [proposeTrade, setProposeTrade] = useState(null);
  const [tradeMessage, setTradeMessage] = useState('');
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

  const proposeP2PTradeMutation = useMutation({
    mutationFn: async ({ offer, proposedPrice, message }) => {
      return await base44.entities.TradeOffer.create({
        initiator_id: playerData.id,
        initiator_username: playerData.username,
        recipient_id: offer.seller_id,
        recipient_username: offer.seller_username,
        trade_type: 'negotiation',
        status: 'pending',
        initiator_offer: {
          crypto: proposedPrice,
          message: message
        },
        recipient_offer: {
          items: [{
            id: offer.item_id,
            name: offer.item_name,
            quantity: offer.item_quantity
          }]
        },
        original_asking_price: offer.asking_price,
        proposed_price: proposedPrice,
        message: message,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tradeOffers']);
      toast.success('Trade proposal sent!');
      setProposeTrade(null);
      setTradeMessage('');
    },
    onError: (error) => toast.error(error.message)
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

  // Filter logic
  const filteredOffers = tradeOffers
    .filter(o => o.seller_id !== playerData?.id)
    .filter(o => {
      const matchesSearch = o.item_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = o.asking_price >= priceRange.min && o.asking_price <= priceRange.max;
      const matchesRarity = rarityFilter === 'all' || o.item_rarity === rarityFilter;
      const matchesType = typeFilter === 'all' || o.item_type === typeFilter;
      return matchesSearch && matchesPrice && matchesRarity && matchesType;
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
            {/* Search and Filters */}
            <div className="space-y-3 mb-4 p-3 rounded-lg bg-slate-900/50 border border-cyan-500/20">
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Rarity</label>
                  <select
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                    className="w-full p-2 text-sm rounded bg-slate-900/50 border border-cyan-500/20 text-white"
                  >
                    <option value="all">All</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full p-2 text-sm rounded bg-slate-900/50 border border-cyan-500/20 text-white"
                  >
                    <option value="all">All</option>
                    <option value="weapon">Weapon</option>
                    <option value="equipment">Equipment</option>
                    <option value="material">Material</option>
                    <option value="contraband">Contraband</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Min Price</label>
                  <Input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) || 0 })}
                    className="bg-slate-900/50 border-cyan-500/20 text-white text-sm h-9"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Max Price</label>
                  <Input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) || 1000000 })}
                    className="bg-slate-900/50 border-cyan-500/20 text-white text-sm h-9"
                  />
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                Showing {filteredOffers.length} of {tradeOffers.filter(o => o.seller_id !== playerData?.id).length} items
              </div>
            </div>
            {filteredOffers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400">No items match your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredOffers.map((offer) => (
                  <div key={offer.id} className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{offer.item_name}</h4>
                        <p className="text-xs text-gray-400">Seller: {offer.seller_username}</p>
                        {offer.item_rarity && (
                          <Badge className={`text-xs mt-1 ${
                            offer.item_rarity === 'legendary' ? 'bg-yellow-600' :
                            offer.item_rarity === 'epic' ? 'bg-purple-600' :
                            offer.item_rarity === 'rare' ? 'bg-blue-600' : 'bg-gray-600'
                          }`}>
                            {offer.item_rarity}
                          </Badge>
                        )}
                      </div>
                      <Badge className="bg-green-600">
                        ${offer.asking_price.toLocaleString()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Qty: {offer.item_quantity}</p>
                    
                    {proposeTrade === offer.id ? (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          placeholder="Your offer amount"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          className="bg-slate-900/50 border-cyan-500/20 text-white text-sm"
                        />
                        <Input
                          placeholder="Message to seller"
                          value={tradeMessage}
                          onChange={(e) => setTradeMessage(e.target.value)}
                          className="bg-slate-900/50 border-cyan-500/20 text-white text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600"
                            onClick={() => proposeP2PTradeMutation.mutate({
                              offer,
                              proposedPrice: parseInt(offerAmount),
                              message: tradeMessage
                            })}
                            disabled={!offerAmount || proposeP2PTradeMutation.isPending}
                          >
                            Send Offer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setProposeTrade(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-cyan-500/30"
                          onClick={() => setProposeTrade(offer.id)}
                        >
                          Propose Trade
                        </Button>
                      </div>
                    )}
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