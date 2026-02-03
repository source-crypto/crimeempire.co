import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function TradeProposalForm({ playerData, onClose }) {
  const [recipientId, setRecipientId] = useState('');
  const [tradeType, setTradeType] = useState('item');
  const [message, setMessage] = useState('');
  const [initiatorOffer, setInitiatorOffer] = useState({
    items: [],
    crypto: 0,
    buy_power: 0,
    service_description: ''
  });
  const [recipientOffer, setRecipientOffer] = useState({
    items: [],
    crypto: 0,
    buy_power: 0,
    service_description: ''
  });

  const queryClient = useQueryClient();

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list('-created_date', 100),
    staleTime: 60000
  });

  const { data: myItems = [] } = useQuery({
    queryKey: ['myItems', playerData.id],
    queryFn: () => base44.entities.Item.filter({ owner_id: playerData.id }),
    staleTime: 30000
  });

  const createTradeMutation = useMutation({
    mutationFn: async (tradeData) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const trade = await base44.entities.TradeOffer.create({
        ...tradeData,
        expires_at: expiresAt.toISOString()
      });

      // Create notification for recipient
      const recipient = allPlayers.find(p => p.id === recipientId);
      await base44.entities.Notification.create({
        player_id: recipientId,
        notification_type: 'message_received',
        title: 'New Trade Offer',
        message: `${playerData.username} sent you a trade proposal`,
        priority: 'medium',
        action_url: 'P2PTrading',
        related_entity_id: trade.id
      });

      return trade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoingTrades'] });
      toast.success('Trade offer sent!');
      onClose();
    },
    onError: () => {
      toast.error('Failed to create trade offer');
    }
  });

  const addItemToOffer = (side) => {
    const items = side === 'initiator' ? initiatorOffer.items : recipientOffer.items;
    const newItems = [...items, { item_id: '', item_name: '', quantity: 1 }];
    
    if (side === 'initiator') {
      setInitiatorOffer({ ...initiatorOffer, items: newItems });
    } else {
      setRecipientOffer({ ...recipientOffer, items: newItems });
    }
  };

  const removeItemFromOffer = (side, index) => {
    const items = side === 'initiator' ? initiatorOffer.items : recipientOffer.items;
    const newItems = items.filter((_, i) => i !== index);
    
    if (side === 'initiator') {
      setInitiatorOffer({ ...initiatorOffer, items: newItems });
    } else {
      setRecipientOffer({ ...recipientOffer, items: newItems });
    }
  };

  const updateItemInOffer = (side, index, field, value) => {
    const items = side === 'initiator' ? [...initiatorOffer.items] : [...recipientOffer.items];
    items[index] = { ...items[index], [field]: value };
    
    if (field === 'item_id') {
      const selectedItem = myItems.find(item => item.id === value);
      if (selectedItem) {
        items[index].item_name = selectedItem.name;
      }
    }
    
    if (side === 'initiator') {
      setInitiatorOffer({ ...initiatorOffer, items });
    } else {
      setRecipientOffer({ ...recipientOffer, items });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!recipientId) {
      toast.error('Please select a recipient');
      return;
    }

    const recipient = allPlayers.find(p => p.id === recipientId);

    createTradeMutation.mutate({
      initiator_id: playerData.id,
      initiator_username: playerData.username,
      recipient_id: recipientId,
      recipient_username: recipient.username,
      trade_type: tradeType,
      initiator_offer: initiatorOffer,
      recipient_offer: recipientOffer,
      message: message,
      status: 'pending'
    });
  };

  const otherPlayers = allPlayers.filter(p => p.id !== playerData.id);

  return (
    <Card className="glass-panel border-purple-500/30 mb-6">
      <CardHeader className="border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-purple-400" />
            Create Trade Proposal
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Trade With</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                {otherPlayers.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.username} - Level {player.level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Offer */}
            <div className="space-y-4 p-4 bg-purple-900/10 rounded-lg border border-purple-500/20">
              <h3 className="text-white font-semibold flex items-center gap-2">
                Your Offer
                <Badge className="bg-purple-600">You</Badge>
              </h3>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300 text-sm">Items</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addItemToOffer('initiator')}
                    className="border-purple-500/30"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                {initiatorOffer.items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Select 
                      value={item.item_id}
                      onValueChange={(value) => updateItemInOffer('initiator', index, 'item_id', value)}
                    >
                      <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {myItems.map(myItem => (
                          <SelectItem key={myItem.id} value={myItem.id}>
                            {myItem.name} (x{myItem.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemInOffer('initiator', index, 'quantity', parseInt(e.target.value))}
                      className="w-20 bg-slate-900/50 border-purple-500/20 text-white"
                      placeholder="Qty"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItemFromOffer('initiator', index)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Cryptocurrency</Label>
                <Input
                  type="number"
                  min="0"
                  value={initiatorOffer.crypto}
                  onChange={(e) => setInitiatorOffer({ ...initiatorOffer, crypto: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-purple-500/20 text-white"
                  placeholder="Amount"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Buy Power</Label>
                <Input
                  type="number"
                  min="0"
                  value={initiatorOffer.buy_power}
                  onChange={(e) => setInitiatorOffer({ ...initiatorOffer, buy_power: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-purple-500/20 text-white"
                  placeholder="Amount"
                />
              </div>

              {/* Service */}
              {tradeType === 'service' || tradeType === 'mixed' ? (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Service Offered</Label>
                  <Textarea
                    value={initiatorOffer.service_description}
                    onChange={(e) => setInitiatorOffer({ ...initiatorOffer, service_description: e.target.value })}
                    className="bg-slate-900/50 border-purple-500/20 text-white"
                    placeholder="Describe the service..."
                    rows={3}
                  />
                </div>
              ) : null}
            </div>

            {/* Recipient Request */}
            <div className="space-y-4 p-4 bg-cyan-900/10 rounded-lg border border-cyan-500/20">
              <h3 className="text-white font-semibold flex items-center gap-2">
                Requesting
                <Badge className="bg-cyan-600">From Them</Badge>
              </h3>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Cryptocurrency</Label>
                <Input
                  type="number"
                  min="0"
                  value={recipientOffer.crypto}
                  onChange={(e) => setRecipientOffer({ ...recipientOffer, crypto: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                  placeholder="Amount"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Buy Power</Label>
                <Input
                  type="number"
                  min="0"
                  value={recipientOffer.buy_power}
                  onChange={(e) => setRecipientOffer({ ...recipientOffer, buy_power: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                  placeholder="Amount"
                />
              </div>

              {/* Service */}
              {tradeType === 'service' || tradeType === 'mixed' ? (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Service Requested</Label>
                  <Textarea
                    value={recipientOffer.service_description}
                    onChange={(e) => setRecipientOffer({ ...recipientOffer, service_description: e.target.value })}
                    className="bg-slate-900/50 border-cyan-500/20 text-white"
                    placeholder="Describe what you need..."
                    rows={3}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-gray-300">Trade Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-slate-900/50 border-purple-500/20 text-white"
              placeholder="Add a message to your trade offer..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-between items-center pt-4 border-t border-purple-500/20">
            <p className="text-xs text-gray-400">
              Transaction Fee: <span className="text-white font-semibold">50 💰</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!recipientId || createTradeMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-cyan-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Trade Offer
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}