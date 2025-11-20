import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Shield, Package, Eye, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const developmentTypes = {
  defense_turret: { icon: Shield, label: 'Defense Turret', cost: 5000, benefit: 'defense' },
  black_market: { icon: Package, label: 'Black Market', cost: 7500, benefit: 'revenue' },
  safe_house: { icon: Building, label: 'Safe House', cost: 6000, benefit: 'storage' },
  weapons_depot: { icon: Zap, label: 'Weapons Depot', cost: 8000, benefit: 'offense' },
  intel_network: { icon: Eye, label: 'Intel Network', cost: 7000, benefit: 'intel' },
  surveillance_system: { icon: Eye, label: 'Surveillance', cost: 6500, benefit: 'defense' }
};

export default function TerritoryDevelopmentSystem({ territory, playerData }) {
  const [selectedType, setSelectedType] = useState('black_market');
  const queryClient = useQueryClient();

  const { data: developments = [] } = useQuery({
    queryKey: ['territoryDevelopments', territory?.id],
    queryFn: () => base44.entities.TerritoryDevelopment.filter({ territory_id: territory.id }),
    enabled: !!territory
  });

  const buildDevelopmentMutation = useMutation({
    mutationFn: async (devType) => {
      const type = developmentTypes[devType];
      
      if (playerData.crypto_balance < type.cost) {
        throw new Error('Insufficient funds');
      }

      const development = await base44.entities.TerritoryDevelopment.create({
        territory_id: territory.id,
        territory_name: territory.name,
        development_type: devType,
        level: 1,
        construction_progress: 0,
        is_operational: false,
        built_by_crew_id: playerData.crew_id,
        maintenance_cost: Math.floor(type.cost * 0.1),
        benefits: {
          defense_bonus: devType.includes('defense') ? 20 : 0,
          revenue_bonus: devType === 'black_market' ? 0.15 : 0,
          intel_bonus: devType.includes('intel') ? 15 : 0,
          storage_bonus: devType === 'safe_house' ? 500 : 0
        },
        resources_generated: devType === 'black_market' ? [
          { resource_type: 'contraband', amount: 50, frequency: 'hourly' }
        ] : []
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - type.cost
      });

      return development;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryDevelopments']);
      queryClient.invalidateQueries(['player']);
      toast.success('Construction started!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const completeDevelopmentMutation = useMutation({
    mutationFn: async (dev) => {
      await base44.entities.TerritoryDevelopment.update(dev.id, {
        construction_progress: 100,
        is_operational: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['territoryDevelopments']);
      toast.success('Development completed!');
    }
  });

  if (!territory) {
    return null;
  }

  return (
    <Card className="glass-panel border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <Building className="w-5 h-5 text-cyan-400" />
          Territory Development
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Build New Development */}
        <div className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
          <h4 className="font-semibold text-white mb-3 text-sm">Build Development</h4>
          <div className="space-y-3">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-slate-900/50 border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(developmentTypes).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    {type.label} - ${type.cost.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
              onClick={() => buildDevelopmentMutation.mutate(selectedType)}
              disabled={buildDevelopmentMutation.isPending}
            >
              {buildDevelopmentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Build for $${developmentTypes[selectedType].cost.toLocaleString()}`
              )}
            </Button>
          </div>
        </div>

        {/* Active Developments */}
        <div>
          <h4 className="font-semibold text-white mb-2 text-sm">Active Developments</h4>
          {developments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No developments yet</p>
          ) : (
            <div className="space-y-2">
              {developments.map((dev) => {
                const DevIcon = developmentTypes[dev.development_type]?.icon || Building;
                
                return (
                  <div key={dev.id} className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DevIcon className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-white">
                          {developmentTypes[dev.development_type]?.label}
                        </span>
                      </div>
                      <Badge className={dev.is_operational ? 'bg-green-600' : 'bg-yellow-600'}>
                        Level {dev.level}
                      </Badge>
                    </div>

                    {!dev.is_operational && (
                      <>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Construction</span>
                            <span>{dev.construction_progress}%</span>
                          </div>
                          <Progress value={dev.construction_progress} className="h-2" />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-cyan-500/30 text-xs"
                          onClick={() => completeDevelopmentMutation.mutate(dev)}
                          disabled={completeDevelopmentMutation.isPending}
                        >
                          Complete Construction
                        </Button>
                      </>
                    )}

                    {dev.is_operational && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {dev.benefits?.defense_bonus > 0 && (
                          <div className="text-gray-400">
                            Defense: <span className="text-cyan-400">+{dev.benefits.defense_bonus}</span>
                          </div>
                        )}
                        {dev.benefits?.revenue_bonus > 0 && (
                          <div className="text-gray-400">
                            Revenue: <span className="text-green-400">+{(dev.benefits.revenue_bonus * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}