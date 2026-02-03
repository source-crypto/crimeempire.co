import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Package, DollarSign, Briefcase, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function IncomingTrades({ playerData }) {
  const queryClient = useQueryClient();

  const { data: incomingTrades = [] } = useQuery({
    queryKey: ['incomingTrades', playerData.id],
    queryFn: () => base44.entities.TradeOffer.filter({
      recipient_id: playerData.id,
      status: 'pending'
    }),
    refetchInterval: 5000
  });

  const acceptTradeMutation = useMutation({
    mutationFn: async (trade) => {
      // Transfer assets from initiator to recipient
      const initiator = await base44.entities.Player.filter({ id: trade.initiator_id });
      const initiatorPlayer = initiator[0];

      // Deduct from initiator
      await base44.entities.Player.update(trade.initiator_id, {
        crypto_balance: initiatorPlayer.crypto_balance - (trade.initiator_offer.crypto || 0) + (trade.recipient_offer.crypto || 0),
        buy_power: initiatorPlayer.buy_power - (trade.initiator_offer.buy_power || 0) + (trade.recipient_offer.buy_power || 0)
      });

      // Add to recipient (current player)
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + (trade.initiator_offer.crypto || 0) - (trade.recipient_offer.crypto || 0) - trade.transaction_fee,
        buy_power: playerData.buy_power + (trade.initiator_offer.buy_power || 0) - (trade.recipient_offer.buy_power || 0)
      });

      // Transfer items from initiator
      if (trade.initiator_offer.items) {
        for (const itemData of trade.initiator_offer.items) {
          if (itemData.item_id) {
            const item = await base44.entities.Item.filter({ id: itemData.item_id });
            if (item[0]) {
              await base44.entities.Item.update(itemData.item_id, {
                owner_id: playerData.id,
                quantity: item[0].quantity - itemData.quantity
              });

              if (item[0].quantity - itemData.quantity <= 0) {
                await base44.entities.Item.delete(itemData.item_id);
              }
            }
          }
        }
      }

      // Update trade status
      await base44.entities.TradeOffer.update(trade.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      // Notify initiator
      await base44.entities.Notification.create({
        player_id: trade.initiator_id,
        notification_type: 'message_received',
        title: 'Trade Accepted',
        message: `${playerData.username} accepted your trade offer`,
        priority: 'high',
        action_url: 'P2PTrading'
      });

      // Log transaction
      await base44.entities.TransactionLog.create({
        player_id: playerData.id,
        transaction_type: 'trade',
        amount: (trade.initiator_offer.crypto || 0) - (trade.recipient_offer.crypto || 0),
        description: `P2P trade with ${trade.initiator_username}`,
        metadata: { trade_id: trade.id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingTrades'] });
      queryClient.invalidateQueries({ queryKey: ['player'] });
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
      toast.success('Trade completed successfully!');
    },
    onError: () => {
      toast.error('Trade failed - check asset availability');
    }
  });

  const rejectTradeMutation = useMutation({
    mutationFn: async (trade) => {
      await base44.entities.TradeOffer.update(trade.id, {
        status: 'rejected'
      });

      await base44.entities.Notification.create({
        player_id: trade.initiator_id,
        notification_type: 'message_received',
        title: 'Trade Rejected',
        message: `${playerData.username} declined your trade offer`,
        priority: 'low',
        action_url: 'P2PTrading'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingTrades'] });
      toast.success('Trade offer rejected');
    }
  });

  if (incomingTrades.length === 0) {
    return (
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No incoming trade offers</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[700px]">
      <div className="space-y-4">
        {incomingTrades.map(trade => (
          <Card key={trade.id} className="glass-panel border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Trade from {trade.initiator_username}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(trade.created_date).toLocaleString()}
                  </p>
                </div>
                <Badge className="bg-yellow-600">Pending</Badge>
              </div>

              {trade.message && (
                <div className="p-3 bg-slate-900/50 rounded-lg mb-4">
                  <p className="text-sm text-gray-300 italic">"{trade.message}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* They Offer */}
                <div className="p-4 bg-green-900/10 rounded-lg border border-green-500/20">
                  <h4 className="text-sm font-semibold text-green-400 mb-3">They Offer</h4>
                  <div className="space-y-2">
                    {trade.initiator_offer.items?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400">Items:</p>
                        {trade.initiator_offer.items.map((item, i) => (
                          <p key={i} className="text-white text-sm">
                            • {item.item_name} x{item.quantity}
                          </p>
                        ))}
                      </div>
                    )}
                    {trade.initiator_offer.crypto > 0 && (
                      <p className="text-white text-sm">💎 {trade.initiator_offer.crypto.toLocaleString()} Crypto</p>
                    )}
                    {trade.initiator_offer.buy_power > 0 && (
                      <p className="text-white text-sm">💵 {trade.initiator_offer.buy_power.toLocaleString()} Cash</p>
                    )}
                    {trade.initiator_offer.service_description && (
                      <div>
                        <p className="text-xs text-gray-400">Service:</p>
                        <p className="text-white text-sm">{trade.initiator_offer.service_description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* You Offer */}
                <div className="p-4 bg-purple-900/10 rounded-lg border border-purple-500/20">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">You Offer</h4>
                  <div className="space-y-2">
                    {trade.recipient_offer.items?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400">Items:</p>
                        {trade.recipient_offer.items.map((item, i) => (
                          <p key={i} className="text-white text-sm">
                            • {item.item_name} x{item.quantity}
                          </p>
                        ))}
                      </div>
                    )}
                    {trade.recipient_offer.crypto > 0 && (
                      <p className="text-white text-sm">💎 {trade.recipient_offer.crypto.toLocaleString()} Crypto</p>
                    )}
                    {trade.recipient_offer.buy_power > 0 && (
                      <p className="text-white text-sm">💵 {trade.recipient_offer.buy_power.toLocaleString()} Cash</p>
                    )}
                    {trade.recipient_offer.service_description && (
                      <div>
                        <p className="text-xs text-gray-400">Service:</p>
                        <p className="text-white text-sm">{trade.recipient_offer.service_description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => acceptTradeMutation.mutate(trade)}
                  disabled={acceptTradeMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept Trade
                </Button>
                <Button
                  onClick={() => rejectTradeMutation.mutate(trade)}
                  disabled={rejectTradeMutation.isPending}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-3">
                Fee: {trade.transaction_fee} 💰 (paid by recipient)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}