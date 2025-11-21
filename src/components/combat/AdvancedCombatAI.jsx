import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Package, Building2, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const transactionIcons = {
  trade: Package,
  transfer: ArrowUpRight,
  purchase: ArrowDownLeft,
  sale: DollarSign,
  enterprise_revenue: Building2,
  territory_income: MapPin,
  heist_payout: DollarSign,
  crew_payment: ArrowDownLeft
};

export default function TransactionLogger({ playerId }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', playerId],
    queryFn: () => base44.entities.TransactionLog.filter({ player_id: playerId }, '-created_date', 50)
  });

  if (!playerId) return null;

  return (
    <Card className="glass-panel border-purple-500/20">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Transaction History
          <Badge className="ml-auto bg-purple-600">{transactions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {transactions.map((tx) => {
              const Icon = transactionIcons[tx.transaction_type] || DollarSign;
              const isIncome = ['enterprise_revenue', 'territory_income', 'heist_payout', 'sale'].includes(tx.transaction_type);
              
              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10 hover:border-purple-500/20 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isIncome ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                        <Icon className={`w-4 h-4 ${isIncome ? 'text-green-400' : 'text-red-400'}`} />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm">{tx.description}</h4>
                        {tx.counterparty_name && (
                          <p className="text-xs text-gray-400 mt-1">
                            {tx.transaction_type === 'transfer' ? 'To: ' : 'From: '}
                            {tx.counterparty_name}
                          </p>
                        )}
                        {tx.item_details && (
                          <p className="text-xs text-purple-400 mt-1">
                            {tx.item_details.item_name} x{tx.item_details.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                        {isIncome ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(tx.created_date), 'MMM d, HH:mm')}
                      </p>
                      <Badge className={`mt-1 ${
                        tx.status === 'completed' ? 'bg-green-600' :
                        tx.status === 'pending' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const logTransaction = async (data) => {
  try {
    await base44.entities.TransactionLog.create({
      transaction_type: data.type,
      player_id: data.playerId,
      player_username: data.playerUsername,
      counterparty_id: data.counterpartyId,
      counterparty_name: data.counterpartyName,
      amount: data.amount,
      item_details: data.itemDetails,
      description: data.description,
      status: data.status || 'completed',
      metadata: data.metadata
    });
  } catch (error) {
    console.error('Failed to log transaction:', error);
  }
};