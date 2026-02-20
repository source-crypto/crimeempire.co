import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ActiveInvestigations({ playerData }) {
  const { data: investigations = [] } = useQuery({
    queryKey: ['investigations', playerData?.id],
    queryFn: async () => {
      const all = await base44.entities.Investigation.filter({ status: 'active' });
      return all.filter(inv => 
        inv.investigator_id === playerData.id || inv.target_player_id === playerData.id
      );
    },
    enabled: !!playerData
  });

  const myInvestigations = investigations.filter(i => i.investigator_id === playerData?.id);
  const againstMe = investigations.filter(i => i.target_player_id === playerData?.id);

  return (
    <Card className="glass-panel border-red-500/20">
      <CardHeader className="border-b border-red-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Search className="w-5 h-5 text-red-400" />
            Active Investigations
          </CardTitle>
          <Link to={createPageUrl('Investigations')}>
            <Button size="sm" variant="outline" className="border-red-500/30">
              View All
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">My Cases</p>
                <p className="text-2xl font-bold text-white">{myInvestigations.length}</p>
              </div>
              <Search className="w-6 h-6 text-blue-400" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Against Me</p>
                <p className="text-2xl font-bold text-white">{againstMe.length}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        {investigations.length === 0 ? (
          <div className="text-center py-6">
            <Search className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-400 text-sm">No active investigations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {investigations.slice(0, 3).map((inv) => (
              <div 
                key={inv.id} 
                className={`p-3 rounded-lg border ${
                  inv.target_player_id === playerData.id 
                    ? 'bg-red-900/20 border-red-500/20' 
                    : 'bg-blue-900/20 border-blue-500/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{inv.case_title}</p>
                    <p className="text-xs text-gray-400">
                      {inv.target_player_id === playerData.id 
                        ? `Investigated by ${inv.investigator_name}`
                        : `Target: ${inv.target_player_username}`
                      }
                    </p>
                  </div>
                  <Badge className={
                    inv.priority === 'critical' ? 'bg-red-600' :
                    inv.priority === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                  }>
                    {inv.priority}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Progress: {inv.progress_percentage || 0}%
                  </span>
                  {inv.target_player_id === playerData.id && (
                    <span className="text-red-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Risk: {inv.risk_level || 0}/100
                    </span>
                  )}
                </div>
              </div>
            ))}

            {investigations.length > 3 && (
              <p className="text-center text-xs text-gray-400 mt-2">
                +{investigations.length - 3} more investigations
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}