import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, MapPin, TrendingUp, Building2, Filter,
  Send, Trash2, Edit, Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function ItemInventory({ items = [], playerData, enterprises, territories }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');
  const queryClient = useQueryClient();

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => base44.entities.Item.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allItems'] });
      toast.success('Item deleted');
    },
    onError: () => {
      toast.error('Failed to delete item');
    }
  });

  const moveItemMutation = useMutation({
    mutationFn: ({ itemId, newLocation, newOwnerType }) => 
      base44.entities.Item.update(itemId, { 
        location: newLocation,
        owner_type: newOwnerType
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allItems'] });
      toast.success('Item moved successfully');
    },
    onError: () => {
      toast.error('Failed to move item');
    }
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.item_type === filterType;
    const matchesRarity = filterRarity === 'all' || item.rarity === filterRarity;
    return matchesSearch && matchesType && matchesRarity;
  });

  const getRarityColor = (rarity) => {
    const colors = {
      legendary: 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400',
      epic: 'bg-purple-600/20 border-purple-500/50 text-purple-400',
      rare: 'bg-blue-600/20 border-blue-500/50 text-blue-400',
      uncommon: 'bg-green-600/20 border-green-500/50 text-green-400',
      common: 'bg-gray-600/20 border-gray-500/50 text-gray-400'
    };
    return colors[rarity] || colors.common;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-purple-500/20 text-white"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 bg-slate-900/50 border-purple-500/20 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="weapon">Weapon</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="contraband">Contraband</SelectItem>
                <SelectItem value="vehicle_part">Vehicle Part</SelectItem>
                <SelectItem value="intel">Intel</SelectItem>
                <SelectItem value="blueprint">Blueprint</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRarity} onValueChange={setFilterRarity}>
              <SelectTrigger className="w-40 bg-slate-900/50 border-purple-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="common">Common</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <Card key={item.id} className={`glass-panel border ${getRarityColor(item.rarity)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-lg">{item.name}</CardTitle>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{item.item_type.replace('_', ' ')}</p>
                </div>
                <Badge className={`${
                  item.rarity === 'legendary' ? 'bg-yellow-600' :
                  item.rarity === 'epic' ? 'bg-purple-600' :
                  item.rarity === 'rare' ? 'bg-blue-600' :
                  item.rarity === 'uncommon' ? 'bg-green-600' : 'bg-gray-600'
                }`}>
                  {item.rarity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">Quantity</p>
                  <p className="text-white font-semibold">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-gray-400">Value</p>
                  <p className="text-green-400 font-semibold">${item.current_market_value}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Value</p>
                  <p className="text-green-400 font-semibold">
                    ${((item.current_market_value || 0) * (item.quantity || 1)).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Tradeable</p>
                  <p className={item.is_tradeable ? 'text-green-400' : 'text-red-400'}>
                    {item.is_tradeable ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {item.location && (
                <div className="flex items-center gap-2 text-xs text-gray-400 p-2 bg-slate-900/50 rounded">
                  <MapPin className="w-3 h-3" />
                  <span>Location: {item.location}</span>
                </div>
              )}

              {item.owner_type === 'player' && item.quantity > 0 && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteItemMutation.mutate(item.id)}
                    disabled={deleteItemMutation.isPending}
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No items found matching your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}