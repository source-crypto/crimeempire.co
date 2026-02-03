import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeftRight, Send, Inbox, History, Plus } from 'lucide-react';
import TradeProposalForm from '../components/trading/TradeProposalForm';
import IncomingTrades from '../components/trading/IncomingTrades';
import OutgoingTrades from '../components/trading/OutgoingTrades';
import TradeHistory from '../components/trading/TradeHistory';

export default function P2PTrading() {
  const [activeTab, setActiveTab] = useState('incoming');
  const [showProposalForm, setShowProposalForm] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: () => base44.entities.Player.filter({ created_by: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0],
    staleTime: 30000
  });

  const { data: incomingTrades = [] } = useQuery({
    queryKey: ['incomingTrades', playerData?.id],
    queryFn: () => base44.entities.TradeOffer.filter({
      recipient_id: playerData.id,
      status: 'pending'
    }, '-created_date', 20),
    enabled: !!playerData?.id,
    staleTime: 15000,
    refetchInterval: 30000
  });

  const { data: outgoingTrades = [] } = useQuery({
    queryKey: ['outgoingTrades', playerData?.id],
    queryFn: () => base44.entities.TradeOffer.filter({
      initiator_id: playerData.id,
      status: 'pending'
    }, '-created_date', 20),
    enabled: !!playerData?.id,
    staleTime: 15000,
    refetchInterval: 30000
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowLeftRight className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading Trading System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            P2P Trading Hub
          </h1>
          <p className="text-gray-400 mt-1">Secure peer-to-peer asset exchange</p>
        </div>
        <button
          onClick={() => setShowProposalForm(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold text-white hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Trade Offer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <Inbox className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Incoming Offers</p>
                <p className="text-2xl font-bold text-white">{incomingTrades.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Pending Sent</p>
                <p className="text-2xl font-bold text-white">{outgoingTrades.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Platform Fee</p>
                <p className="text-2xl font-bold text-white">50 💰</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showProposalForm && (
        <TradeProposalForm 
          playerData={playerData}
          onClose={() => setShowProposalForm(false)}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-panel border-purple-500/20">
          <TabsTrigger value="incoming">
            <Inbox className="w-4 h-4 mr-2" />
            Incoming ({incomingTrades.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            <Send className="w-4 h-4 mr-2" />
            Sent ({outgoingTrades.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <IncomingTrades playerData={playerData} />
        </TabsContent>

        <TabsContent value="outgoing">
          <OutgoingTrades playerData={playerData} />
        </TabsContent>

        <TabsContent value="history">
          <TradeHistory playerData={playerData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}