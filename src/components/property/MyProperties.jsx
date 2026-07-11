import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PropertyCard from './PropertyCard';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

function accruedIncome(p) {
  const last = new Date(p.last_collected_at || p.acquired_at || Date.now());
  const hours = Math.max(0, (Date.now() - last.getTime()) / 3600000);
  const condMult = (p.condition ?? 100) / 100;
  const happyMult = (p.happiness ?? 70) / 70;
  return Math.round((p.income_per_hour || 0) * hours * condMult * happyMult);
}

export default function MyProperties({ playerData }) {
  const queryClient = useQueryClient();
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', playerData?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: playerData.id }, '-acquired_at', 50),
    enabled: !!playerData?.id,
  });

  const collectMutation = useMutation({
    mutationFn: async (p) => {
      const accrued = accruedIncome(p);
      await base44.entities.Player.update(playerData.id, { crypto_balance: playerData.crypto_balance + accrued });
      await base44.entities.Property.update(p.id, { last_collected_at: new Date().toISOString(), condition: Math.max(0, (p.condition ?? 100) - 2) });
      return { name: p.name, accrued };
    },
    onSuccess: ({ name, accrued }) => {
      queryClient.invalidateQueries(['properties']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Collected $${accrued.toLocaleString()} from ${name}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const repairMutation = useMutation({
    mutationFn: async (p) => {
      const cost = Math.round((100 - (p.condition ?? 100)) * 250);
      if ((playerData.crypto_balance ?? 0) < cost) throw new Error('Insufficient funds for repairs');
      await base44.entities.Player.update(playerData.id, { crypto_balance: playerData.crypto_balance - cost });
      await base44.entities.Property.update(p.id, { condition: 100 });
      return { name: p.name, cost };
    },
    onSuccess: ({ name, cost }) => {
      queryClient.invalidateQueries(['properties']);
      queryClient.invalidateQueries(['player']);
      toast.success(`${name} restored for $${cost.toLocaleString()}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const sellMutation = useMutation({
    mutationFn: async (p) => {
      const proceeds = Math.round((p.market_value || p.purchase_price) * 0.9);
      await base44.entities.Player.update(playerData.id, { crypto_balance: playerData.crypto_balance + proceeds });
      await base44.entities.Property.delete(p.id);
      return { name: p.name, proceeds };
    },
    onSuccess: ({ name, proceeds }) => {
      queryClient.invalidateQueries(['properties']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Sold ${name} for $${proceeds.toLocaleString()}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
  if (properties.length === 0) return (
    <Card className="glass-panel border-purple-500/20">
      <CardContent className="p-12 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-40" />
        <h3 className="text-xl font-bold text-white mb-2">No Properties Owned</h3>
        <p className="text-gray-400">Acquire property from the Market tab to start building your empire.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map(p => (
        <PropertyCard
          key={p.id}
          property={p}
          mode="owned"
          accrued={accruedIncome(p)}
          disabled={collectMutation.isPending || repairMutation.isPending || sellMutation.isPending}
          onCollect={() => collectMutation.mutate(p)}
          onRepair={() => repairMutation.mutate(p)}
          onSell={() => sellMutation.mutate(p)}
        />
      ))}
    </div>
  );
}