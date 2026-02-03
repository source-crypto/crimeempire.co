import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function TradeHistory({ playerData }) {
  const { data: completedTrades = [] } = useQuery({
    queryKey: ['tradeHistory', playerData.id],
    queryFn: async () => {
      const sent = await base44.entities.TradeOffer.filter({
        initiator_id: playerData.id
      }) || [];

      const received = await base44.entities.TradeOffer.filter({
        recipient_id: playerData.id
      }) || [];

      return [...sent, ...received]
        .filter(t => t.status !== 'pending')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!playerData?.id
  });

  if (completedTrades.length === 0) {
    return (
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-12 text-center">
          <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No trade history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[700px]">
      <div className="space-y-3">
        {completedTrades.map(trade => {
          const isInitiator = trade.initiator_id === playerData.id;
          const otherPlayer = isInitiator ? trade.recipient_username : trade.initiator_username;
          const statusIcon = trade.status === 'completed' ? CheckCircle : 
                           trade.status === 'rejected' ? XCircle : Clock;
          const StatusIcon = statusIcon;

          return (
            <Card key={trade.id} className="glass-panel border-slate-700/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold">
                        {isInitiator ? 'To' : 'From'} {otherPlayer}
                      </h4>
                      <Badge className={
                        trade.status === 'completed' ? 'bg-green-600' :
                        trade.status === 'rejected' ? 'bg-red-600' :
                        'bg-gray-600'
                      }>
                        {trade.status}
                      </Badge>
                    </div>

                    <div className="flex gap-4 text-sm">
                      {trade.initiator_offer.crypto > 0 && (
                        <span className="text-gray-400">
                          💎 {trade.initiator_offer.crypto.toLocaleString()}
                        </span>
                      )}
                      {trade.initiator_offer.items?.length > 0 && (
                        <span className="text-gray-400">
                          📦 {trade.initiator_offer.items.length} items
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(trade.created_date).toLocaleString()}
                    </p>
                  </div>

                  <StatusIcon className={`w-5 h-5 ${
                    trade.status === 'completed' ? 'text-green-400' :
                    trade.status === 'rejected' ? 'text-red-400' :
                    'text-gray-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}