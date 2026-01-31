import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Eye, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const vulnerabilityIcons = {
  low_security: '🔓',
  poor_maintenance: '⚙️',
  weak_defense: '🛡️',
  predictable_schedule: '📅',
  understaffed: '👥'
};

export default function LEIntelligenceSystem({ playerData, bases = [] }) {
  const queryClient = useQueryClient();
  const [expandedIntel, setExpandedIntel] = useState(null);

  const { data: intelligences = [] } = useQuery({
    queryKey: ['leIntelligence', playerData?.id],
    queryFn: () => base44.entities.LEIntelligenceGathering.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id
  });

  const gatherIntelMutation = useMutation({
    mutationFn: async (base) => {
      // Simulate LE gathering intel
      const existingIntel = intelligences.find(i => i.base_id === base.id);

      if (existingIntel) {
        const newLevel = Math.min(100, existingIntel.intelligence_level + Math.random() * 25);
        const vulnerabilities = generateVulnerabilities(base, newLevel);
        const raidRec = newLevel > 80 ? 'critical' : newLevel > 60 ? 'red' : newLevel > 40 ? 'yellow' : 'green';

        await base44.entities.LEIntelligenceGathering.update(existingIntel.id, {
          intelligence_level: newLevel,
          surveillance_days: existingIntel.surveillance_days + 1,
          detected_vulnerabilities: vulnerabilities,
          raid_recommendation: raidRec,
          estimated_assets: base.current_storage * Math.random() * 1000,
          last_surveillance: new Date().toISOString()
        });
      } else {
        const vulnerabilities = generateVulnerabilities(base, 0);

        await base44.entities.LEIntelligenceGathering.create({
          base_id: base.id,
          player_id: playerData.id,
          intelligence_level: Math.random() * 20,
          surveillance_days: 1,
          detected_vulnerabilities: vulnerabilities,
          gathering_started: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leIntelligence']);
      toast.success('LE intel gathering in progress...');
    }
  });

  const generateVulnerabilities = (base, intelLevel) => {
    const vulns = [];
    if (base.security_level < 40) vulns.push({ vulnerability_type: 'low_security', severity: 100 - base.security_level });
    if (base.maintenance_health < 50) vulns.push({ vulnerability_type: 'poor_maintenance', severity: 100 - base.maintenance_health });
    if (intelLevel > 30) vulns.push({ vulnerability_type: 'predictable_schedule', severity: Math.random() * 50 + 30 });
    if (intelLevel > 60) vulns.push({ vulnerability_type: 'weak_defense', severity: Math.random() * 40 + 40 });
    return vulns;
  };

  if (!bases.length) {
    return (
      <Card className="glass-panel border-red-500/20 p-4">
        <p className="text-gray-400 text-sm">No bases to monitor</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Overview */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Eye className="w-4 h-4 text-red-400" />
            Law Enforcement Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          LE actively gathers intel on bases with high heat. More vulnerabilities = higher raid probability.
        </CardContent>
      </Card>

      {/* Intel on Each Base */}
      {bases.map((base) => {
        const intel = intelligences.find(i => i.base_id === base.id);

        return (
          <Card key={base.id} className="glass-panel border-orange-500/20">
            <CardHeader>
              <CardTitle
                onClick={() => setExpandedIntel(expandedIntel === base.id ? null : base.id)}
                className="flex items-center justify-between text-white text-sm cursor-pointer hover:text-orange-300"
              >
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-400" />
                  {base.base_name}
                </span>
                <Badge className={
                  intel ? (
                    intel.raid_recommendation === 'critical' ? 'bg-red-600' :
                    intel.raid_recommendation === 'red' ? 'bg-orange-600' :
                    intel.raid_recommendation === 'yellow' ? 'bg-yellow-600' :
                    'bg-green-600'
                  ) : 'bg-gray-600'
                }>
                  {intel?.raid_recommendation?.toUpperCase() || 'MONITORING'}
                </Badge>
              </CardTitle>
            </CardHeader>

            {/* Quick Stats */}
            <CardContent className="space-y-3">
              {intel ? (
                <>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Intelligence Level</span>
                      <span className="text-cyan-400 font-semibold">{Math.round(intel.intelligence_level)}%</span>
                    </div>
                    <Progress value={intel.intelligence_level} className="h-2" />
                  </div>

                  {expandedIntel === base.id && (
                    <div className="space-y-3 pt-3 border-t border-orange-500/20">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-1.5 bg-slate-800/50 rounded">
                          <p className="text-gray-400">Days Surveilled</p>
                          <p className="text-blue-400 font-semibold">{intel.surveillance_days}</p>
                        </div>
                        <div className="p-1.5 bg-slate-800/50 rounded">
                          <p className="text-gray-400">Est. Assets</p>
                          <p className="text-yellow-400 font-semibold">${Math.round(intel.estimated_assets).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Detected Vulnerabilities */}
                      {intel.detected_vulnerabilities?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">Detected Vulnerabilities</p>
                          <div className="space-y-1">
                            {intel.detected_vulnerabilities.map((vuln, idx) => (
                              <div key={idx} className="p-1 bg-red-900/30 rounded text-xs border border-red-500/30 flex items-center gap-1">
                                <span>{vulnerabilityIcons[vuln.vulnerability_type]}</span>
                                <span className="text-gray-300 capitalize">{vuln.vulnerability_type.replace(/_/g, ' ')}</span>
                                <span className="ml-auto text-red-400 font-semibold">{Math.round(vuln.severity)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raid Window */}
                      {intel.optimal_raid_window && (
                        <div className="p-2 bg-slate-800/50 rounded text-xs border border-red-500/30">
                          <p className="text-gray-400">Optimal Raid Window</p>
                          <p className="text-red-400 font-semibold">{intel.optimal_raid_window.day} @ {intel.optimal_raid_window.time}</p>
                          <p className="text-gray-400">Success: {Math.round(intel.optimal_raid_window.success_probability)}%</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => gatherIntelMutation.mutate(base)}
                    className="w-full px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    Continue Surveillance
                  </button>
                </>
              ) : (
                <button
                  onClick={() => gatherIntelMutation.mutate(base)}
                  className="w-full px-2 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold"
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  Begin Intel Gathering
                </button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}