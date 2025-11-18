import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel } from 'lucide-react';

export default function Auction() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: auctions = [] } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => base44.entities.Auction.filter({ is_active: true }),
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
          {auctions.map((auction) => (
            <Card key={auction.id} className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white">{auction.item_name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Bid</span>
                    <span className="text-green-400 font-bold">
                      ${(auction.current_bid || auction.starting_bid).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bids</span>
                    <span className="text-white">{auction.bid_count || 0}</span>
                  </div>
                  <Badge className="w-full justify-center capitalize">{auction.item_type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}