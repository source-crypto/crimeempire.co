import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Package, Plus, TrendingUp, Star, Boxes, Building2, 
  MapPin, Factory, Users, Send, Sparkles
} from 'lucide-react';
import CreateItemDialog from '../components/items/CreateItemDialog';
import ItemInventory from '../components/items/ItemInventory';
import ItemDistributor from '../components/items/ItemDistributor';
import ItemMarketDistributor from '../components/items/ItemMarketDistributor';
import { toast } from 'sonner';

export default function ItemsCenter() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: () => base44.entities.Player.filter({ created_by: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0]
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['allItems', playerData?.id],
    queryFn: () => base44.entities.Item.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: async () => {
      if (!playerData?.id) return [];
      const data = await base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id });
      return data || [];
    },
    enabled: !!playerData?.id
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories', playerData?.crew_id],
    queryFn: async () => {
      if (!playerData?.crew_id) return [];
      const data = await base44.entities.Territory.filter({ owner_crew_id: playerData.crew_id });
      return data || [];
    },
    enabled: !!playerData?.crew_id
  });

  const categorizedItems = {
    weapon: allItems.filter(i => i.item_type === 'weapon'),
    equipment: allItems.filter(i => i.item_type === 'equipment'),
    material: allItems.filter(i => i.item_type === 'material'),
    contraband: allItems.filter(i => i.item_type === 'contraband'),
    vehicle_part: allItems.filter(i => i.item_type === 'vehicle_part'),
    intel: allItems.filter(i => i.item_type === 'intel'),
    blueprint: allItems.filter(i => i.item_type === 'blueprint')
  };

  const totalValue = allItems.reduce((sum, item) => sum + (item.current_market_value || 0) * (item.quantity || 1), 0);
  const rarityCount = {
    legendary: allItems.filter(i => i.rarity === 'legendary').length,
    epic: allItems.filter(i => i.rarity === 'epic').length,
    rare: allItems.filter(i => i.rarity === 'rare').length,
    uncommon: allItems.filter(i => i.rarity === 'uncommon').length,
    common: allItems.filter(i => i.rarity === 'common').length
  };

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading Items Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Items Center
          </h1>
          <p className="text-gray-400 mt-1">Manage inventory, create items, and distribute resources</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Item
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <Boxes className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Items</p>
                <p className="text-2xl font-bold text-white">{allItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Legendary</p>
                <p className="text-2xl font-bold text-white">{rarityCount.legendary}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Locations</p>
                <p className="text-2xl font-bold text-white">{enterprises.length + territories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="glass-panel border-purple-500/20">
          <TabsTrigger value="inventory">
            <Boxes className="w-4 h-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="distribute">
            <Send className="w-4 h-4 mr-2" />
            Distribute
          </TabsTrigger>
          <TabsTrigger value="market">
            <TrendingUp className="w-4 h-4 mr-2" />
            Market
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Package className="w-4 h-4 mr-2" />
            By Category
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <ItemInventory 
            items={allItems}
            playerData={playerData}
            enterprises={enterprises}
            territories={territories}
          />
        </TabsContent>

        <TabsContent value="distribute" className="space-y-4">
          <ItemDistributor
            playerData={playerData}
            items={allItems}
            enterprises={enterprises}
            territories={territories}
          />
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <ItemMarketDistributor
            playerData={playerData}
            items={allItems}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {Object.entries(categorizedItems).map(([type, items]) => (
            <Card key={type} className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                  <Badge className="bg-purple-600">{items.length} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(item => (
                      <div 
                        key={item.id}
                        className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/20"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-white">{item.name}</h4>
                          <Badge className={`text-xs ${
                            item.rarity === 'legendary' ? 'bg-yellow-600' :
                            item.rarity === 'epic' ? 'bg-purple-600' :
                            item.rarity === 'rare' ? 'bg-blue-600' :
                            item.rarity === 'uncommon' ? 'bg-green-600' : 'bg-gray-600'
                          }`}>
                            {item.rarity}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>Quantity: <span className="text-white font-semibold">{item.quantity}</span></p>
                          <p>Value: <span className="text-green-400 font-semibold">${item.current_market_value}</span></p>
                          {item.location && (
                            <p className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">
                    No {type} items found
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <CreateItemDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        playerData={playerData}
        enterprises={enterprises}
        territories={territories}
      />
    </div>
  );
}