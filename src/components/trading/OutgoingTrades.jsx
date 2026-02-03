import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function OutgoingTrades({ playerData }) {
  const queryClient = useQueryClient();

  const { data: outgoingTrades = [] } = useQuery({
    queryKey: ['outgoingTrades', playerData.id],
    queryFn: () => base44.entities.TradeOffer.filter({
      initiator_id: playerData.id,
      status: 'pending'
    }, '-created_date', 20),
    staleTime: 15000,
    refetchInterval: 30000
  });

  const cancelTradeMutation = useMutation({
    mutationFn: async (tradeId) => {
      await base44.entities.TradeOffer.update(tradeId, {
        status: 'cancelled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoingTrades'] });
      toast.success('Trade offer cancelled');
    }
  });

  if (outgoingTrades.length === 0) {
    return (
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-12 text-center">
          <Send className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No pending sent trade offers</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[700px]">
      <div className="space-y-4">
        {outgoingTrades.map(trade => (
          <Card key={trade.id} className="glass-panel border-cyan-500/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Trade to {trade.recipient_username}
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Sent {new Date(trade.created_date).toLocaleString()}
                  </p>
                </div>
                <Badge className="bg-yellow-600">Awaiting Response</Badge>
              </div>

              {trade.message && (
                <div className="p-3 bg-slate-900/50 rounded-lg mb-4">
                  <p className="text-sm text-gray-300 italic">"{trade.message}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Your Offer */}
                <div className="p-4 bg-purple-900/10 rounded-lg border border-purple-500/20">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">You Offer</h4>
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

                {/* They Offer */}
                <div className="p-4 bg-green-900/10 rounded-lg border border-green-500/20">
                  <h4 className="text-sm font-semibold text-green-400 mb-3">They Offer</h4>
                  <div className="space-y-2">
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
                  onClick={() => cancelTradeMutation.mutate(trade.id)}
                  disabled={cancelTradeMutation.isPending}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Offer
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-3">
                Expires: {new Date(trade.expires_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}