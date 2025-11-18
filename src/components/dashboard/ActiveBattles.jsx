import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Clock, Users, TrendingUp } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';

export default function ActiveBattles({ battles, onJoinBattle }) {
  if (!battles || battles.length === 0) {
    return (
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Swords className="w-5 h-5 text-purple-400" />
            Active Territory Battles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active battles at the moment</p>
            <p className="text-sm mt-1">Check territories to initiate a conquest</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Swords className="w-5 h-5 text-purple-400" />
          Active Territory Battles
          <Badge className="ml-auto bg-red-600">{battles.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {battles.map((battle) => {
          const hoursLeft = differenceInHours(new Date(battle.ends_at), new Date());
          const totalPower = battle.attack_power + battle.defense_power;
          const attackPercentage = totalPower > 0 ? (battle.attack_power / totalPower) * 100 : 50;
          
          return (
            <div
              key={battle.id}
              className="p-4 rounded-lg bg-slate-900/50 border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-white mb-1">{battle.territory_name}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{hoursLeft}h remaining</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                  onClick={() => onJoinBattle(battle.id)}
                >
                  Join Battle
                </Button>
              </div>

              {/* Power Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Attackers</span>
                  <span>Defenders</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-red-600 to-orange-600"
                    style={{ width: `${attackPercentage}%` }}
                  />
                  <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-600"
                    style={{ width: `${100 - attackPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{battle.attack_power.toFixed(0)} power</span>
                  <span>{battle.defense_power.toFixed(0)} power</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-red-400">
                  <Users className="w-4 h-4" />
                  <span>{battle.attacking_crew_name}</span>
                </div>
                <span className="text-gray-500">vs</span>
                <div className="flex items-center gap-1 text-cyan-400">
                  <Users className="w-4 h-4" />
                  <span>{battle.defending_crew_name}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}