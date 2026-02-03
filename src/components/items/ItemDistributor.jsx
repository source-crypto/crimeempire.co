import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Send, Package, Building2, MapPin, Factory, 
  TrendingUp, Users, Sparkles, Brain
} from 'lucide-react';
import { toast } from 'sonner';

export default function ItemDistributor({ playerData, items = [], enterprises = [], territories = [] }) {
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [targetType, setTargetType] = useState('enterprise');
  const [targetId, setTargetId] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  
  const queryClient = useQueryClient();

  const getAISuggestionsMutation = useMutation({
    mutationFn: async () => {
      const item = items.find(i => i.id === selectedItem);
      if (!item) throw new Error('Select an item first');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `As a criminal empire strategist, analyze this item distribution:
        
Item: ${item.name}
Type: ${item.item_type}
Rarity: ${item.rarity}
Available Quantity: ${item.quantity}
Market Value: $${item.current_market_value}

Player Assets:
- Enterprises: ${enterprises.length} (${enterprises.map(e => e.type).join(', ')})
- Territories: ${territories.length} 
- Balance: $${playerData.crypto_balance}

Recommend:
1. Best distribution targets (enterprises or territories)
2. Optimal quantities to distribute
3. Expected impact on operations
4. Strategic timing
5. Risk assessment

Be specific and tactical.`,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  target_type: { type: 'string' },
                  target_name: { type: 'string' },
                  target_id: { type: 'string' },
                  quantity: { type: 'number' },
                  reasoning: { type: 'string' },
                  expected_impact: { type: 'string' },
                  priority: { type: 'number' }
                }
              }
            },
            strategic_analysis: { type: 'string' },
            risk_level: { type: 'number' },
            timing_advice: { type: 'string' }
          }
        }
      });

      return response;
    },
    onSuccess: (data) => {
      setAiSuggestions(data);
      toast.success('AI analysis complete');
    },
    onError: () => {
      toast.error('Failed to generate suggestions');
    }
  });

  const distributeItemMutation = useMutation({
    mutationFn: async ({ itemId, targetType, targetId, quantity }) => {
      const item = items.find(i => i.id === itemId);
      if (!item || item.quantity < quantity) {
        throw new Error('Insufficient quantity');
      }

      // Update original item quantity
      await base44.entities.Item.update(itemId, {
        quantity: item.quantity - quantity
      });

      // Create new item at target location
      await base44.entities.Item.create({
        name: item.name,
        item_type: item.item_type,
        category: item.category,
        rarity: item.rarity,
        quantity: quantity,
        base_value: item.base_value,
        current_market_value: item.current_market_value,
        owner_id: playerData.id,
        owner_type: targetType,
        location: targetId,
        is_tradeable: item.is_tradeable,
        metadata: { ...item.metadata, distributed_from: itemId }
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allItems'] });
      toast.success('Items distributed successfully');
      setSelectedItem('');
      setQuantity(1);
      setTargetId('');
    },
    onError: (error) => {
      toast.error(error.message || 'Distribution failed');
    }
  });

  const selectedItemData = items.find(i => i.id === selectedItem);
  const canDistribute = selectedItem && targetId && quantity > 0 && 
                        selectedItemData?.quantity >= quantity;

  return (
    <div className="space-y-4">
      {/* Distribution Form */}
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader className="border-b border-cyan-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-400" />
            Distribute Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Select Item</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="Choose item to distribute" />
                </SelectTrigger>
                <SelectContent>
                  {items.filter(i => i.quantity > 0).map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                max={selectedItemData?.quantity || 1}
                className="bg-slate-900/50 border-purple-500/20 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Target Type</Label>
              <Select value={targetType} onValueChange={(val) => { setTargetType(val); setTargetId(''); }}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="territory">Territory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Target Location</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {targetType === 'enterprise' && enterprises.map(ent => (
                    <SelectItem key={ent.id} value={ent.id}>
                      <Building2 className="w-3 h-3 inline mr-1" />
                      {ent.name}
                    </SelectItem>
                  ))}
                  {targetType === 'territory' && territories.map(terr => (
                    <SelectItem key={terr.id} value={terr.id}>
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {terr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedItemData && (
            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Item: {selectedItemData.name}</span>
                <Badge className="bg-cyan-600">{selectedItemData.rarity}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-400">Available: {selectedItemData.quantity}</span>
                <span className="text-green-400">Value: ${selectedItemData.current_market_value}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => getAISuggestionsMutation.mutate()}
              disabled={!selectedItem || getAISuggestionsMutation.isPending}
              variant="outline"
              className="flex-1 border-purple-500/30"
            >
              {getAISuggestionsMutation.isPending ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get AI Suggestions
                </>
              )}
            </Button>
            
            <Button
              onClick={() => distributeItemMutation.mutate({ 
                itemId: selectedItem, 
                targetType, 
                targetId, 
                quantity 
              })}
              disabled={!canDistribute || distributeItemMutation.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              {distributeItemMutation.isPending ? 'Distributing...' : 'Distribute Items'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <Card className="glass-panel border-purple-500/30">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Strategic Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <p className="text-sm text-gray-300">{aiSuggestions.strategic_analysis}</p>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-gray-400">Risk Level:</span>
                <span className={`font-semibold ${
                  aiSuggestions.risk_level < 40 ? 'text-green-400' :
                  aiSuggestions.risk_level < 70 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {aiSuggestions.risk_level}%
                </span>
              </div>
              <p className="text-xs text-cyan-400 mt-2">⏰ {aiSuggestions.timing_advice}</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Distribution Recommendations:</h4>
              {aiSuggestions.recommendations?.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-white flex items-center gap-2">
                      {rec.target_type === 'enterprise' ? (
                        <Building2 className="w-4 h-4 text-purple-400" />
                      ) : (
                        <MapPin className="w-4 h-4 text-cyan-400" />
                      )}
                      {rec.target_name}
                    </h5>
                    <Badge className="bg-purple-600">Priority: {rec.priority}</Badge>
                  </div>

                  <div className="text-xs">
                    <p className="text-gray-400">
                      <strong className="text-white">Quantity:</strong> {rec.quantity}
                    </p>
                    <p className="text-gray-400 mt-1">{rec.reasoning}</p>
                    <p className="text-green-400 mt-1">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      {rec.expected_impact}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetType(rec.target_type);
                      setTargetId(rec.target_id);
                      setQuantity(rec.quantity);
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    Apply This Recommendation
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}