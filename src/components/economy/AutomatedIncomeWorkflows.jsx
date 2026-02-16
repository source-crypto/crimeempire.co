import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Cog, Building2, Map, PiggyBank, TrendingUp, 
  Clock, CheckCircle2, ArrowRight, Zap
} from 'lucide-react';

export default function AutomatedIncomeWorkflows({ playerData }) {
  const { data: enterprises = [] } = useQuery({
    queryKey: ['playerEnterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ 
      owner_id: playerData.id 
    }, '-updated_date', 20),
    enabled: !!playerData,
    staleTime: 120000
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['playerTerritories', playerData?.id],
    queryFn: async () => {
      const allTerritories = await base44.entities.Territory.filter({
        owner_id: playerData.id
      }, '-updated_date', 10);
      return allTerritories;
    },
    enabled: !!playerData,
    staleTime: 120000
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['activeInvestments', playerData?.id],
    queryFn: () => base44.entities.Investment.filter({ 
      player_id: playerData.id,
      status: 'active'
    }, '-updated_date', 10),
    enabled: !!playerData,
    staleTime: 120000
  });

  const { data: passiveIncome = [] } = useQuery({
    queryKey: ['passiveIncome', playerData?.id],
    queryFn: () => base44.entities.PassiveIncome.filter({ 
      player_id: playerData.id,
      is_active: true
    }, '-updated_date', 10),
    enabled: !!playerData,
    staleTime: 120000
  });

  const workflows = [
    {
      name: 'Enterprise Production',
      icon: Building2,
      color: 'blue',
      active: enterprises.filter(e => e.is_active).length,
      total: enterprises.length,
      workflow: [
        'Raw materials auto-sourced',
        'Production runs continuously',
        'Goods stored in inventory',
        'Auto-sell when storage full (optional)',
        'Revenue added to crypto balance'
      ],
      income: enterprises.reduce((sum, e) => sum + (e.production_rate * 10 * 24), 0),
      frequency: 'Hourly',
      nextPayout: 'Continuous'
    },
    {
      name: 'Territory Taxes',
      icon: Map,
      color: 'purple',
      active: territories.length,
      total: territories.length,
      workflow: [
        'Tax collected from territory citizens',
        'Percentage based on territory value',
        'Auto-deposited to buy power',
        'Increase through territory development',
        'Defend territories to maintain income'
      ],
      income: territories.reduce((sum, t) => sum + ((t.tax_rate || 2) * (t.value || 50000) / 100), 0),
      frequency: 'Daily',
      nextPayout: 'Every 24h'
    },
    {
      name: 'Investment Returns',
      icon: PiggyBank,
      color: 'green',
      active: investments.length,
      total: investments.length,
      workflow: [
        'Investments accrue daily returns',
        'ROI calculated based on market conditions',
        'Affected by macro economic events',
        'Returns auto-deposited to crypto',
        'Compound by reinvesting profits'
      ],
      income: investments.reduce((sum, i) => sum + (i.daily_return || 0), 0),
      frequency: 'Daily',
      nextPayout: 'Every 24h'
    },
    {
      name: 'Passive Income Streams',
      icon: TrendingUp,
      color: 'yellow',
      active: passiveIncome.filter(p => p.is_active).length,
      total: passiveIncome.length,
      workflow: [
        'Reputation bonuses from factions',
        'Crew profit sharing',
        'Alliance benefits',
        'Loyalty rewards',
        'Auto-collected hourly'
      ],
      income: passiveIncome.reduce((sum, p) => sum + (p.amount_per_hour || 0) * 24, 0),
      frequency: 'Hourly',
      nextPayout: 'Every hour'
    }
  ];

  const totalDailyAutomated = workflows.reduce((sum, w) => sum + w.income, 0);

  return (
    <Card className="glass-panel border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Cog className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            Automated Income Workflows
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Daily Auto-Income</p>
            <p className="text-lg font-bold text-green-400">
              +${totalDailyAutomated.toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {workflows.map((workflow, idx) => {
          const Icon = workflow.icon;
          const efficiency = workflow.total > 0 ? (workflow.active / workflow.total) * 100 : 0;
          
          return (
            <div 
              key={idx}
              className={`p-4 bg-${workflow.color}-900/20 rounded-lg border border-${workflow.color}-500/20 space-y-3`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${workflow.color}-600/20 rounded-lg`}>
                    <Icon className={`w-5 h-5 text-${workflow.color}-400`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{workflow.name}</h4>
                    <p className="text-xs text-gray-400">
                      {workflow.active} active of {workflow.total}
                    </p>
                  </div>
                </div>
                <Badge className={`bg-${workflow.color}-600`}>
                  ${workflow.income.toLocaleString()}/day
                </Badge>
              </div>

              {/* Efficiency */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Workflow Efficiency</span>
                  <span className="text-white">{efficiency.toFixed(0)}%</span>
                </div>
                <Progress value={efficiency} className="h-2" />
              </div>

              {/* Workflow Steps */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-300">Automated Process:</p>
                {workflow.workflow.map((step, stepIdx) => (
                  <div key={stepIdx} className="flex items-start gap-2">
                    <div className="flex items-center gap-2">
                      {stepIdx < workflow.workflow.length - 1 ? (
                        <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-xs text-gray-400">{step}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timing Info */}
              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">Frequency:</span>
                  <span className="text-white font-semibold">{workflow.frequency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-gray-400">Next:</span>
                  <span className="text-cyan-400">{workflow.nextPayout}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 mb-1">
                💰 Your money works for you 24/7
              </p>
              <p className="text-xs text-gray-500">
                All workflows run automatically in the background
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Projected Weekly</p>
              <p className="text-xl font-bold text-green-400">
                +${(totalDailyAutomated * 7).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}