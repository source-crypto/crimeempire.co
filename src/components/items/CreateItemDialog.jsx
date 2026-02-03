import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Sparkles } from 'lucide-react';

export default function CreateItemDialog({ open, onOpenChange, playerData, enterprises, territories }) {
  const [itemData, setItemData] = useState({
    name: '',
    item_type: 'material',
    category: 'materials',
    rarity: 'common',
    quantity: 1,
    base_value: 100,
    current_market_value: 100,
    owner_id: playerData?.id || '',
    owner_type: 'player',
    location: '',
    is_tradeable: true
  });

  const queryClient = useQueryClient();

  const createItemMutation = useMutation({
    mutationFn: async (data) => {
      const cost = data.base_value * data.quantity;
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      return base44.entities.Item.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allItems'] });
      queryClient.invalidateQueries({ queryKey: ['player'] });
      toast.success('Item created successfully');
      onOpenChange(false);
      setItemData({
        name: '',
        item_type: 'material',
        category: 'materials',
        rarity: 'common',
        quantity: 1,
        base_value: 100,
        current_market_value: 100,
        owner_id: playerData?.id || '',
        owner_type: 'player',
        location: '',
        is_tradeable: true
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create item');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createItemMutation.mutate({
      ...itemData,
      owner_id: playerData.id
    });
  };

  const totalCost = itemData.base_value * itemData.quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-purple-500/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Create New Item
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create items to use across your empire
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Item Name</Label>
              <Input
                value={itemData.name}
                onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
                placeholder="Enter item name"
                className="bg-slate-900/50 border-purple-500/20 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Item Type</Label>
              <Select
                value={itemData.item_type}
                onValueChange={(value) => setItemData({ ...itemData, item_type: value })}
              >
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weapon">Weapon</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="contraband">Contraband</SelectItem>
                  <SelectItem value="vehicle_part">Vehicle Part</SelectItem>
                  <SelectItem value="intel">Intel</SelectItem>
                  <SelectItem value="blueprint">Blueprint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Category</Label>
              <Select
                value={itemData.category}
                onValueChange={(value) => setItemData({ ...itemData, category: value })}
              >
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marijuana">Marijuana</SelectItem>
                  <SelectItem value="weapons">Weapons</SelectItem>
                  <SelectItem value="vehicles">Vehicles</SelectItem>
                  <SelectItem value="money">Money</SelectItem>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="intel">Intel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Rarity</Label>
              <Select
                value={itemData.rarity}
                onValueChange={(value) => setItemData({ ...itemData, rarity: value })}
              >
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Quantity</Label>
              <Input
                type="number"
                value={itemData.quantity}
                onChange={(e) => setItemData({ ...itemData, quantity: parseInt(e.target.value) || 1 })}
                min="1"
                className="bg-slate-900/50 border-purple-500/20 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Base Value</Label>
              <Input
                type="number"
                value={itemData.base_value}
                onChange={(e) => setItemData({ ...itemData, base_value: parseInt(e.target.value) || 100, current_market_value: parseInt(e.target.value) || 100 })}
                min="1"
                className="bg-slate-900/50 border-purple-500/20 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Owner Type</Label>
              <Select
                value={itemData.owner_type}
                onValueChange={(value) => setItemData({ ...itemData, owner_type: value, location: '' })}
              >
                <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="territory">Territory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {itemData.owner_type === 'enterprise' && enterprises.length > 0 && (
              <div>
                <Label className="text-gray-300">Enterprise Location</Label>
                <Select
                  value={itemData.location}
                  onValueChange={(value) => setItemData({ ...itemData, location: value })}
                >
                  <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                    <SelectValue placeholder="Select enterprise" />
                  </SelectTrigger>
                  <SelectContent>
                    {enterprises.map(ent => (
                      <SelectItem key={ent.id} value={ent.id}>{ent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {itemData.owner_type === 'territory' && territories.length > 0 && (
              <div>
                <Label className="text-gray-300">Territory Location</Label>
                <Select
                  value={itemData.location}
                  onValueChange={(value) => setItemData({ ...itemData, location: value })}
                >
                  <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {territories.map(terr => (
                      <SelectItem key={terr.id} value={terr.id}>{terr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Cost:</span>
              <span className="text-2xl font-bold text-white">${totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400 text-sm">Your Balance:</span>
              <span className={`text-sm font-semibold ${
                playerData.crypto_balance >= totalCost ? 'text-green-400' : 'text-red-400'
              }`}>
                ${playerData.crypto_balance.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-purple-500/30"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createItemMutation.isPending || playerData.crypto_balance < totalCost || !itemData.name}
              className="bg-gradient-to-r from-purple-600 to-cyan-600"
            >
              {createItemMutation.isPending ? 'Creating...' : `Create Item ($${totalCost.toLocaleString()})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}