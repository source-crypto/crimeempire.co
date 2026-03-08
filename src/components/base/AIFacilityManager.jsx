import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Brain, DollarSign, TrendingUp, Users, Zap, Shield, 
  Package, Wrench, Star, AlertTriangle, ChevronDown, ChevronUp,
  RefreshCw, Settings, Activity
} from 'lucide-react';
import { toast } from 'sonner';

const AI_EMPLOYEE_CONFIGS = {
  storage: {
    name: 'Vault AI',
    icon: '📦',
    passive_income: 500,
    resource_type: 'capacity',
    bonus_description: '+200 storage / +$500/hr passive',
    skill: 'logistics',
    color: 'cyan'
  },
  workshop: {
    name: 'Craft AI',
    icon: '🔧',
    passive_income: 900,
    resource_type: 'production',
    bonus_description: '+30% craft speed / +$900/hr passive',
    skill: 'engineering',
    color: 'orange'
  },
  laboratory: {
    name: 'Research AI',
    icon: '🧪',
    passive_income: 1200,
    resource_type: 'research',
    bonus_description: '+25% research / +$1200/hr passive',
    skill: 'science',
    color: 'green'
  },
  armory: {
    name: 'Armory AI',
    icon: '🔫',
    passive_income: 800,
    resource_type: 'weapons',
    bonus_description: '+20% weapon quality / +$800/hr passive',
    skill: 'combat_ops',
    color: 'red'
  },
  intelligence: {
    name: 'Intel AI',
    icon: '🕵️',
    passive_income: 1000,
    resource_type: 'intel',
    bonus_description: 'Auto-detect threats / +$1000/hr passive',
    skill: 'espionage',
    color: 'blue'
  },
  medical: {
    name: 'MedBot AI',
    icon: '⚕️',
    passive_income: 600,
    resource_type: 'healing',
    bonus_description: 'Auto-heal + $600/hr passive',
    skill: 'medicine',
    color: 'pink'
  }
};

const colorMap = {
  cyan: 'border-cyan-500/30 bg-cyan-900/10 text-cyan-400',
  orange: 'border-orange-500/30 bg-orange-900/10 text-orange-400',
  green: 'border-green-500/30 bg-green-900/10 text-green-400',
  red: 'border-red-500/30 bg-red-900/10 text-red-400',
  blue: 'border-blue-500/30 bg-blue-900/10 text-blue-400',
  pink: 'border-pink-500/30 bg-pink-900/10 text-pink-400'
};

