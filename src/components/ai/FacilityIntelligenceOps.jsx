import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const facilityRiskLevels = {
  laboratory: { risk: 90, equipment: ['Chemistry Set', 'Precursor Chemicals'] },
  workshop: { risk: 75, equipment: ['Illegal Machinery', 'Counterfeit Tools'] },
  armory: { risk: 85, equipment: ['Weapons Cache', 'Ammunition'] },
  garage: { risk: 50, equipment: ['Modified Vehicles', 'License Plates'] },
  intelligence: { risk: 70, equipment: ['Servers', 'Encrypted Drives'] },
  storage: { risk: 60, equipment: ['Contraband', 'Packaged Goods'] },
  barracks: { risk: 40, equipment: ['Personnel Gear'] },
  medical: { risk: 30, equipment: ['Medical Supplies'] }
};

export default function FacilityIntelligenceOps({ selectedBase }) {
  const queryClient = useQueryClient();
  const [expandedFacility, setExpandedFacility] = useState(null);

  const { data: facilities = [] } = useQuery({
    queryKey: ['baseFacilities', selectedBase?.id],
    queryFn: () => base44.entities.BaseFacility.filter({ base_id: selectedBase.id }),
    enabled: !!selectedBase?.id
  });

  const { data: intelRecords = [] } = useQuery({
    queryKey: ['facilityIntel', selectedBase?.id],
    queryFn: async () => {
      const allIntel = await base44.entities.FacilityIntelligence.list();
      return allIntel.filter(i => i.base_id === selectedBase.id);
    },
    enabled: !!selectedBase?.id
  });

  const gatherIntelMutation = useMutation({
    mutationFn: async (facility) => {
      const existingIntel = intelRecords.find(i => i.facility_id === facility.id);
      const riskInfo = facilityRiskLevels[facility.facility_type] || { risk: 50, equipment: [] };

      const detectedActivity = [
        { activity_type: 'illegal_production', detected_at: new Date().toISOString(), severity: Math.random() * riskInfo.risk },
        { activity_type: 'suspicious_traffic', detected_at: new Date().toISOString(), severity: Math.random() * 60 }
      ];

      const productionEstimate = facility.production_rate * 24 * 1000 * (Math.random() * 2);

      if (existingIntel) {
        const newIntelLevel = Math.min(100, existingIntel.intel_level + Math.random() * 30);
        const risk = newIntelLevel > 80 ? 'critical' : newIntelLevel > 60 ? 'high' : newIntelLevel > 40 ? 'medium' : 'low';

        await base44.entities.FacilityIntelligence.update(existingIntel.id, {
          intel_level: newIntelLevel,
          detected_activity: [...(existingIntel.detected_activity || []), ...detectedActivity],
          production_estimate: productionEstimate,
          equipment_detected: riskInfo.equipment,
          risk_assessment: risk,
          last_surveillance: new Date().toISOString()
        });
      } else {
        await base44.entities.FacilityIntelligence.create({
          facility_id: facility.id,
          base_id: selectedBase.id,
          player_id: selectedBase.player_id,
          intel_level: Math.random() * 25,
          detected_activity: detectedActivity,
          production_estimate: productionEstimate,
          equipment_detected: riskInfo.equipment,
          risk_assessment: 'low',
          last_surveillance: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['facilityIntel']);
      toast.success('LE intel mission completed!');
    }
  });

  if (!selectedBase) {
    return (
      <Card className="glass-panel border-gray-500/20 p-4">
        <p className="text-gray-400 text-sm">Select a base to view facility intelligence</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Target className="w-4 h-4 text-blue-400" />
            Facility Intelligence Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          LE conducts targeted surveillance on high-risk facilities to build raid cases
        </CardContent>
      </Card>

      {/* Facilities */}
      {facilities.map(facility => {
        const intel = intelRecords.find(i => i.facility_id === facility.id);
        const riskInfo = facilityRiskLevels[facility.facility_type];

        return (
          <Card key={facility.id} className="glass-panel border-cyan-500/20">
            <CardHeader>
              <CardTitle
                onClick={() => setExpandedFacility(expandedFacility === facility.id ? null : facility.id)}
                className="flex items-center justify-between text-white text-sm cursor-pointer hover:text-cyan-300"
              >
                <span className="capitalize">{facility.facility_type} - {facility.facility_name}</span>
                <div className="flex items-center gap-2">
                  <Badge className={
                    intel?.risk_assessment === 'critical' ? 'bg-red-600' :
                    intel?.risk_assessment === 'high' ? 'bg-orange-600' :
                    intel?.risk_assessment === 'medium' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }>
                    {intel?.risk_assessment?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  <Badge className="bg-slate-700">
                    Risk: {riskInfo?.risk || 50}%
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {intel && (
                <>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Intel Level</span>
                      <span className="text-cyan-400 font-semibold">{Math.round(intel.intel_level)}%</span>
                    </div>
                    <Progress value={intel.intel_level} className="h-2" />
                  </div>

                  {expandedFacility === facility.id && (
                    <div className="space-y-2 pt-2 border-t border-cyan-500/20">
                      {/* Detected Equipment */}
                      {intel.equipment_detected?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">Detected Equipment</p>
                          <div className="flex flex-wrap gap-1">
                            {intel.equipment_detected.map((eq, idx) => (
                              <Badge key={idx} className="bg-red-800 text-[10px]">{eq}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Production Estimate */}
                      <div className="p-2 bg-slate-800/50 rounded text-xs">
                        <p className="text-gray-400">Est. Production Value</p>
                        <p className="text-yellow-400 font-bold">${(intel.production_estimate || 0).toLocaleString()}</p>
                      </div>

                      {/* Detected Activity */}
                      {intel.detected_activity?.slice(-3).map((activity, idx) => (
                        <div key={idx} className="p-1.5 bg-orange-900/30 rounded text-[10px] border border-orange-500/30">
                          <span className="text-orange-400 capitalize">{activity.activity_type.replace(/_/g, ' ')}</span>
                          <span className="text-gray-400 ml-2">Severity: {Math.round(activity.severity)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => gatherIntelMutation.mutate(facility)}
                disabled={gatherIntelMutation.isPending}
                className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                <Search className="w-3 h-3 inline mr-1" />
                {intel ? 'Continue Intel' : 'Begin Intel Mission'}
              </button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}