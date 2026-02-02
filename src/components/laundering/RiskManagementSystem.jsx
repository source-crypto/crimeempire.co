import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Shield, Activity, Eye, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function RiskManagementSystem({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [expandedAudit, setExpandedAudit] = useState(null);

  const { data: audits = [] } = useQuery({
    queryKey: ['businessAudits', playerData?.id],
    queryFn: () => base44.entities.BusinessAudit.filter({ 
      player_id: playerData.id,
      status: { $in: ['scheduled', 'in_progress'] }
    }),
    enabled: !!playerData?.id
  });

  const triggerAuditMutation = useMutation({
    mutationFn: async (business) => {
      const severity = business.suspicion_level > 80 ? 'critical' :
                      business.suspicion_level > 60 ? 'major' :
                      business.suspicion_level > 40 ? 'moderate' : 'minor';

      const auditTypes = ['routine_inspection', 'financial_review'];
      if (severity === 'critical') auditTypes.push('raid');

      const selectedType = auditTypes[Math.floor(Math.random() * auditTypes.length)];

      await base44.entities.BusinessAudit.create({
        business_id: business.id,
        player_id: playerData.id,
        audit_type: selectedType,
        suspicion_trigger: business.suspicion_level,
        severity,
        potential_loss: business.suspicion_level * 1000,
        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        evasion_options: [
          { method: 'Bribe Inspector', cost: 50000, success_rate: 70 },
          { method: 'Falsify Records', cost: 30000, success_rate: 60 },
          { method: 'Delay Tactics', cost: 20000, success_rate: 50 }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessAudits']);
      toast.success('Audit generated!');
    }
  });

  const evadeAuditMutation = useMutation({
    mutationFn: async ({ audit, method }) => {
      const successRoll = Math.random() * 100;
      const success = successRoll < method.success_rate;

      if (playerData.balance < method.cost) throw new Error('Insufficient funds');

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - method.cost
      });

      if (success) {
        await base44.entities.BusinessAudit.update(audit.id, {
          status: 'avoided',
          outcome: `Successfully evaded using ${method.method}`
        });

        const business = businesses.find(b => b.id === audit.business_id);
        if (business) {
          await base44.entities.MoneyLaunderingBusiness.update(business.id, {
            suspicion_level: Math.max(0, business.suspicion_level - 10)
          });
        }
      } else {
        await base44.entities.BusinessAudit.update(audit.id, {
          status: 'completed',
          outcome: `Failed to evade - ${method.method} didn't work`,
          evidence_found: true
        });

        const business = businesses.find(b => b.id === audit.business_id);
        if (business) {
          await base44.entities.MoneyLaunderingBusiness.update(business.id, {
            suspicion_level: Math.min(100, business.suspicion_level + 15)
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessAudits']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      toast.success('Evasion attempt processed!');
    },
    onError: (error) => toast.error(error.message)
  });

  const reduceSuspicionMutation = useMutation({
    mutationFn: async (business) => {
      const cost = 75000;
      if (playerData.balance < cost) throw new Error('Insufficient funds');

      await base44.entities.MoneyLaunderingBusiness.update(business.id, {
        suspicion_level: Math.max(0, business.suspicion_level - 25)
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      toast.success('Suspicion reduced via covert operations!');
    },
    onError: (error) => toast.error(error.message)
  });

  const highRiskBusinesses = businesses.filter(b => b.suspicion_level > 60);

  return (
    <div className="space-y-4">
      {/* Risk Overview */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-panel border-red-500/30 bg-gradient-to-r from-red-900/20 to-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Risk Management Center
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-slate-900/50 rounded">
                <p className="text-gray-400">Active Audits</p>
                <p className="text-red-400 font-bold text-lg">{audits.length}</p>
              </div>
              <div className="p-2 bg-slate-900/50 rounded">
                <p className="text-gray-400">High Risk</p>
                <p className="text-orange-400 font-bold text-lg">{highRiskBusinesses.length}</p>
              </div>
              <div className="p-2 bg-slate-900/50 rounded">
                <p className="text-gray-400">Total Businesses</p>
                <p className="text-blue-400 font-bold text-lg">{businesses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Business Risk Status */}
      <Card className="glass-panel border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Business Risk Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {businesses.map(business => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-slate-900/50 rounded border border-purple-500/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs font-semibold">{business.business_name}</span>
                  <Badge className={
                    business.suspicion_level > 70 ? 'bg-red-600' :
                    business.suspicion_level > 40 ? 'bg-orange-600' : 'bg-green-600'
                  }>
                    {business.suspicion_level > 70 ? 'CRITICAL' :
                     business.suspicion_level > 40 ? 'HIGH RISK' : 'LOW RISK'}
                  </Badge>
                </div>

                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">LE Suspicion</span>
                    <span className="text-red-400 font-semibold">{Math.round(business.suspicion_level)}%</span>
                  </div>
                  <Progress value={business.suspicion_level} className="h-1.5" />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => reduceSuspicionMutation.mutate(business)}
                    disabled={reduceSuspicionMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-xs flex-1"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Reduce Suspicion ($75k)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => triggerAuditMutation.mutate(business)}
                    disabled={triggerAuditMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-xs"
                    title="Simulate audit"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Audits */}
      {audits.length > 0 && (
        <Card className="glass-panel border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <Activity className="w-4 h-4 text-red-400" />
              Active LE Audits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {audits.map(audit => {
                  const business = businesses.find(b => b.id === audit.business_id);
                  const isExpanded = expandedAudit === audit.id;

                  return (
                    <motion.div
                      key={audit.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded border border-red-500/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white text-xs font-semibold">{business?.business_name}</p>
                          <p className="text-gray-400 text-[10px] capitalize">{audit.audit_type.replace(/_/g, ' ')}</p>
                        </div>
                        <Badge className={
                          audit.severity === 'critical' ? 'bg-red-700' :
                          audit.severity === 'major' ? 'bg-orange-600' :
                          audit.severity === 'moderate' ? 'bg-yellow-600' : 'bg-blue-600'
                        }>
                          {audit.severity}
                        </Badge>
                      </div>

                      <div className="text-xs text-gray-300 mb-2">
                        Potential Loss: <span className="text-red-400 font-semibold">${audit.potential_loss?.toLocaleString()}</span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-xs mb-2"
                      >
                        {isExpanded ? 'Hide Options' : 'Evasion Options'}
                      </Button>

                      {isExpanded && audit.evasion_options && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="space-y-2 mt-2"
                        >
                          {audit.evasion_options.map((method, idx) => (
                            <div key={idx} className="p-2 bg-slate-800/50 rounded border border-gray-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white text-xs font-semibold">{method.method}</span>
                                <span className="text-green-400 text-xs">{method.success_rate}% success</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-[10px]">Cost: ${method.cost.toLocaleString()}</span>
                                <Button
                                  size="sm"
                                  onClick={() => evadeAuditMutation.mutate({ audit, method })}
                                  disabled={evadeAuditMutation.isPending}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-[10px] h-6"
                                >
                                  Attempt
                                </Button>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}