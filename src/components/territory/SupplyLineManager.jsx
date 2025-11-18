import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link as LinkIcon, AlertTriangle, TrendingUp, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplyLineManager({ crewId, canManage }) {
  const [fromTerritory, setFromTerritory] = useState('');
  const [toTerritory, setToTerritory] = useState('');
  const queryClient = useQueryClient();

  const { data: territories = [] } = useQuery({
    queryKey: ['crewTerritories', crewId],
    queryFn: () => base44.entities.Territory.filter({ controlling_crew_id: crewId }),
    enabled: !!crewId
  });

  const { data: supplyLines = [] } = useQuery({
    queryKey: ['supplyLines', crewId],
    queryFn: () => base44.entities.SupplyLine.filter({ crew_id: crewId }),
    enabled: !!crewId
  });

  const createSupplyLineMutation = useMutation({
    mutationFn: async () => {
      if (!fromTerritory || !toTerritory) {
        throw new Error('Please select both territories');
      }

      if (fromTerritory === toTerritory) {
        throw new Error('Cannot create supply line to the same territory');
      }

      const existingLine = supplyLines.find(
        sl => (sl.from_territory_id === fromTerritory && sl.to_territory_id === toTerritory) ||
              (sl.from_territory_id === toTerritory && sl.to_territory_id === fromTerritory)
      );

      if (existingLine) {
        throw new Error('Supply line already exists between these territories');
      }

      const fromTerr = territories.find(t => t.id === fromTerritory);
      const toTerr = territories.find(t => t.id === toTerritory);

      await base44.entities.SupplyLine.create({
        crew_id: crewId,
        from_territory_id: fromTerritory,
        to_territory_id: toTerritory,
        from_territory_name: fromTerr.name,
        to_territory_name: toTerr.name,
        efficiency: 100,
        revenue_boost: 1.15,
        security_level: 1
      });

      await base44.entities.CrewActivity.create({
        crew_id: crewId,
        activity_type: 'supply_line_created',
        title: 'Supply Line Established',
        description: `New supply route between ${fromTerr.name} and ${toTerr.name}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyLines', crewId]);
      setFromTerritory('');
      setToTerritory('');
      toast.success('Supply line created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create supply line');
    }
  });

  const upgradeSecurityMutation = useMutation({
    mutationFn: async (supplyLineId) => {
      const line = supplyLines.find(sl => sl.id === supplyLineId);
      const upgradeCost = line.security_level * 15000;

      await base44.entities.SupplyLine.update(supplyLineId, {
        security_level: line.security_level + 1,
        efficiency: Math.min(100, line.efficiency + 10)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplyLines', crewId]);
      toast.success('Security upgraded');
    }
  });

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white text-lg">Create Supply Line</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">From Territory</label>
                <Select value={fromTerritory} onValueChange={setFromTerritory}>
                  <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {territories.map((territory) => (
                      <SelectItem key={territory.id} value={territory.id}>
                        {territory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">To Territory</label>
                <Select value={toTerritory} onValueChange={setToTerritory}>
                  <SelectTrigger className="bg-slate-900/50 border-purple-500/20 text-white">
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {territories.filter(t => t.id !== fromTerritory).map((territory) => (
                      <SelectItem key={territory.id} value={territory.id}>
                        {territory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
                onClick={() => createSupplyLineMutation.mutate()}
                disabled={createSupplyLineMutation.isPending || !fromTerritory || !toTerritory}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Establish Supply Line - $50,000
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            <LinkIcon className="w-5 h-5 text-cyan-400" />
            Active Supply Lines
            <Badge className="ml-auto bg-cyan-600">{supplyLines.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {supplyLines.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No supply lines established</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supplyLines.map((line) => (
                <div
                  key={line.id}
                  className={`p-4 rounded-lg border ${
                    line.is_disrupted
                      ? 'bg-red-900/20 border-red-500/30'
                      : 'bg-slate-900/30 border-purple-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <LinkIcon className={line.is_disrupted ? 'text-red-400' : 'text-cyan-400'} />
                        <h4 className="font-semibold text-white">
                          {line.from_territory_name} ↔ {line.to_territory_name}
                        </h4>
                      </div>
                      {line.is_disrupted && (
                        <div className="flex items-center gap-2 text-sm text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Supply line disrupted!</span>
                        </div>
                      )}
                    </div>
                    <Badge className={line.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                      {line.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400">Efficiency</p>
                      <p className="text-white font-semibold">{line.efficiency}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Revenue Boost</p>
                      <p className="text-green-400 font-semibold">+{((line.revenue_boost - 1) * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Security</p>
                      <p className="text-white font-semibold flex items-center gap-1">
                        <Shield className="w-4 h-4" /> Level {line.security_level}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Total Value</p>
                      <p className="text-cyan-400 font-semibold">
                        ${line.total_value_transferred?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  {canManage && line.security_level < 5 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 border-purple-500/30"
                      onClick={() => upgradeSecurityMutation.mutate(line.id)}
                      disabled={upgradeSecurityMutation.isPending}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Upgrade Security - ${(line.security_level * 15000).toLocaleString()}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}