export default function AIFacilityManager({ currentBase, baseFacilities = [], playerData }) {
  const queryClient = useQueryClient();
  const [expandedFacility, setExpandedFacility] = useState(null);
  const [collectingId, setCollectingId] = useState(null);

  const { data: aiEmployees = [] } = useQuery({
    queryKey: ['aiEmployees', currentBase?.id],
    queryFn: () => base44.entities.AIEmployeeManager.filter({ base_id: currentBase.id }),
    enabled: !!currentBase?.id
  });

  const assignAIMutation = useMutation({
    mutationFn: async ({ facility, config }) => {
      const hiringCost = 20000;
      if (playerData.crypto_balance < hiringCost) {
        throw new Error(`Need $${hiringCost.toLocaleString()} to hire AI employee`);
      }

      await base44.entities.AIEmployeeManager.create({
        base_id: currentBase.id,
        facility_id: facility.id,
        facility_type: facility.facility_type,
        ai_name: config.name,
        skill: config.skill,
        passive_income_rate: config.passive_income,
        resource_bonus: config.bonus_description,
        efficiency: 100,
        last_collection: new Date().toISOString(),
        accumulated_income: 0,
        status: 'active'
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - hiringCost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiEmployees']);
      queryClient.invalidateQueries(['player']);
      toast.success('AI Employee assigned to facility!');
    },
    onError: (err) => toast.error(err.message)
  });

  const collectIncomeMutation = useMutation({
    mutationFn: async (employee) => {
      const lastCollection = new Date(employee.last_collection || employee.created_date);
      const hoursElapsed = Math.max(0, (Date.now() - lastCollection.getTime()) / 3600000);
      const earned = Math.floor(employee.passive_income_rate * hoursElapsed);

      if (earned < 10) throw new Error('Not enough income to collect yet');

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + earned,
        total_earnings: (playerData.total_earnings || 0) + earned
      });

      await base44.entities.AIEmployeeManager.update(employee.id, {
        last_collection: new Date().toISOString(),
        accumulated_income: 0
      });

      return earned;
    },
    onSuccess: (earned) => {
      queryClient.invalidateQueries(['player']);
      queryClient.invalidateQueries(['aiEmployees']);
      toast.success(`Collected $${earned.toLocaleString()} passive income!`);
      setCollectingId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setCollectingId(null);
    }
  });

  const upgradeAIMutation = useMutation({
    mutationFn: async (employee) => {
      const cost = 15000 * employee.skill_level || 15000;
      if (playerData.crypto_balance < cost) throw new Error('Insufficient funds');

      await base44.entities.AIEmployeeManager.update(employee.id, {
        passive_income_rate: Math.floor(employee.passive_income_rate * 1.25),
        efficiency: Math.min(100, (employee.efficiency || 100) + 5),
        skill_level: (employee.skill_level || 1) + 1
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aiEmployees']);
      queryClient.invalidateQueries(['player']);
      toast.success('AI Employee upgraded! +25% income rate');
    },
    onError: (err) => toast.error(err.message)
  });

  const totalHourlyPassive = aiEmployees.reduce((sum, e) => sum + (e.passive_income_rate || 0), 0);
  const assignedFacilityIds = aiEmployees.map(e => e.facility_id);

  function calcPending(employee) {
    const last = new Date(employee.last_collection || employee.created_date);
    const hours = Math.max(0, (Date.now() - last.getTime()) / 3600000);
    return Math.floor(employee.passive_income_rate * hours);
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/30 text-center">
          <Brain className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{aiEmployees.length}</p>
          <p className="text-xs text-gray-400">AI Employees</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-900/40 to-orange-900/20 border border-yellow-500/30 text-center">
          <DollarSign className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">${(totalHourlyPassive / 1000).toFixed(1)}k</p>
          <p className="text-xs text-gray-400">Per Hour</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-900/40 to-blue-900/20 border border-cyan-500/30 text-center">
          <TrendingUp className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">${(totalHourlyPassive * 24 / 1000).toFixed(0)}k</p>
          <p className="text-xs text-gray-400">Daily Est.</p>
        </div>
      </div>

      {/* Assign AIs to Facilities */}
      <div className="space-y-3">
        <h4 className="text-white font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" />
          Facility AI Management
        </h4>

        {baseFacilities.length === 0 ? (
          <div className="p-4 rounded-lg border border-gray-700/30 bg-gray-900/20 text-center">
            <p className="text-gray-400 text-sm">Install facilities first to assign AI employees</p>
          </div>
        ) : (
          baseFacilities.map((facility) => {
            const config = AI_EMPLOYEE_CONFIGS[facility.facility_type];
            if (!config) return null;

            const assignedEmployee = aiEmployees.find(e => e.facility_id === facility.id);
            const isAssigned = !!assignedEmployee;
            const isExpanded = expandedFacility === facility.id;
            const pendingIncome = isAssigned ? calcPending(assignedEmployee) : 0;
            const colorStyle = colorMap[config.color] || colorMap.blue;

            return (
              <div key={facility.id} className={`rounded-xl border ${colorStyle.split(' ').slice(0, 2).join(' ')}`}>
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedFacility(isExpanded ? null : facility.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <p className="text-white font-semibold">{facility.facility_name || facility.facility_type}</p>
                        <p className="text-xs text-gray-400">{config.bonus_description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAssigned ? (
                        <Badge className="bg-green-700 text-green-100">
                          <Activity className="w-3 h-3 mr-1" />
                          AI Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-700 text-gray-300">Unassigned</Badge>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                    {isAssigned ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2 rounded-lg bg-black/30">
                            <p className="text-gray-400">Income Rate</p>
                            <p className="text-yellow-400 font-bold">${assignedEmployee.passive_income_rate?.toLocaleString()}/hr</p>
                          </div>
                          <div className="p-2 rounded-lg bg-black/30">
                            <p className="text-gray-400">Pending</p>
                            <p className="text-green-400 font-bold">${pendingIncome.toLocaleString()}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-black/30">
                            <p className="text-gray-400">Efficiency</p>
                            <p className="text-cyan-400 font-bold">{assignedEmployee.efficiency || 100}%</p>
                          </div>
                          <div className="p-2 rounded-lg bg-black/30">
                            <p className="text-gray-400">AI Level</p>
                            <p className="text-purple-400 font-bold">Lv {assignedEmployee.skill_level || 1}</p>
                          </div>
                        </div>

                        <Progress value={assignedEmployee.efficiency || 100} className="h-1.5" />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-700 hover:bg-green-600"
                            onClick={() => {
                              setCollectingId(facility.id);
                              collectIncomeMutation.mutate(assignedEmployee);
                            }}
                            disabled={collectIncomeMutation.isPending || pendingIncome < 10}
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Collect ${pendingIncome.toLocaleString()}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-500/40 text-purple-300 hover:bg-purple-900/30"
                            onClick={() => upgradeAIMutation.mutate(assignedEmployee)}
                            disabled={upgradeAIMutation.isPending}
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            Upgrade
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-gray-400 text-sm">Hire <strong className="text-white">{config.name}</strong> to generate passive income from this facility.</p>
                        <p className="text-yellow-400 text-xs">Cost: $20,000 upfront • Earns ${config.passive_income.toLocaleString()}/hr</p>
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600"
                          onClick={() => assignAIMutation.mutate({ facility, config })}
                          disabled={assignAIMutation.isPending || (playerData?.crypto_balance || 0) < 20000}
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          Hire AI Employee — $20,000
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}