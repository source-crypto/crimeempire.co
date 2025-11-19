import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '../../utils';

export default function ActiveHeists({ heists }) {
  if (!heists || heists.length === 0) {
    return (
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="w-5 h-5 text-red-400" />
            Active Heists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active heists</p>
            <p className="text-sm mt-1">Plan a heist to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Target className="w-5 h-5 text-red-400" />
          Active Heists
          <Badge className="ml-auto bg-red-600">{heists.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {heists.map((heist) => {
          const riskColor = heist.risk_level > 70 ? 'text-red-400' : 
                           heist.risk_level > 40 ? 'text-yellow-400' : 'text-green-400';
          
          return (
            <div
              key={heist.id}
              className="p-4 rounded-lg bg-slate-900/50 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
              onClick={() => window.location.href = createPageUrl('Heists')}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-white mb-1">{heist.heist_name}</h4>
                  <p className="text-sm text-gray-400">{heist.target_name}</p>
                  <Badge className="mt-1 capitalize">{heist.difficulty}</Badge>
                </div>
                <Badge className="bg-orange-600">In Progress</Badge>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Success Probability</span>
                  <span className={riskColor}>{heist.success_probability || 50}%</span>
                </div>
                <Progress value={heist.success_probability || 50} className="h-2" />
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Users className="w-4 h-4" />
                  <span>{heist.participants?.length || 0} crew</span>
                </div>
                <div className="flex items-center gap-1 text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>${(heist.estimated_payout || 0).toLocaleString()}</span>
                </div>
                <div className={`flex items-center gap-1 ${riskColor}`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Risk: {heist.risk_level || 50}%</span>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full mt-3 bg-gradient-to-r from-red-600 to-orange-600"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = createPageUrl('Heists');
                }}
              >
                Continue Heist
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}