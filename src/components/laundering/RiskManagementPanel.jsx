import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Shield, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RiskManagementPanel({ playerData, businesses }) {
  const queryClient = useQueryClient();

  const { data: audits = [] } = useQuery({
    queryKey: ['businessAudits', playerData?.id],
    queryFn: () => base44.entities.BusinessAudit.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const triggerAuditMutation = useMutation({
    mutationFn: async (business) => {
      const threatLevel = business.suspicion_level * 0.7 + Math.random() * 30;
      const auditType = threatLevel > 60 ? 'le_raid' : threatLevel > 40 ? 'financial_review' : 'routine_inspection';
      
      await base44.entities.BusinessAudit.create({
        business_id: business.id,
        player_id: playerData.id,
        audit_type: auditType,
        threat_level: threatLevel,
        scheduled_at: new Date(Date.now() + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        bribe_cost: threatLevel * 1000
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessAudits']);
      toast.warning('Audit scheduled!');
    }
  });

  const handleAuditMutation = useMutation({
    mutationFn: async ({ audit, action }) => {
      if (action === 'bribe' && audit.can_be_bribed) {
        if (playerData.balance < audit.bribe_cost) throw new Error('Insufficient funds');

        await base44.entities.BusinessAudit.update(audit.id, {
          audit_status: 'passed',
          completed_at: new Date().toISOString()
        });

        await base44.entities.Player.update(playerData.id, {
          balance: playerData.balance - audit.bribe_cost
        });

        toast.success('Audit resolved through bribery');
      } else if (action === 'pass') {
        const business = businesses.find(b => b.id === audit.business_id);
        const passChance = (100 - business.suspicion_level) * 0.7;
        const success = Math.random() * 100 < passChance;

        const suspicionIncrease = success ? audit.threat_level * 0.2 : audit.threat_level * 0.8;
        const fine = success ? 0 : audit.threat_level * 500;

        await base44.entities.BusinessAudit.update(audit.id, {
          audit_status: success ? 'passed' : 'failed',
          suspicion_impact: suspicionIncrease,
          fine_amount: fine,
          evidence_found: success ? [] : ['Suspicious transactions', 'Irregular accounting'],
          completed_at: new Date().toISOString()
        });

        await base44.entities.MoneyLaunderingBusiness.update(business.id, {
          suspicion_level: Math.min(100, business.suspicion_level + suspicionIncrease)
        });

        if (fine > 0) {
          await base44.entities.Player.update(playerData.id, {
            balance: playerData.balance - fine,
            heat: Math.min(100, (playerData.heat || 0) + audit.threat_level * 0.5)
          });
        }

        toast[success ? 'success' : 'error'](success ? 'Audit passed!' : `Audit failed! Fined $${fine.toLocaleString()}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessAudits']);
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
    },
    onError: (error) => toast.error(error.message)
  });

  const activeAudits = audits.filter(a => ['scheduled', 'in_progress'].includes(a.audit_status));
  const totalRisk = businesses.reduce((sum, b) => sum + b.suspicion_level, 0) / (businesses.length || 1);

  return (
    <div className="space-y-4">
      {/* Risk Overview */}
      <Card className="glass-panel border-red-500/30 bg-gradient-to-br from-red-900/20 to-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Risk Management Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Avg Suspicion</p>
              <p className={`font-bold ${totalRisk > 70 ? 'text-red-400' : totalRisk > 40 ? 'text-orange-400' : 'text-green-400'}`}>
                {Math.round(totalRisk)}%
              </p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Active Audits</p>
              <p className="text-yellow-400 font-bold">{activeAudits.length}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Heat Level</p>
              <p className="text-red-400 font-bold">{Math.round(playerData.heat || 0)}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Overall Risk</span>
              <span className={`font-semibold ${totalRisk > 70 ? 'text-red-400' : 'text-green-400'}`}>
                {totalRisk > 70 ? 'CRITICAL' : totalRisk > 40 ? 'ELEVATED' : 'MANAGEABLE'}
              </span>
            </div>
            <Progress value={totalRisk} className="h-2" />
          </div>

          <p className="text-xs text-gray-400">
            High suspicion increases audit frequency. Lower risk through security upgrades and careful operations.
          </p>
        </CardContent>
      </Card>

      {/* Active Audits */}
      {activeAudits.length > 0 && (
        <Card className="glass-panel border-orange-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <FileText className="w-4 h-4 text-orange-400" />
              Pending Audits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAudits.map(audit => {
              const business = businesses.find(b => b.id === audit.business_id);

              return (
                <motion.div
                  key={audit.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-slate-900/50 rounded border border-orange-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs">
                      <p className="text-white font-semibold">{business?.business_name}</p>
                      <p className="text-gray-400 capitalize">{audit.audit_type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge className={`${
                      audit.threat_level > 70 ? 'bg-red-600' :
                      audit.threat_level > 40 ? 'bg-orange-600' : 'bg-yellow-600'
                    } text-[10px]`}>
                      Threat: {Math.round(audit.threat_level)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400">Scheduled</p>
                      <p className="text-blue-400 font-semibold">
                        {new Date(audit.scheduled_at).toLocaleDateString()}
                      </p>
                    </div>
                    {audit.can_be_bribed && (
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Bribe Cost</p>
                        <p className="text-green-400 font-semibold">${audit.bribe_cost?.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {audit.can_be_bribed && (
                      <Button
                        onClick={() => handleAuditMutation.mutate({ audit, action: 'bribe' })}
                        disabled={handleAuditMutation.isPending}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-xs"
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Bribe
                      </Button>
                    )}
                    <Button
                      onClick={() => handleAuditMutation.mutate({ audit, action: 'pass' })}
                      disabled={handleAuditMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Face Audit
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Business Risk Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {businesses.map(business => {
          const businessAudits = audits.filter(a => a.business_id === business.id);
          const recentFailures = businessAudits.filter(a => a.audit_status === 'failed').length;

          return (
            <Card key={business.id} className="glass-panel border-slate-500/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-semibold">{business.business_name}</p>
                  <Badge className={`${
                    business.suspicion_level > 70 ? 'bg-red-600' :
                    business.suspicion_level > 40 ? 'bg-orange-600' : 'bg-green-600'
                  } text-[10px]`}>
                    {Math.round(business.suspicion_level)} Suspicion
                  </Badge>
                </div>

                <Progress value={business.suspicion_level} className="h-1.5" />

                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="text-gray-400">Total Audits: <span className="text-white">{businessAudits.length}</span></div>
                  <div className="text-gray-400">Failed: <span className="text-red-400">{recentFailures}</span></div>
                </div>

                <Button
                  onClick={() => triggerAuditMutation.mutate(business)}
                  disabled={triggerAuditMutation.isPending}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-[10px]"
                >
                  Simulate Random Audit
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}