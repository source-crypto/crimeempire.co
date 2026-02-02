import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, Shield, Globe, Briefcase, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const expansionTypes = {
  new_location: {
    icon: Building2,
    label: 'New Location',
    desc: 'Open additional branch',
    baseCost: 250000,
    benefits: { capacity_bonus: 30000, efficiency_bonus: 0 }
  },
  security_upgrade: {
    icon: Shield,
    label: 'Security Upgrade',
    desc: 'Enhanced security systems',
    baseCost: 150000,
    benefits: { suspicion_reduction: 15, heat_reduction: 10 }
  },
  network_expansion: {
    icon: Globe,
    label: 'Network Expansion',
    desc: 'Expand laundering network',
    baseCost: 200000,
    benefits: { capacity_bonus: 20000, efficiency_bonus: 5 }
  },
  offshore_account: {
    icon: Briefcase,
    label: 'Offshore Account',
    desc: 'International banking access',
    baseCost: 400000,
    benefits: { suspicion_reduction: 20, efficiency_bonus: 8 }
  },
  legal_protection: {
    icon: Scale,
    label: 'Legal Protection',
    desc: 'Hire legal team',
    baseCost: 300000,
    benefits: { suspicion_reduction: 25, heat_reduction: 15 }
  }
};

export default function BusinessExpansionPanel({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  const { data: expansions = [] } = useQuery({
    queryKey: ['businessExpansions', playerData?.id],
    queryFn: () => base44.entities.BusinessExpansion.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const startExpansionMutation = useMutation({
    mutationFn: async ({ business, expansionType }) => {
      const expansion = expansionTypes[expansionType];
      if (playerData.balance < expansion.baseCost) throw new Error('Insufficient funds');

      await base44.entities.BusinessExpansion.create({
        business_id: business.id,
        player_id: playerData.id,
        expansion_type: expansionType,
        expansion_name: `${business.business_name} - ${expansion.label}`,
        cost: expansion.baseCost,
        construction_time_hours: 48,
        benefits: expansion.benefits,
        started_at: new Date().toISOString()
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - expansion.baseCost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessExpansions']);
      queryClient.invalidateQueries(['player']);
      toast.success('Expansion started!');
    },
    onError: (error) => toast.error(error.message)
  });

  const completeExpansionMutation = useMutation({
    mutationFn: async (expansion) => {
      const business = businesses.find(b => b.id === expansion.business_id);
      
      const updates = {
        capacity_per_hour: business.capacity_per_hour + (expansion.benefits.capacity_bonus || 0),
        efficiency: Math.min(100, business.efficiency + (expansion.benefits.efficiency_bonus || 0)),
        suspicion_level: Math.max(0, business.suspicion_level - (expansion.benefits.suspicion_reduction || 0)),
        heat_generation: Math.max(0, business.heat_generation - (expansion.benefits.heat_reduction || 0))
      };

      await base44.entities.MoneyLaunderingBusiness.update(business.id, updates);

      await base44.entities.BusinessExpansion.update(expansion.id, {
        status: 'active',
        completed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessExpansions']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      toast.success('Expansion completed!');
    }
  });

  const activeExpansions = expansions.filter(e => e.status === 'under_construction');
  const completedExpansions = expansions.filter(e => e.status === 'active');

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Building2 className="w-4 h-4 text-blue-400" />
            Business Expansion
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          Expand operations to increase capacity, reduce risk, and improve efficiency
        </CardContent>
      </Card>

      {/* Select Business */}
      {businesses.length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Select Business to Expand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {businesses.map(business => {
                const businessExpansions = completedExpansions.filter(e => e.business_id === business.id);
                
                return (
                  <button
                    key={business.id}
                    onClick={() => setSelectedBusiness(business)}
                    className={`p-2 rounded border-2 transition-all text-xs ${
                      selectedBusiness?.id === business.id
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-700 bg-slate-800/50 hover:border-gray-600'
                    }`}
                  >
                    <p className="text-white font-semibold">{business.business_name}</p>
                    <p className="text-gray-400 text-[10px]">{businessExpansions.length} expansions</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expansion Options */}
      {selectedBusiness && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(expansionTypes).map(([type, expansion]) => {
            const Icon = expansion.icon;
            const hasExpansion = completedExpansions.some(
              e => e.business_id === selectedBusiness.id && e.expansion_type === type
            );

            return (
              <Card key={type} className={`glass-panel ${hasExpansion ? 'border-green-500/20 opacity-60' : 'border-blue-500/20'}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-white text-xs font-semibold">{expansion.label}</p>
                      <p className="text-gray-400 text-[10px]">{expansion.desc}</p>
                    </div>
                    {hasExpansion && (
                      <Badge className="bg-green-600 text-[10px]">Active</Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-[10px]">
                    {expansion.benefits.capacity_bonus && (
                      <p className="text-blue-400">+${(expansion.benefits.capacity_bonus / 1000).toFixed(0)}k capacity/hr</p>
                    )}
                    {expansion.benefits.efficiency_bonus && (
                      <p className="text-green-400">+{expansion.benefits.efficiency_bonus}% efficiency</p>
                    )}
                    {expansion.benefits.suspicion_reduction && (
                      <p className="text-purple-400">-{expansion.benefits.suspicion_reduction} suspicion</p>
                    )}
                    {expansion.benefits.heat_reduction && (
                      <p className="text-cyan-400">-{expansion.benefits.heat_reduction} heat/transaction</p>
                    )}
                  </div>

                  <Button
                    onClick={() => startExpansionMutation.mutate({ business: selectedBusiness, expansionType: type })}
                    disabled={hasExpansion || startExpansionMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    {hasExpansion ? 'Already Active' : `Expand ($${(expansion.baseCost / 1000).toFixed(0)}k)`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active Expansions */}
      {activeExpansions.length > 0 && (
        <Card className="glass-panel border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Under Construction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeExpansions.map(expansion => {
              const timeElapsed = Date.now() - new Date(expansion.started_at).getTime();
              const timeLimit = expansion.construction_time_hours * 60 * 60 * 1000;
              const progress = Math.min(100, (timeElapsed / timeLimit) * 100);

              return (
                <motion.div
                  key={expansion.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-slate-900/50 rounded"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-xs">{expansion.expansion_name}</p>
                    <Badge className="bg-yellow-600 text-[10px]">{Math.round(progress)}%</Badge>
                  </div>
                  <Progress value={progress} className="h-1.5 mb-2" />
                  <Button
                    onClick={() => completeExpansionMutation.mutate(expansion)}
                    disabled={progress < 100 || completeExpansionMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-xs"
                  >
                    {progress >= 100 ? 'Complete Expansion' : `${Math.round((100 - progress) / 2)}h remaining`}
                  </Button>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}