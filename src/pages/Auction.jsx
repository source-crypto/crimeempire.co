import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gavel, Loader2, TrendingUp, Plus } from 'lucide-react';
import { toast } from 'sonner';
import CreateAuctionDialog from '../components/auction/CreateAuctionDialog';

export default function Auction() {
  const [currentUser, setCurrentUser] = useState(null);
  const [bidAmounts, setBidAmounts] = useState({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser,
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => base44.entities.Auction.filter({ is_active: true }),
  });

  const placeBidMutation = useMutation({
    mutationFn: async ({ auctionId, bidAmount }) => {
      const auction = auctions.find(a => a.id === auctionId);
      const minBid = (auction.current_bid || auction.starting_bid) + 100;

      if (bidAmount < minBid) {
        throw new Error(`Minimum bid is $${minBid.toLocaleString()}`);
      }

      if (playerData.crypto_balance < bidAmount) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Auction.update(auctionId, {
        current_bid: bidAmount,
        highest_bidder_id: playerData.id,
        bid_count: (auction.bid_count || 0) + 1
      });

      return bidAmount;
    },
    onSuccess: (amount) => {
      queryClient.invalidateQueries(['auctions']);
      toast.success(`Bid placed: $${amount.toLocaleString()}`);
      setBidAmounts({});
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Auction House</h1>
        <p className="text-gray-400">Buy and sell valuable items</p>
      </div>

      {auctions.length === 0 ? (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-12 text-center">
            <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-white mb-2">No Active Auctions</h3>
            <p className="text-gray-400">Check back later for new items</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auctions.map((auction) => {
            const currentBid = auction.current_bid || auction.starting_bid;
            const minBid = currentBid + 100;
            const isHighestBidder = auction.highest_bidder_id === playerData?.id;

            return (
              <Card key={auction.id} className="glass-panel border-purple-500/20">
                <CardHeader className="border-b border-purple-500/20">
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="text-base">{auction.item_name}</span>
                    {isHighestBidder && (
                      <Badge className="bg-green-600">Winning</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Bid</span>
                    <span className="text-green-400 font-bold">
                      ${currentBid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bids</span>
                    <span className="text-white">{auction.bid_count || 0}</span>
                  </div>
                  <Badge className="w-full justify-center capitalize">{auction.item_type}</Badge>
                  
                  <div className="pt-2 border-t border-purple-500/20">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`Min: $${minBid.toLocaleString()}`}
                        value={bidAmounts[auction.id] || ''}
                        onChange={(e) => setBidAmounts({
                          ...bidAmounts,
                          [auction.id]: parseInt(e.target.value) || 0
                        })}
                        className="bg-slate-900/50 border-purple-500/20 text-white text-sm"
                      />
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-600 to-emerald-600"
                        onClick={() => placeBidMutation.mutate({
                          auctionId: auction.id,
                          bidAmount: bidAmounts[auction.id] || minBid
                        })}
                        disabled={placeBidMutation.isPending || !playerData}
                      >
                        {placeBidMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Min bid: ${minBid.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}