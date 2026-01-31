import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:parameter>
<parameter name="content">import { Building2, Users, Package, AlertTriangle, TrendingUp, Wrench, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function EnterpriseManagement({ playerData }) {
  const queryClient = useQueryClient();
  const [selectedEnterprise, setSelectedEnterprise] = useState(null);

  const { data: enterprises = [] } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['enterpriseResources', selectedEnterprise?.id],
    queryFn: () => base44.entities.EnterpriseResource.filter({ enterprise_id: selectedEnterprise.id }),
    enabled: !!selectedEnterprise?.id
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeSatisfaction', selectedEnterprise?.id],
    queryFn: async () => {
      const emp = await base44.entities.EmployeeSatisfaction.filter({ enterprise_id: selectedEnterprise.id });
      return emp[0];
    },
    enabled: !!selectedEnterprise?.id
  });

  const { data: sabotageThreats = [] } = useQuery({
    queryKey: ['economicSabotage', playerData?.id],
    queryFn: () => base44.entities.EconomicSabotage.filter({ 
      target_player_id: playerData.id,
      status: 'executing'
    }),
    enabled: !!playerData?.id,
    refetchInterval: 60000
  });

  const manageResourcesMutation = useMutation({
    mutationFn: async ({ enterpriseId, resourceId, action }) => {
      const resource = resources.find(r => r.id === resourceId);
      const enterprise = enterprises.find(e => e.id === enterpriseId);

      if (action === 'replenish') {
        const cost = resource.replenishment_cost || 1000;
        if (playerData.crypto_balance < cost) {
          throw new Error('Insufficient funds');
        }

        await base44.entities.EnterpriseResource.update(resourceId, {
          current_amount: resource.max_capacity,
          last_updated: new Date().toISOString()
        });

        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance - cost
        });
      }

      const avgResourceLevel = resources.reduce((sum, r) => 
        sum + (r.current_amount / r.max_capacity), 0) / resources.length;
      
      const newProductionRate = Math.floor(enterprise.production_rate * avgResourceLevel);

      await base44.entities.CriminalEnterprise.update(enterpriseId, {
        production_rate: newProductionRate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseResources']);
      queryClient.invalidateQueries(['enterprises']);
      queryClient.invalidateQueries(['player']);
      toast.success('Resources updated');
    },
    onError: (error) => toast.error(error.message)
  });

  const improveEmployeeMoraleMutation = useMutation({
    mutationFn: async ({ enterpriseId, action }) => {
      const cost = action === 'wage_increase' ? 5000 : action === 'safety_upgrade' ? 3000 : 2000;
      
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds');
      }

      let updates = {};
      if (action === 'wage_increase') {
        updates = {
          wage_satisfaction: Math.min(100, (employees.wage_satisfaction || 70) + 10),
          overall_morale: Math.min(100, (employees.overall_morale || 75) + 5),
          last_wage_increase: new Date().toISOString()
        };
      } else if (action === 'safety_upgrade') {
        updates = {
          safety_rating: Math.min(100, (employees.safety_rating || 80) + 15),
          overall_morale: Math.min(100, (employees.overall_morale || 75) + 5)
        };
      }

      const newMorale = updates.overall_morale || employees.overall_morale;
      const productivityModifier = 0.5 + (newMorale / 100);

      if (employees) {
        await base44.entities.EmployeeSatisfaction.update(employees.id, {
          ...updates,
          productivity_modifier: productivityModifier,
          turnover_risk: Math.max(0, (employees.turnover_risk || 10) - 5),
          strike_probability: Math.max(0, (employees.strike_probability || 5) - 3)
        });
      } else {
        await base44.entities.EmployeeSatisfaction.create({
          enterprise_id: enterpriseId,
          ...updates,
          productivity_modifier: productivityModifier
        });
      }

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employeeSatisfaction']);
      queryClient.invalidateQueries(['player']);
      toast.success('Employee morale improved');
    },
    onError: (error) => toast.error(error.message)
  });

  const defendSabotageMutation = useMutation({
    mutationFn: async (sabotageId) => {
      const cost = 2500;
      if (playerData.crypto_balance < cost) {
        throw new Error('Insufficient funds for countermeasures');
      }

      await base44.entities.EconomicSabotage.update(sabotageId, {
        status: 'thwarted',
        countermeasures: [{ action: 'security_intervention', effectiveness: 85 }]
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['economicSabotage']);
      queryClient.invalidateQueries(['player']);
      toast.success('Sabotage thwarted!');
    },
    onError: (error) => toast.error(error.message)
  });

  if (!playerData) return null;

  return (
    <div className="space-y-4">
      {sabotageThreats.length > 0 && (
        <Card className="glass-panel border-red-500/50 bg-red-900/10">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Sabotage Threats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sabotageThreats.map((threat) => (
              <div
                key={threat.id}
                className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white capitalize">
                    {threat.sabotage_type?.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-gray-400">
                    By: {threat.attacker_name} • Severity: {threat.severity} • 
                    Damage: ${threat.economic_damage?.toLocaleString()}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => defendSabotageMutation.mutate(threat.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Defend ($2,500)
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Enterprise Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enterprises.map((ent) => (
              <div
                key={ent.id}
                onClick={() => setSelectedEnterprise(ent)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedEnterprise?.id === ent.id
                    ? 'bg-purple-900/30 border-2 border-purple-500'
                    : 'bg-slate-900/50 border border-purple-500/20 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-white">{ent.name}</div>
                  <Badge className={ent.is_active ? 'bg-green-600' : 'bg-red-600'}>
                    {ent.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  Level {ent.level} • Production: {ent.production_rate}/hr
                </div>
              </div>
            ))}
          </div>

          {selectedEnterprise && (
            <>
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Resource Management
                </h3>
                {resources.length === 0 ? (
                  <p className="text-gray-400 text-sm">No resources tracked</p>
                ) : (
                  <div className="space-y-2">
                    {resources.map((res) => (
                      <div
                        key={res.id}
                        className="p-3 rounded-lg bg-slate-900/50 border border-cyan-500/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white capitalize">{res.resource_name}</div>
                          <Badge>{res.resource_type}</Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{res.current_amount} / {res.max_capacity}</span>
                            <span>Consumption: {res.consumption_rate}/hr</span>
                          </div>
                          <Progress 
                            value={(res.current_amount / res.max_capacity) * 100} 
                            className="h-2"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-cyan-600 hover:bg-cyan-700"
                          onClick={() => manageResourcesMutation.mutate({
                            enterpriseId: selectedEnterprise.id,
                            resourceId: res.id,
                            action: 'replenish'
                          })}
                        >
                          <Wrench className="w-4 h-4 mr-1" />
                          Replenish (${res.replenishment_cost?.toLocaleString()})
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Employee Satisfaction
                </h3>
                {employees ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                        <p className="text-xs text-gray-400">Overall Morale</p>
                        <p className="text-xl font-bold text-blue-400">{employees.overall_morale}%</p>
                        <Progress value={employees.overall_morale} className="h-1 mt-1" />
                      </div>
                      <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                        <p className="text-xs text-gray-400">Productivity</p>
                        <p className="text-xl font-bold text-green-400">
                          {(employees.productivity_modifier * 100).toFixed(0)}%
                        </p>
                        <Progress value={employees.productivity_modifier * 100} className="h-1 mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => improveEmployeeMoraleMutation.mutate({
                          enterpriseId: selectedEnterprise.id,
                          action: 'wage_increase'
                        })}
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Raise Wages ($5k)
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => improveEmployeeMoraleMutation.mutate({
                          enterpriseId: selectedEnterprise.id,
                          action: 'safety_upgrade'
                        })}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Safety Upgrade ($3k)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No employee data available</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}