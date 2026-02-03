import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sword, Shield, Zap, Wrench, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export default function EquipmentSystem({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: equippedItems = [] } = useQuery({
    queryKey: ['playerEquipment', playerData?.id],
    queryFn: () => base44.entities.PlayerEquipment.filter({ 
      player_id: playerData.id,
      is_equipped: true
    }),
    enabled: !!playerData?.id
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['playerInventory', playerData?.id],
    queryFn: () => base44.entities.Item.filter({ 
      owner_id: playerData.id,
      owner_type: 'player',
      item_type: ['weapon', 'equipment']
    }),
    enabled: !!playerData?.id
  });

  const equipItemMutation = useMutation({
    mutationFn: async ({ item, slot }) => {
      // Unequip current item in slot
      const currentEquipped = equippedItems.find(e => e.equipment_slot === slot);
      if (currentEquipped) {
        await base44.entities.PlayerEquipment.update(currentEquipped.id, {
          is_equipped: false
        });
      }

      // Check if item already has equipment record
      const existingEquip = equippedItems.find(e => e.item_id === item.id);
      if (existingEquip) {
        await base44.entities.PlayerEquipment.update(existingEquip.id, {
          is_equipped: true,
          equipment_slot: slot
        });
      } else {
        await base44.entities.PlayerEquipment.create({
          player_id: playerData.id,
          item_id: item.id,
          equipment_slot: slot,
          item_name: item.name,
          item_type: item.item_type,
          stat_bonuses: item.metadata?.stat_bonuses || {},
          is_equipped: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playerEquipment']);
      toast.success('Item equipped');
    }
  });

  const upgradeEquipmentMutation = useMutation({
    mutationFn: async (equipment) => {
      const upgradeCost = (equipment.upgrade_level + 1) * 5000;
      if (playerData.crypto_balance < upgradeCost) {
        throw new Error('Insufficient funds');
      }

      const newBonuses = {};
      Object.entries(equipment.stat_bonuses || {}).forEach(([stat, value]) => {
        newBonuses[stat] = value + 1;
      });

      await base44.entities.PlayerEquipment.update(equipment.id, {
        upgrade_level: equipment.upgrade_level + 1,
        stat_bonuses: newBonuses
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - upgradeCost
      });

      return upgradeCost;
    },
    onSuccess: (cost) => {
      queryClient.invalidateQueries(['playerEquipment']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Upgraded! Cost: $${cost.toLocaleString()}`);
    },
    onError: (error) => toast.error(error.message)
  });

  const slotIcons = {
    weapon: Sword,
    armor: Shield,
    accessory_1: Zap,
    accessory_2: Zap,
    vehicle: Wrench
  };

  const rarityColors = {
    common: 'bg-gray-600',
    uncommon: 'bg-green-600',
    rare: 'bg-blue-600',
    epic: 'bg-purple-600',
    legendary: 'bg-orange-600'
  };

  const getTotalBonuses = () => {
    const totals = {};
    equippedItems.forEach(eq => {
      Object.entries(eq.stat_bonuses || {}).forEach(([stat, value]) => {
        totals[stat] = (totals[stat] || 0) + value;
      });
    });
    return totals;
  };

  const totalBonuses = getTotalBonuses();

  return (
    <div className="space-y-6">
      {/* Equipment Overview */}
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Total Equipment Bonuses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(totalBonuses).map(([stat, value]) => (
              <div key={stat} className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/20">
                <div className="text-xs text-gray-400 capitalize">{stat}</div>
                <div className="text-lg font-bold text-cyan-400">+{value}</div>
              </div>
            ))}
            {Object.keys(totalBonuses).length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-4">
                No equipment bonuses yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="equipped" className="space-y-4">
        <TabsList className="glass-panel border-purple-500/20">
          <TabsTrigger value="equipped">Equipped</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Equipped Items */}
        <TabsContent value="equipped" className="space-y-3">
          {Object.keys(slotIcons).map((slot) => {
            const equipment = equippedItems.find(e => e.equipment_slot === slot);
            const Icon = slotIcons[slot];

            return (
              <Card key={slot} className="glass-panel border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 capitalize">{slot.replace('_', ' ')}</div>
                        {equipment ? (
                          <div className="text-white font-semibold">{equipment.item_name}</div>
                        ) : (
                          <div className="text-gray-500 text-sm">Empty Slot</div>
                        )}
                      </div>
                    </div>
                    {equipment && (
                      <Badge className="bg-purple-600">+{equipment.upgrade_level}</Badge>
                    )}
                  </div>

                  {equipment && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Durability</span>
                        <span className="text-white">{equipment.durability}%</span>
                      </div>
                      <Progress value={equipment.durability} className="h-2" />

                      {equipment.stat_bonuses && Object.keys(equipment.stat_bonuses).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(equipment.stat_bonuses).map(([stat, value]) => (
                            <Badge key={stat} variant="outline" className="text-xs">
                              +{value} {stat}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="w-full bg-cyan-600 hover:bg-cyan-700"
                        onClick={() => upgradeEquipmentMutation.mutate(equipment)}
                        disabled={upgradeEquipmentMutation.isPending}
                      >
                        <Wrench className="w-3 h-3 mr-2" />
                        Upgrade (${((equipment.upgrade_level + 1) * 5000).toLocaleString()})
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory" className="space-y-3">
          {inventory.length === 0 ? (
            <Card className="glass-panel border-purple-500/20">
              <CardContent className="p-8 text-center">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">No equipment in inventory</p>
              </CardContent>
            </Card>
          ) : (
            inventory.map((item) => (
              <Card key={item.id} className="glass-panel border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white font-semibold">{item.name}</h4>
                        <Badge className={rarityColors[item.rarity]}>{item.rarity}</Badge>
                      </div>
                      
                      {item.metadata?.stat_bonuses && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Object.entries(item.metadata.stat_bonuses).map(([stat, value]) => (
                            <Badge key={stat} variant="outline" className="text-xs">
                              +{value} {stat}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-gray-400">
                        Value: ${item.base_value?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {['weapon', 'armor', 'accessory_1', 'accessory_2', 'vehicle'].map((slot) => (
                        <Button
                          key={slot}
                          size="sm"
                          variant="outline"
                          onClick={() => equipItemMutation.mutate({ item, slot })}
                          disabled={equipItemMutation.isPending}
                          className="text-xs"
                        >
                          {slot.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}