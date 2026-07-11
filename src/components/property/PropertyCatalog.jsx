import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PropertyCard from './PropertyCard';
import { PROPERTY_CATALOG } from './propertyData';
import { toast } from 'sonner';

export default function PropertyCatalog({ playerData, ownedNames }) {
  const queryClient = useQueryClient();

  const buyMutation = useMutation({
    mutationFn: async (item) => {
      if ((playerData.crypto_balance ?? 0) < item.purchase_price) throw new Error('Insufficient funds');
      await base44.entities.Property.create({
        name: item.name, property_type: item.property_type, district: item.district,
        owner_id: playerData.id, owner_name: playerData.username,
        purchase_price: item.purchase_price, market_value: item.purchase_price,
        income_per_hour: item.income_per_hour, upkeep_per_hour: item.upkeep_per_hour,
        condition: 100, happiness: 70, staff_count: item.staff_count, upgrade_level: 0,
        legitimacy: item.legitimacy, emoji: item.emoji,
        last_collected_at: new Date().toISOString(), acquired_at: new Date().toISOString(),
      });
      await base44.entities.Player.update(playerData.id, { crypto_balance: playerData.crypto_balance - item.purchase_price });
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries(['properties']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Acquired ${item.name}!`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {PROPERTY_CATALOG.map(item => {
        const owned = ownedNames?.includes(item.name);
        const canAfford = (playerData.crypto_balance ?? 0) >= item.purchase_price;
        return (
          <PropertyCard
            key={item.name}
            property={item}
            mode="catalog"
            disabled={buyMutation.isPending || owned || !canAfford}
            onBuy={() => buyMutation.mutate(item)}
          />
        );
      })}
    </div>
  );
}