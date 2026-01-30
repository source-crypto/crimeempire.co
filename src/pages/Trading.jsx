import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Gavel, Clock, DollarSign, Package, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TradingPage() {
  const [user, setUser] = useState(null);
  const [listingDialog, setListingDialog] = useState(false);
  const [listingForm, setListingForm] = useState({
    item_name: "", item_type: "material", quantity: 1,
    starting_price: 0, buyout_price: 0, duration: 24
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  const { data: auctionListings = [] } = useQuery({
    queryKey: ['auctionListings'],
    queryFn: () => base44.entities.AuctionListing.filter({ status: 'active' }, '-created_date', 50),
    refetchInterval: 5000
  });

  const { data: myListings = [] } = useQuery({
    queryKey: ['myListings', playerData?.id],
    queryFn: () => base44.entities.AuctionListing.filter({ seller_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const createListingMutation = useMutation({
    mutationFn: async (data) => {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + parseInt(data.duration));

      return await base44.entities.AuctionListing.create({
        seller_id: playerData.id,
        seller_username: playerData.username,
        item_name: data.item_name,
        item_type: data.item_type,
        quantity: parseInt(data.quantity),
        starting_price: parseFloat(data.starting_price),
        current_bid: parseFloat(data.starting_price),
        buyout_price: parseFloat(data.buyout_price) || null,
        ends_at: endsAt.toISOString(),
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['auctionListings']);
      queryClient.invalidateQueries(['myListings']);
      setListingDialog(false);
      setListingForm({
        item_name: "", item_type: "material", quantity: 1,
        starting_price: 0, buyout_price: 0, duration: 24
      });
    }
  });

  const placeBidMutation = useMutation({
    mutationFn: async ({ listingId, bidAmount }) => {
      const listing = auctionListings.find(l => l.id === listingId);
      
      if (playerData.crypto_balance < bidAmount) {
        throw new Error("Insufficient funds");
      }

      await base44.entities.AuctionListing.update(listingId, {
        current_bid: bidAmount,
        highest_bidder_id: playerData.id,
        highest_bidder_username: playerData.username,
        bid_count: (listing.bid_count || 0) + 1
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - bidAmount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['auctionListings']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const buyoutMutation = useMutation({
    mutationFn: async (listing) => {
      if (playerData.crypto_balance < listing.buyout_price) {
        throw new Error("Insufficient funds");
      }

      await base44.entities.AuctionListing.update(listing.id, {
        status: 'sold',
        highest_bidder_id: playerData.id,
        highest_bidder_username: playerData.username
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - listing.buyout_price
      });

      const seller = await base44.entities.Player.filter({ id: listing.seller_id });
      if (seller[0]) {
        await base44.entities.Player.update(listing.seller_id, {
          crypto_balance: seller[0].crypto_balance + listing.buyout_price
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['auctionListings']);
      queryClient.invalidateQueries(['player']);
    }
  });

  if (!playerData) {
    return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Hub</h1>
          <p className="text-slate-400">Buy, sell, and trade items with other players</p>
        </div>
        <Button onClick={() => setListingDialog(true)} className="bg-purple-600 hover:bg-purple-700">
          <Package className="w-4 h-4 mr-2" />
          Create Listing
        </Button>
      </div>

      <Tabs defaultValue="auction" className="space-y-4">
        <TabsList className="glass-panel border border-slate-700">
          <TabsTrigger value="auction">Auction House</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="auction">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctionListings.map((listing) => {
              const timeLeft = new Date(listing.ends_at) - new Date();
              const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));

              return (
                <Card key={listing.id} className="glass-panel border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">{listing.item_name}</CardTitle>
                      <Badge className="bg-blue-600">{listing.item_type}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">by {listing.seller_username}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Quantity</span>
                      <span className="text-white">{listing.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Current Bid</span>
                      <span className="text-green-400 font-bold">${listing.current_bid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Bids</span>
                      <span className="text-white">{listing.bid_count}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{hoursLeft}h remaining</span>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Bid amount"
                        className="bg-slate-800 border-slate-700 text-white"
                        id={`bid-${listing.id}`}
                      />
                      <Button
                        onClick={() => {
                          const bidAmount = parseFloat(document.getElementById(`bid-${listing.id}`).value);
                          if (bidAmount > listing.current_bid) {
                            placeBidMutation.mutate({ listingId: listing.id, bidAmount });
                          }
                        }}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Gavel className="w-4 h-4" />
                      </Button>
                    </div>

                    {listing.buyout_price && (
                      <Button
                        onClick={() => buyoutMutation.mutate(listing)}
                        disabled={playerData.crypto_balance < listing.buyout_price}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buyout ${listing.buyout_price.toLocaleString()}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="my-listings">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myListings.map((listing) => (
              <Card key={listing.id} className="glass-panel border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white">{listing.item_name}</CardTitle>
                  <Badge className={
                    listing.status === 'active' ? 'bg-green-600' :
                    listing.status === 'sold' ? 'bg-blue-600' : 'bg-red-600'
                  }>
                    {listing.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Bid</span>
                      <span className="text-white">${listing.current_bid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Bids</span>
                      <span className="text-white">{listing.bid_count}</span>
                    </div>
                    {listing.highest_bidder_username && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Top Bidder</span>
                        <span className="text-green-400">{listing.highest_bidder_username}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={listingDialog} onOpenChange={setListingDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create Auction Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Item Name"
              value={listingForm.item_name}
              onChange={(e) => setListingForm({ ...listingForm, item_name: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Select
              value={listingForm.item_type}
              onValueChange={(value) => setListingForm({ ...listingForm, item_type: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="weapon">Weapon</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="contraband">Contraband</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Quantity"
              value={listingForm.quantity}
              onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Input
              type="number"
              placeholder="Starting Price"
              value={listingForm.starting_price}
              onChange={(e) => setListingForm({ ...listingForm, starting_price: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Input
              type="number"
              placeholder="Buyout Price (Optional)"
              value={listingForm.buyout_price}
              onChange={(e) => setListingForm({ ...listingForm, buyout_price: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Select
              value={listingForm.duration.toString()}
              onValueChange={(value) => setListingForm({ ...listingForm, duration: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="12">12 Hours</SelectItem>
                <SelectItem value="24">24 Hours</SelectItem>
                <SelectItem value="48">48 Hours</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => createListingMutation.mutate(listingForm)}
              disabled={!listingForm.item_name || createListingMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Create Listing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}