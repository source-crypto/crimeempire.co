import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, AlertTriangle, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export default function AIEventGenerator({ playerData }) {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['recentEconomicEvents'],
    queryFn: () => base44.entities.EconomicEvent.list('-created_date', 10),
    staleTime: 30000
  });

  const { data: macroData = [] } = useQuery({
    queryKey: ['macroData'],
    queryFn: () => base44.entities.MacroEconomicData.list('-updated_date', 3),
    staleTime: 60000
  });

  const { data: enterprises = [] } = useQuery({
    queryKey: ['playerEnterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ 
      owner_id: playerData.id 
    }),
    enabled: !!playerData,
    staleTime: 60000
  });

  const generateEventMutation = useMutation({
    mutationFn: async () => {
      const enterpriseCount = enterprises.length;
      const totalWealth = playerData.crypto_balance + playerData.buy_power;

      const prompt = `
Generate a realistic economic event for a crime game that impacts player businesses and territories.

Context:
- Player has ${enterpriseCount} criminal enterprises
- Total wealth: $${totalWealth}
- Recent macro trends: ${macroData.map(m => m.indicator_name).join(', ')}
- Game difficulty: moderate

Create an event with title, description, severity (minor/moderate/major/critical), and specific impacts on:
- Credit costs
- Enterprise profits
- Territory values
- Market crash risk
- Crypto volatility

Make it feel realistic and tied to actual economic conditions.
      `;

      const eventData = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            severity: { type: "string" },
            event_type: { type: "string" },
            credit_cost_change: { type: "number" },
            enterprise_profit_modifier: { type: "number" },
            market_crash_probability: { type: "number" },
            territory_value_change: { type: "number" },
            crypto_volatility: { type: "number" },
            duration_hours: { type: "number" }
          }
        }
      });

      const newEvent = await base44.entities.EconomicEvent.create({
        event_type: eventData.event_type,
        severity: eventData.severity,
        title: eventData.title,
        description: eventData.description,
        game_effects: {
          credit_cost_change: eventData.credit_cost_change,
          enterprise_profit_modifier: eventData.enterprise_profit_modifier,
          market_crash_probability: eventData.market_crash_probability,
          territory_value_change: eventData.territory_value_change,
          crypto_volatility: eventData.crypto_volatility
        },
        affected_regions: ['global'],
        duration_hours: eventData.duration_hours || 24,
        is_active: true,
        expires_at: new Date(Date.now() + (eventData.duration_hours || 24) * 60 * 60 * 1000).toISOString()
      });

      // Apply effects to player's enterprises
      if (eventData.enterprise_profit_modifier) {
        for (const enterprise of enterprises) {
          await base44.entities.CriminalEnterprise.update(enterprise.id, {
            production_rate: Math.max(
              10,
              enterprise.production_rate * (1 + eventData.enterprise_profit_modifier / 100)
            )
          });
        }
      }

      return newEvent;
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries(['recentEconomicEvents']);
      queryClient.invalidateQueries(['playerEnterprises']);
      toast.success(`New event: ${event.title}`);
    }
  });

  const handleGenerate = () => {
    setGenerating(true);
    generateEventMutation.mutate();
    setTimeout(() => setGenerating(false), 4000);
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'major': return <TrendingDown className="w-4 h-4 text-orange-400" />;
      case 'moderate': return <Zap className="w-4 h-4 text-yellow-400" />;
      default: return <Sparkles className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <Card className="glass-panel border-yellow-500/20">
      <CardHeader className="border-b border-yellow-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            AI Economic Event Generator
          </CardTitle>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
            className="bg-gradient-to-r from-yellow-600 to-orange-600"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
            Generate Event
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {recentEvents.slice(0, 5).map((event) => (
            <div 
              key={event.id}
              className={`p-4 rounded-lg border ${
                event.severity === 'critical' ? 'bg-red-900/20 border-red-500/20' :
                event.severity === 'major' ? 'bg-orange-900/20 border-orange-500/20' :
                event.severity === 'moderate' ? 'bg-yellow-900/20 border-yellow-500/20' :
                'bg-blue-900/20 border-blue-500/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(event.severity)}
                  <h4 className="font-semibold text-white">{event.title}</h4>
                </div>
                <Badge className={
                  event.severity === 'critical' ? 'bg-red-600' :
                  event.severity === 'major' ? 'bg-orange-600' :
                  event.severity === 'moderate' ? 'bg-yellow-600' :
                  'bg-blue-600'
                }>
                  {event.severity}
                </Badge>
              </div>

              <p className="text-sm text-gray-300 mb-3">{event.description}</p>

              {event.game_effects && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {event.game_effects.credit_cost_change && (
                    <div className="text-gray-400">
                      Credit: <span className={event.game_effects.credit_cost_change > 0 ? 'text-red-400' : 'text-green-400'}>
                        {event.game_effects.credit_cost_change > 0 ? '+' : ''}{event.game_effects.credit_cost_change}%
                      </span>
                    </div>
                  )}
                  {event.game_effects.enterprise_profit_modifier && (
                    <div className="text-gray-400">
                      Profits: <span className={event.game_effects.enterprise_profit_modifier > 0 ? 'text-green-400' : 'text-red-400'}>
                        {event.game_effects.enterprise_profit_modifier > 0 ? '+' : ''}{event.game_effects.enterprise_profit_modifier}%
                      </span>
                    </div>
                  )}
                  {event.game_effects.territory_value_change && (
                    <div className="text-gray-400">
                      Territories: <span className={event.game_effects.territory_value_change > 0 ? 'text-green-400' : 'text-red-400'}>
                        {event.game_effects.territory_value_change > 0 ? '+' : ''}{event.game_effects.territory_value_change}%
                      </span>
                    </div>
                  )}
                  {event.game_effects.crypto_volatility && (
                    <div className="text-gray-400">
                      Volatility: <span className="text-yellow-400">
                        {event.game_effects.crypto_volatility}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                <span>Duration: {event.duration_hours}h</span>
                {event.is_active && <Badge variant="outline" className="text-green-400 border-green-400">Active</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}