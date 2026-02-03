import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const enterpriseTypes = [
  { value: 'marijuana_farm', label: 'Marijuana Farm', cost: 50000, description: 'Grow and distribute cannabis' },
  { value: 'chop_shop', label: 'Chop Shop', cost: 75000, description: 'Steal and dismantle vehicles' },
  { value: 'money_laundering', label: 'Money Laundering', cost: 100000, description: 'Clean dirty money' },
  { value: 'material_production', label: 'Material Production', cost: 60000, description: 'Produce raw materials' },
  { value: 'weapons_cache', label: 'Weapons Cache', cost: 80000, description: 'Store and distribute weapons' },
  { value: 'arms_manufacturing', label: 'Arms Manufacturing', cost: 150000, description: 'Manufacture illegal weapons', heat: 15 },
  { value: 'counterfeiting_operation', label: 'Counterfeiting Operation', cost: 120000, description: 'Produce counterfeit currency and documents', heat: 12 },
  { value: 'human_trafficking_ring', label: 'Human Trafficking Ring', cost: 200000, description: 'High-risk, high-reward operation', heat: 25 }
];

export default function CreateEnterpriseDialog({ open, onOpenChange, playerData }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('marijuana_farm');
  const queryClient = useQueryClient();

  const selectedType = enterpriseTypes.find(t => t.value === type);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name) throw new Error('Enterprise name required');
      
      const cost = selectedType.cost;
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });

      const enterprise = await base44.entities.CriminalEnterprise.create({
        name,
        type,
        owner_id: playerData.id,
        crew_id: playerData.crew_id,
        level: 1,
        production_rate: 100,
        storage_capacity: 1000,
        current_stock: 0,
        heat_level: selectedType.heat || 0,
        security_level: 1,
        is_active: true,
        total_revenue: 0,
        specialized_equipment: type === 'arms_manufacturing' || type === 'counterfeiting_operation' ? [] : undefined,
        security_measures: [],
        alliance_status: 'neutral'
      });

      if (playerData.crew_id) {
        await base44.entities.CrewActivity.create({
          crew_id: playerData.crew_id,
          activity_type: 'heist_completed',
          title: 'New Enterprise Created',
          description: `${name} (${selectedType.label}) is now operational`,
          player_id: playerData.id,
          player_username: playerData.username
        });
      }

      return enterprise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterprises']);
      queryClient.invalidateQueries(['player']);
      toast.success('Enterprise created successfully!');
      setName('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-purple-500/20 max-w-md" aria-describedby="enterprise-description">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Enterprise</DialogTitle>
          <p id="enterprise-description" className="text-gray-400 text-sm">
            Establish a new criminal operation to generate income
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Enterprise Name</Label>
            <Input
              id="name"
              placeholder="Enter name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900/50 border-purple-500/20 text-white mt-2"
            />
          </div>

          <div>
            <Label htmlFor="type" className="text-white">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enterpriseTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label} - ${t.cost.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/20">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Cost</span>
              <span className="text-red-400 font-semibold">
                ${selectedType.cost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Your Balance</span>
              <span className="text-green-400 font-semibold">
                ${(playerData?.crypto_balance || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name || playerData?.crypto_balance < selectedType.cost}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create Enterprise`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}