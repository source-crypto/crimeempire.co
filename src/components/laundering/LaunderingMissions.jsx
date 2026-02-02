import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const missionTypes = {
  bulk_wash: { label: 'Bulk Wash', icon: '💰', desc: 'Launder large sum quickly', business: 'any' },
  vip_client: { label: 'VIP Client', icon: '👔', desc: 'Service high-profile client', business: 'casino' },
  offshore_transfer: { label: 'Offshore Transfer', icon: '🌊', desc: 'Move money overseas', business: 'real_estate' },
  shell_creation: { label: 'Shell Company', icon: '🏢', desc: 'Create shell corporation', business: 'any' },
  audit_cover: { label: 'Audit Cover-Up', icon: '📋', desc: 'Cover tracks during audit', business: 'any' },
  crypto_tumble: { label: 'Crypto Tumbling', icon: '₿', desc: 'Mix cryptocurrency', business: 'crypto_exchange' }
};

export default function LaunderingMissions({ playerData, businesses }) {
  const queryClient = useQueryClient();

  const { data: missions = [] } = useQuery({
    queryKey: ['launderingMissions', playerData?.id],
    queryFn: () => base44.entities.LaunderingMission.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const generateMissionMutation = useMutation({
    mutationFn: async () => {
      const types = Object.keys(missionTypes);
      const randomType = types[Math.floor(Math.random() * types.length)];
      const missionInfo = missionTypes[randomType];
      
      const targetAmount = Math.floor(Math.random() * 500000) + 100000;
      const reward = targetAmount * (0.15 + Math.random() * 0.1);
      const risk = Math.floor(Math.random() * 50) + 30;

      await base44.entities.LaunderingMission.create({
        player_id: playerData.id,
        mission_name: `${missionInfo.label} Operation`,
        mission_type: randomType,
        required_business_type: missionInfo.business === 'any' ? null : missionInfo.business,
        target_amount: targetAmount,
        reward: reward,
        time_limit_hours: 48,
        risk_level: risk,
        bonus_rewards: {
          reputation: Math.floor(risk / 10)
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingMissions']);
      toast.success('New mission generated!');
    }
  });

  const startMissionMutation = useMutation({
    mutationFn: async ({ mission, business }) => {
      if (mission.required_business_type && business.business_type !== mission.required_business_type) {
        throw new Error('Wrong business type for this mission');
      }

      await base44.entities.LaunderingMission.update(mission.id, {
        business_id: business.id,
        status: 'active',
        started_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingMissions']);
      toast.success('Mission started!');
    },
    onError: (error) => toast.error(error.message)
  });

  const completeMissionMutation = useMutation({
    mutationFn: async (mission) => {
      const business = businesses.find(b => b.id === mission.business_id);
      const success = Math.random() * 100 > mission.risk_level;

      if (success) {
        await base44.entities.LaunderingMission.update(mission.id, {
          status: 'completed',
          completed_at: new Date().toISOString()
        });

        await base44.entities.Player.update(playerData.id, {
          balance: playerData.balance + mission.reward,
          reputation: (playerData.reputation || 0) + (mission.bonus_rewards?.reputation || 0)
        });

        await base44.entities.MoneyLaunderingBusiness.update(business.id, {
          clean_money_generated: (business.clean_money_generated || 0) + mission.target_amount
        });

        toast.success(`Mission complete! +$${mission.reward.toLocaleString()}`);
      } else {
        await base44.entities.LaunderingMission.update(mission.id, {
          status: 'failed',
          completed_at: new Date().toISOString()
        });

        await base44.entities.MoneyLaunderingBusiness.update(business.id, {
          suspicion_level: Math.min(100, business.suspicion_level + mission.risk_level * 0.5)
        });

        await base44.entities.Player.update(playerData.id, {
          heat: Math.min(100, (playerData.heat || 0) + mission.risk_level * 0.3)
        });

        toast.error('Mission failed! Heat increased');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingMissions']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
    }
  });

  const availableMissions = missions.filter(m => m.status === 'available');
  const activeMissions = missions.filter(m => m.status === 'active');
  const completedMissions = missions.filter(m => ['completed', 'failed'].includes(m.status));

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white text-sm">
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              Laundering Operations
            </span>
            <Button
              onClick={() => generateMissionMutation.mutate()}
              disabled={generateMissionMutation.isPending || availableMissions.length >= 5}
              className="bg-cyan-600 hover:bg-cyan-700 text-xs"
            >
              Generate Mission
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          Specialized laundering missions for bonus rewards and reputation
        </CardContent>
      </Card>

      {/* Available Missions */}
      {availableMissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white text-sm font-semibold">Available Missions</h3>
          {availableMissions.map(mission => {
            const missionInfo = missionTypes[mission.mission_type];
            
            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="glass-panel border-green-500/20">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{missionInfo.icon}</span>
                        <div>
                          <p className="text-white text-xs font-semibold">{mission.mission_name}</p>
                          <p className="text-gray-400 text-[10px]">{missionInfo.desc}</p>
                        </div>
                      </div>
                      <Badge className={`${
                        mission.risk_level > 70 ? 'bg-red-600' :
                        mission.risk_level > 50 ? 'bg-orange-600' : 'bg-green-600'
                      } text-[10px]`}>
                        Risk: {mission.risk_level}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400 text-[10px]">Target</p>
                        <p className="text-yellow-400 font-semibold">${(mission.target_amount / 1000).toFixed(0)}k</p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400 text-[10px]">Reward</p>
                        <p className="text-green-400 font-semibold">${(mission.reward / 1000).toFixed(0)}k</p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400 text-[10px]">Time</p>
                        <p className="text-blue-400 font-semibold">{mission.time_limit_hours}h</p>
                      </div>
                    </div>

                    {mission.required_business_type && (
                      <Badge className="bg-purple-700 text-[10px] capitalize">
                        Requires: {mission.required_business_type.replace(/_/g, ' ')}
                      </Badge>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {businesses
                        .filter(b => !mission.required_business_type || b.business_type === mission.required_business_type)
                        .map(business => (
                          <Button
                            key={business.id}
                            onClick={() => startMissionMutation.mutate({ mission, business })}
                            disabled={startMissionMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-[10px]"
                          >
                            Use {business.business_name}
                          </Button>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white text-sm font-semibold">Active Operations</h3>
          {activeMissions.map(mission => {
            const business = businesses.find(b => b.id === mission.business_id);
            const timeElapsed = Date.now() - new Date(mission.started_at).getTime();
            const timeLimit = mission.time_limit_hours * 60 * 60 * 1000;
            const progressPercent = Math.min(100, (timeElapsed / timeLimit) * 100);

            return (
              <Card key={mission.id} className="glass-panel border-blue-500/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-xs font-semibold">{mission.mission_name}</p>
                    <Badge className="bg-blue-600 text-[10px]">In Progress</Badge>
                  </div>

                  <p className="text-gray-400 text-[10px]">Using: {business?.business_name}</p>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-blue-400">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                  </div>

                  <Button
                    onClick={() => completeMissionMutation.mutate(mission)}
                    disabled={completeMissionMutation.isPending || progressPercent < 100}
                    className="w-full bg-green-600 hover:bg-green-700 text-xs"
                  >
                    {progressPercent >= 100 ? 'Complete Mission' : `Wait ${Math.round((100 - progressPercent) / 2)}h`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mission History */}
      {completedMissions.length > 0 && (
        <Card className="glass-panel border-slate-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Mission History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {completedMissions.slice(0, 10).map(mission => (
                <div key={mission.id} className="flex items-center justify-between p-2 bg-slate-900/30 rounded text-xs">
                  <span className="text-gray-400">{mission.mission_name}</span>
                  {mission.status === 'completed' ? (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      +${(mission.reward / 1000).toFixed(0)}k
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-400">
                      <XCircle className="w-3 h-3" />
                      Failed
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}