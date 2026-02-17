import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, DollarSign, Package, Loader2, Check, MessageSquare, Send, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerMarketplace({ playerData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [typeFilter, setTypeFilter] = useState('all');
  const [statFilter, setStatFilter] = useState({ minDamage: 0, minDefense: 0, minSpeed: 0 });
  const [proposeTrade, setProposeTrade] = useState(null);
  const [tradeMessage, setTradeMessage] = useState('');
  const [offerItems, setOfferItems] = useState([]);
  const [viewMessages, setViewMessages] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
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

  const { data: pendingProposals = [] } = useQuery({
    queryKey: ['tradeProposals', 'pending', playerData?.id],
    queryFn: () => base44.entities.TradeOffer.filter({ 
      recipient_id: playerData.id, 
      trade_type: 'negotiation',
      status: 'pending' 
    }),
    enabled: !!playerData
  });

  const { data: myProposals = [] } = useQuery({
    queryKey: ['tradeProposals', 'sent', playerData?.id],
    queryFn: () => base44.entities.TradeOffer.filter({ 
      initiator_id: playerData.id, 
      trade_type: 'negotiation'
    }),
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
    mutationFn: async ({ offer, proposedPrice, message, offeredItems }) => {
      const negotiationMessages = [
        {
          sender_id: playerData.id,
          sender_username: playerData.username,
          message: message,
          timestamp: new Date().toISOString(),
          offer_details: {
            crypto: proposedPrice,
            items: offeredItems
          }
        }
      ];

      return await base44.entities.TradeOffer.create({
        initiator_id: playerData.id,
        initiator_username: playerData.username,
        recipient_id: offer.seller_id,
        recipient_username: offer.seller_username,
        trade_type: 'negotiation',
        status: 'pending',
        initiator_offer: {
          crypto: proposedPrice,
          items: offeredItems,
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
        negotiation_messages: negotiationMessages,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tradeOffers']);
      queryClient.invalidateQueries(['tradeProposals']);
      toast.success('Trade proposal sent!');
      setProposeTrade(null);
      setTradeMessage('');
      setOfferItems([]);
      setOfferAmount('');
    },
    onError: (error) => toast.error(error.message)
  });

  const respondToProposalMutation = useMutation({
    mutationFn: async ({ proposalId, action, counterOffer, message }) => {
      const proposal = pendingProposals.find(p => p.id === proposalId);
      
      if (action === 'accept') {
        // Transfer items and currency
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance + (counterOffer?.crypto || proposal.proposed_price)
        });
        
        await base44.entities.Player.update(proposal.initiator_id, {
          crypto_balance: (await base44.entities.Player.filter({ id: proposal.initiator_id }))[0].crypto_balance - (counterOffer?.crypto || proposal.proposed_price)
        });

        await base44.entities.TradeOffer.update(proposalId, {
          status: 'accepted',
          completed_at: new Date().toISOString()
        });
      } else if (action === 'reject') {
        await base44.entities.TradeOffer.update(proposalId, {
          status: 'rejected'
        });
      } else if (action === 'counter') {
        const updatedMessages = [
          ...(proposal.negotiation_messages || []),
          {
            sender_id: playerData.id,
            sender_username: playerData.username,
            message: message,
            timestamp: new Date().toISOString(),
            offer_details: counterOffer
          }
        ];

        await base44.entities.TradeOffer.update(proposalId, {
          negotiation_messages: updatedMessages,
          proposed_price: counterOffer.crypto
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tradeProposals']);
      queryClient.invalidateQueries(['player']);
      toast.success('Response sent!');
      setViewMessages(null);
      setReplyMessage('');
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

  // Filter logic with stats
  const filteredOffers = tradeOffers
    .filter(o => o.seller_id !== playerData?.id)
    .filter(o => {
      const matchesSearch = o.item_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = o.asking_price >= priceRange.min && o.asking_price <= priceRange.max;
      const matchesRarity = rarityFilter === 'all' || o.item_rarity === rarityFilter;
      const matchesType = typeFilter === 'all' || o.item_type === typeFilter;
      
      // Stats filtering
      const itemStats = o.item_stats || {};
      const matchesStats = (
        (itemStats.damage || 0) >= statFilter.minDamage &&
        (itemStats.defense || 0) >= statFilter.minDefense &&
        (itemStats.speed || 0) >= statFilter.minSpeed
      );
      
      return matchesSearch && matchesPrice && matchesRarity && matchesType && matchesStats;
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
            <TabsTrigger value="proposals">
              Negotiations
              {pendingProposals.length > 0 && (
                <Badge className="ml-2 bg-red-600">{pendingProposals.length}</Badge>
              )}
            </TabsTrigger>
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
              
              {/* Stats Filters */}
              <div className="border-t border-cyan-500/20 pt-3 mt-3">
                <p className="text-xs text-gray-400 mb-2 font-semibold">Item Stats (Minimum)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Min Damage</label>
                    <Input
                      type="number"
                      value={statFilter.minDamage}
                      onChange={(e) => setStatFilter({ ...statFilter, minDamage: parseInt(e.target.value) || 0 })}
                      className="bg-slate-900/50 border-cyan-500/20 text-white text-sm h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Min Defense</label>
                    <Input
                      type="number"
                      value={statFilter.minDefense}
                      onChange={(e) => setStatFilter({ ...statFilter, minDefense: parseInt(e.target.value) || 0 })}
                      className="bg-slate-900/50 border-cyan-500/20 text-white text-sm h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Min Speed</label>
                    <Input
                      type="number"
                      value={statFilter.minSpeed}
                      onChange={(e) => setStatFilter({ ...statFilter, minSpeed: parseInt(e.target.value) || 0 })}
                      className="bg-slate-900/50 border-cyan-500/20 text-white text-sm h-8"
                    />
                  </div>
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
                          placeholder="Cash offer amount"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          className="bg-slate-900/50 border-cyan-500/20 text-white text-sm"
                        />
                        
                        <div className="text-xs text-gray-400 mb-1">+ Offer Items (optional)</div>
                        <select
                          multiple
                          value={offerItems.map(i => i.id)}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions).map(opt => {
                              const item = myItems.find(i => i.id === opt.value);
                              return { id: item.id, name: item.name, quantity: 1 };
                            });
                            setOfferItems(selected);
                          }}
                          className="w-full p-2 text-xs rounded bg-slate-900/50 border border-cyan-500/20 text-white max-h-20"
                        >
                          {myItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} (Qty: {item.quantity})
                            </option>
                          ))}
                        </select>
                        
                        {offerItems.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {offerItems.map(item => (
                              <Badge key={item.id} className="bg-purple-600 text-xs">
                                {item.name}
                                <X 
                                  className="w-3 h-3 ml-1 cursor-pointer" 
                                  onClick={() => setOfferItems(offerItems.filter(i => i.id !== item.id))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <Textarea
                          placeholder="Your proposal message..."
                          value={tradeMessage}
                          onChange={(e) => setTradeMessage(e.target.value)}
                          className="bg-slate-900/50 border-cyan-500/20 text-white text-sm"
                          rows={2}
                        />
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600"
                            onClick={() => proposeP2PTradeMutation.mutate({
                              offer,
                              proposedPrice: parseInt(offerAmount) || 0,
                              message: tradeMessage,
                              offeredItems: offerItems
                            })}
                            disabled={(!offerAmount && offerItems.length === 0) || proposeP2PTradeMutation.isPending}
                          >
                            <Send className="w-3 h-3 mr-2" />
                            Send Proposal
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProposeTrade(null);
                              setOfferItems([]);
                              setOfferAmount('');
                              setTradeMessage('');
                            }}
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

          <TabsContent value="proposals">
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-3">Incoming Proposals</h3>
                {pendingProposals.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-400">No pending proposals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingProposals.map((proposal) => (
                      <div key={proposal.id} className="p-4 rounded-lg bg-slate-900/50 border border-blue-500/30">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-semibold">{proposal.initiator_username}</h4>
                            <p className="text-xs text-gray-400">
                              Wants: {proposal.recipient_offer?.items?.[0]?.name}
                            </p>
                          </div>
                          <Badge className="bg-blue-600">
                            ${proposal.proposed_price.toLocaleString()}
                          </Badge>
                        </div>

                        <div className="mb-3 p-2 rounded bg-slate-900/50 border border-blue-500/20">
                          <p className="text-xs text-gray-400 mb-1">Offer Details:</p>
                          <p className="text-sm text-white">💰 ${proposal.initiator_offer?.crypto?.toLocaleString()}</p>
                          {proposal.initiator_offer?.items?.length > 0 && (
                            <p className="text-xs text-cyan-400 mt-1">
                              + {proposal.initiator_offer.items.map(i => i.name).join(', ')}
                            </p>
                          )}
                        </div>

                        {proposal.negotiation_messages && proposal.negotiation_messages.length > 0 && (
                          <div className="mb-3 max-h-32 overflow-y-auto space-y-2">
                            {proposal.negotiation_messages.map((msg, idx) => (
                              <div key={idx} className={`p-2 rounded text-xs ${
                                msg.sender_id === playerData.id 
                                  ? 'bg-purple-900/20 border border-purple-500/20' 
                                  : 'bg-blue-900/20 border border-blue-500/20'
                              }`}>
                                <p className="text-gray-400 mb-1">{msg.sender_username}:</p>
                                <p className="text-white">{msg.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {viewMessages === proposal.id ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Your counter-offer message..."
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              className="bg-slate-900/50 border-blue-500/20 text-white text-sm"
                              rows={2}
                            />
                            <Input
                              type="number"
                              placeholder="Counter price"
                              className="bg-slate-900/50 border-blue-500/20 text-white text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-purple-600"
                                onClick={() => respondToProposalMutation.mutate({
                                  proposalId: proposal.id,
                                  action: 'counter',
                                  counterOffer: { crypto: parseInt(offerAmount) || proposal.proposed_price },
                                  message: replyMessage
                                })}
                              >
                                Send Counter
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setViewMessages(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600"
                              onClick={() => respondToProposalMutation.mutate({
                                proposalId: proposal.id,
                                action: 'accept'
                              })}
                              disabled={respondToProposalMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600"
                              onClick={() => setViewMessages(proposal.id)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Counter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30"
                              onClick={() => respondToProposalMutation.mutate({
                                proposalId: proposal.id,
                                action: 'reject'
                              })}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">My Proposals</h3>
                {myProposals.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">No proposals sent</p>
                ) : (
                  <div className="space-y-2">
                    {myProposals.map((proposal) => (
                      <div key={proposal.id} className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm">To: {proposal.recipient_username}</p>
                            <p className="text-xs text-gray-400">
                              Offered: ${proposal.proposed_price.toLocaleString()}
                            </p>
                          </div>
                          <Badge className={
                            proposal.status === 'accepted' ? 'bg-green-600' :
                            proposal.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'
                          }>
                            {proposal.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}