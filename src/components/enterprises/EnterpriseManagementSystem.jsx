import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Factory, AlertTriangle, TrendingUp, Package, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const eventIcons = {
  raid: AlertTriangle,
  supplier_issue: Package,
  breakthrough: TrendingUp,
  worker_strike: AlertTriangle,
  equipment_failure: AlertTriangle,
  lucky_find: TrendingUp,
  insider_theft: AlertTriangle
};

const eventColors = {
  raid: 'border-red-500/30 bg-red-900/20',
  supplier_issue: 'border-yellow-500/30 bg-yellow-900/20',
  breakthrough: 'border-green-500/30 bg-green-900/20',
  worker_strike: 'border-orange-500/30 bg-orange-900/20',
  equipment_failure: 'border-red-500/30 bg-red-900/20',
  lucky_find: 'border-green-500/30 bg-green-900/20',
  insider_theft: 'border-red-500/30 bg-red-900/20'
};

export default function EnterpriseManagementSystem({ enterprise, playerData }) {
  const queryClient = useQueryClient();

  if (!enterprise || !playerData) {
    return null;
  }

  const { data: enterpriseEvents = [] } = useQuery({
    queryKey: ['enterpriseEvents', enterprise?.id],
    queryFn: () => base44.entities.EnterpriseEvent.filter({ 
      enterprise_id: enterprise.id,
      status: 'active'
    }),
    enabled: !!enterprise
  });

  const generateEventMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Generate a random event for a ${enterprise.type} enterprise:

Enterprise: ${enterprise.name}
Type: ${enterprise.type}
Level: ${enterprise.level}
Current Heat: ${enterprise.heat_level}

Create event with:
1. Event type (raid/supplier_issue/breakthrough/worker_strike/equipment_failure)
2. Description (dramatic, 2-3 sentences)
3. Severity (minor/moderate/major)
4. Effects (production_modifier, security_impact, heat_change, stock_loss, revenue_impact)
5. Resolution options (3 different actions with costs and outcomes)

Make it relevant to the enterprise type. Return JSON.`;

      const eventData = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            event_type: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string' },
            effects: {
              type: 'object',
              properties: {
                production_modifier: { type: 'number' },
                security_impact: { type: 'number' },
                heat_change: { type: 'number' },
                stock_loss: { type: 'number' },
                revenue_impact: { type: 'number' }
              }
            },
            resolution_options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  cost: { type: 'number' },
                  outcome: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return await base44.entities.EnterpriseEvent.create({
        enterprise_id: enterprise.id,
        enterprise_name: enterprise.name,
        ...eventData,
        status: 'active',
        ai_generated: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseEvents']);
      toast.warning('Enterprise event occurred!');
    }
  });

  const resolveEventMutation = useMutation({
    mutationFn: async ({ event, option }) => {
      if (playerData.crypto_balance < option.cost) {
        throw new Error('Insufficient funds');
      }

      await base44.entities.EnterpriseEvent.update(event.id, {
        status: 'resolved',
        resolved_action: option.action
      });

      const newProduction = Math.max(0, enterprise.production_rate + (event.effects.production_modifier || 0));
      const newHeat = Math.max(0, Math.min(100, enterprise.heat_level + (event.effects.heat_change || 0)));
      const newStock = Math.max(0, enterprise.current_stock - (event.effects.stock_loss || 0));

      await base44.entities.CriminalEnterprise.update(enterprise.id, {
        production_rate: newProduction,
        heat_level: newHeat,
        current_stock: newStock
      });

      if (option.cost > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: playerData.crypto_balance - option.cost
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enterpriseEvents']);
      queryClient.invalidateQueries(['enterprises']);
      queryClient.invalidateQueries(['player']);
      toast.success('Event resolved!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const autoTradeProductionMutation = useMutation({
    mutationFn: async () => {
      const surplusThreshold = enterprise.storage_capacity * 0.8;
      
      if (enterprise.current_stock < surplusThreshold) {
        throw new Error('No surplus to trade');
      }

      const tradeAmount = Math.floor(enterprise.current_stock * 0.3);
      const basePrice = 50;
      const revenue = tradeAmount * basePrice;

      await base44.entities.CriminalEnterprise.update(enterprise.id, {
        current_stock: enterprise.current_stock - tradeAmount,
        total_revenue: enterprise.total_revenue + revenue
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + revenue,
        total_earnings: playerData.total_earnings + revenue
      });

      return { amount: tradeAmount, revenue };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['enterprises']);
      queryClient.invalidateQueries(['player']);
      toast.success(`Sold ${result.amount} units for $${result.revenue.toLocaleString()}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-green-500/20">
        <CardHeader className="border-b border-green-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Factory className="w-5 h-5 text-green-400" />
              Production Management
            </CardTitle>
            <Button
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600"
              onClick={() => autoTradeProductionMutation.mutate()}
              disabled={autoTradeProductionMutation.isPending}
            >
              {autoTradeProductionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Auto-Sell Surplus'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Stock Level</span>
              <span className="text-white">
                {enterprise.current_stock} / {enterprise.storage_capacity}
              </span>
            </div>
            <Progress 
              value={(enterprise.current_stock / enterprise.storage_capacity) * 100} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-orange-500/20">
        <CardHeader className="border-b border-orange-500/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Enterprise Events
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-500/30"
              onClick={() => generateEventMutation.mutate()}
              disabled={generateEventMutation.isPending}
            >
              {generateEventMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Simulate
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {enterpriseEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active events</p>
          ) : (
            enterpriseEvents.map((event) => {
              const EventIcon = eventIcons[event.event_type];

              return (
                <div key={event.id} className={`p-3 rounded-lg border ${eventColors[event.event_type]}`}>
                  <div className="flex items-start gap-2 mb-3">
                    <EventIcon className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-semibold text-white capitalize">
                          {event.event_type.replace('_', ' ')}
                        </p>
                        <Badge className={
                          event.severity === 'major' ? 'bg-red-600' :
                          event.severity === 'moderate' ? 'bg-yellow-600' : 'bg-blue-600'
                        }>
                          {event.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-300 mb-3">{event.description}</p>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-white">Resolution Options:</p>
                        {event.resolution_options?.map((option, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="outline"
                            className="w-full border-orange-500/30 text-xs justify-start"
                            onClick={() => resolveEventMutation.mutate({ event, option })}
                            disabled={resolveEventMutation.isPending}
                          >
                            <span className="flex-1 text-left">{option.action}</span>
                            <span className="text-yellow-400">${option.cost.toLocaleString()}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}