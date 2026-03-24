import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Bell, BellOff, TrendingUp, Gavel } from 'lucide-react';
import { toast } from 'sonner';

function getWatchlist() {
  try { return JSON.parse(localStorage.getItem('auction_watchlist') || '[]'); } catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem('auction_watchlist', JSON.stringify(list));
}

export default function AuctionWatchlist({ playerData, auctions }) {
  const [watchlist, setWatchlist] = useState(getWatchlist);
  const [notifiedOutbid, setNotifiedOutbid] = useState({});

  // Check if player got outbid on any watched auction
  useEffect(() => {
    if (!playerData || !auctions.length) return;
    auctions.forEach(auction => {
      if (!watchlist.includes(auction.id)) return;
      const wasHighest = notifiedOutbid[auction.id]?.wasHighest;
      const isHighest = auction.highest_bidder_id === playerData.id;
      if (wasHighest && !isHighest && auction.highest_bidder_id) {
        toast.warning(`⚠️ You were outbid on "${auction.item_name}"! New bid: $${(auction.current_bid || 0).toLocaleString()}`);
      }
      setNotifiedOutbid(prev => ({ ...prev, [auction.id]: { wasHighest: isHighest } }));
    });
  }, [auctions, playerData]);

  function toggleWatch(auctionId) {
    const list = watchlist.includes(auctionId)
      ? watchlist.filter(id => id !== auctionId)
      : [...watchlist, auctionId];
    saveWatchlist(list);
    setWatchlist(list);
    toast.success(watchlist.includes(auctionId) ? 'Removed from watchlist' : 'Added to watchlist');
  }

  const watchedAuctions = auctions.filter(a => watchlist.includes(a.id));

  return (
    <div className="space-y-4">
      {/* Outbid Alerts */}
      {watchedAuctions.some(a => watchlist.includes(a.id) && a.highest_bidder_id && a.highest_bidder_id !== playerData?.id) && (
        <div className="p-3 rounded-xl border border-red-500/40 bg-red-900/20 flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-red-300 text-sm font-medium">
            You've been outbid on {watchedAuctions.filter(a => a.highest_bidder_id && a.highest_bidder_id !== playerData?.id).length} watched item(s)!
          </span>
        </div>
      )}

      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2 text-white">
            <Eye className="w-5 h-5 text-purple-400" />
            My Watchlist
            <Badge className="ml-auto bg-purple-700">{watchlist.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {watchedAuctions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No watched auctions. Click the eye icon on any auction to watch it.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchedAuctions.map(auction => {
                const isWinning = auction.highest_bidder_id === playerData?.id;
                const isOutbid = auction.highest_bidder_id && !isWinning;
                const currentBid = auction.current_bid || auction.starting_bid;
                return (
                  <div key={auction.id} className={`p-3 rounded-lg border ${isOutbid ? 'border-red-500/40 bg-red-900/10' : isWinning ? 'border-green-500/40 bg-green-900/10' : 'border-purple-500/20 bg-slate-900/30'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold text-sm">{auction.item_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{auction.item_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">${currentBid.toLocaleString()}</p>
                        {isWinning && <Badge className="bg-green-700 text-xs">Winning</Badge>}
                        {isOutbid && <Badge className="bg-red-700 text-xs animate-pulse">Outbid!</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{auction.bid_count || 0} bids</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-gray-400 hover:text-red-400"
                        onClick={() => toggleWatch(auction.id)}
                      >
                        <EyeOff className="w-3 h-3 mr-1" />
                        Unwatch
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watch Toggle available on all auctions */}
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <Bell className="w-3 h-3" />
        You'll be notified when you get outbid on watched items
      </div>

      {/* Toggle function exposed via prop-style section on main listing */}
      <div>
        <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
          <Gavel className="w-4 h-4 text-purple-400" />
          All Active Auctions — Watch Status
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {auctions.map(auction => {
            const watched = watchlist.includes(auction.id);
            return (
              <div key={auction.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-purple-500/10">
                <div>
                  <p className="text-white text-sm">{auction.item_name}</p>
                  <p className="text-xs text-gray-400">${(auction.current_bid || auction.starting_bid).toLocaleString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-7 text-xs ${watched ? 'text-purple-400' : 'text-gray-500'}`}
                  onClick={() => toggleWatch(auction.id)}
                >
                  {watched ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                  {watched ? 'Watching' : 'Watch'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}