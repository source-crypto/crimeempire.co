import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, FileSearch, Crosshair } from 'lucide-react';

const tiers = [
  { tier: 0, name: 'Clear', threat: 0, units: 0 },
  { tier: 1, name: 'Monitoring', threat: 25, units: 1 },
  { tier: 2, name: 'Active Investigation', threat: 50, units: 3 },
  { tier: 3, name: 'Urgent', threat: 75, units: 5 },
  { tier: 4, name: 'Apprehension', threat: 100, units: 10 }
];

const tactics = [
  { name: 'Wiretapping', code: 'wiretap', effectiveness: 0.7 },
  { name: 'Surveillance', code: 'surveillance', effectiveness: 0.8 },
  { name: 'Informant Network', code: 'informant', effectiveness: 0.9 },
  { name: 'Evidence Collection', code: 'evidence', effectiveness: 0.6 },
  { name: 'Undercover Operation', code: 'undercover', effectiveness: 0.95 }
];

export default function LawEnforcementInvestigationTracker({ playerData, playerReputation }) {
  const queryClient = useQueryClient();
  const [expandedDetails, setExpandedDetails] = useState(false);

  const { data: leResponse } = useQuery({
    queryKey: ['lawEnforcementResponse', playerData?.id],
    queryFn: async () => {
      const le = await base44.entities.LawEnforcementResponse.filter({ player_id: playerData.id });
      if (le.length === 0) {
        await base44.entities.LawEnforcementResponse.create({
          player_id: playerData.id,
          investigation_tier: 0,
          current_investigation: 'none',
          surveillance_units: 0,
          raid_probability: 0,
          evidence_collected: [],
          tactics: []
        });
        return (await base44.entities.LawEnforcementResponse.filter({ player_id: playerData.id }))[0];
      }
      return le[0];
    },
    enabled: !!playerData?.id
  });

  const updateInvestigationMutation = useMutation({
    mutationFn: async () => {
      if (!leResponse || !playerReputation) return;

      const heatImpact = playerReputation.law_enforcement_heat / 100;
      const baseEscalation = 5 + (heatImpact * 20);
      const escalation = Math.random() * baseEscalation;

      let newTier = Math.min(4, Math.floor(leResponse.investigation_tier + escalation / 25));
      const tierInfo = tiers[newTier];

      const newTactics = [];
      if (newTier >= 1 && Math.random() > 0.5) newTactics.push('surveillance');
      if (newTier >= 2 && Math.random() > 0.6) newTactics.push('informant');
      if (newTier >= 3 && Math.random() > 0.7) newTactics.push('undercover');
      if (newTier >= 4) newTactics.push('evidence');

      const raidProb = tierInfo.threat * (1 + heatImpact);

      await base44.entities.LawEnforcementResponse.update(leResponse.id, {
        investigation_tier: newTier,
        current_investigation: tierInfo.name,
        surveillance_units: tierInfo.units,
        raid_probability: Math.min(100, raidProb),
        tactics: newTactics,
        last_activity: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lawEnforcementResponse']);
    }
  });

  const addEvidenceMutation = useMutation({
    mutationFn: async (evidence) => {
      if (!leResponse) return;

      const newEvidence = [
        ...(leResponse.evidence_collected || []),
        {
          evidence_type: evidence,
          location: 'Unknown',
          credibility: Math.floor(Math.random() * 100),
          timestamp: new Date().toISOString()
        }
      ];

      await base44.entities.LawEnforcementResponse.update(leResponse.id, {
        evidence_collected: newEvidence
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lawEnforcementResponse']);
    }
  });

  if (!leResponse) return <div className="text-white">Loading investigation data...</div>;

  const tierInfo = tiers[leResponse.investigation_tier];
  const threatColor = leResponse.investigation_tier === 0 ? 'text-green-400' :
                      leResponse.investigation_tier === 1 ? 'text-yellow-400' :
                      leResponse.investigation_tier === 2 ? 'text-orange-400' :
                      leResponse.investigation_tier === 3 ? 'text-red-400' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* Investigation Status */}
      <Card className="glass-panel border-yellow-500/30 bg-gradient-to-r from-slate-900/50 via-yellow-900/20 to-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5 text-yellow-400" />
            Law Enforcement Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Current Investigation</p>
              <p className={`text-2xl font-bold ${threatColor}`}>{tierInfo.name}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Threat Level</p>
              <p className="text-3xl font-bold text-red-400">{leResponse.investigation_tier}/4</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Surveillance Units</p>
              <p className="text-lg font-bold text-cyan-400">{leResponse.surveillance_units}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Raid Probability</p>
              <p className={`text-lg font-bold ${leResponse.raid_probability > 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                {Math.round(leResponse.raid_probability)}%
              </p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Evidence Count</p>
              <p className="text-lg font-bold text-orange-400">{leResponse.evidence_collected?.length || 0}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">Active Tactics</p>
              <p className="text-lg font-bold text-purple-400">{leResponse.tactics?.length || 0}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Investigation Progress</span>
              <span className="text-gray-300">{Math.round((leResponse.investigation_tier / 4) * 100)}%</span>
            </div>
            <Progress value={(leResponse.investigation_tier / 4) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Investigation Details */}
      <Card className="glass-panel border-orange-500/20">
        <CardHeader>
          <CardTitle 
            onClick={() => setExpandedDetails(!expandedDetails)}
            className="flex items-center gap-2 text-white cursor-pointer hover:text-orange-300"
          >
            <FileSearch className="w-4 h-4 text-orange-400" />
            Investigation Details
          </CardTitle>
        </CardHeader>
        {expandedDetails && (
          <CardContent className="space-y-3">
            {/* Active Tactics */}
            {leResponse.tactics && leResponse.tactics.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Active Tactics:</p>
                <div className="space-y-1">
                  {leResponse.tactics.map((tacticCode) => {
                    const tactic = tactics.find(t => t.code === tacticCode);
                    return (
                      <div key={tacticCode} className="p-1.5 bg-slate-800/50 rounded text-xs flex justify-between">
                        <span className="text-white">{tactic?.name || tacticCode}</span>
                        <span className="text-yellow-400">{Math.round(tactic?.effectiveness * 100 || 0)}% effective</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evidence */}
            {leResponse.evidence_collected && leResponse.evidence_collected.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Collected Evidence:</p>
                <div className="space-y-1">
                  {leResponse.evidence_collected.slice(-5).map((ev, idx) => (
                    <div key={idx} className="p-1.5 bg-slate-800/50 rounded text-xs">
                      <div className="flex justify-between">
                        <span className="text-white">{ev.evidence_type}</span>
                        <span className={`font-semibold ${ev.credibility > 70 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {ev.credibility}% credible
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agency */}
            <div className="p-2 bg-slate-800/50 rounded text-xs">
              <p className="text-gray-400">Lead Agency</p>
              <p className="text-white font-semibold capitalize">{leResponse.agency_type?.replace(/_/g, ' ')}</p>
            </div>

            <button
              onClick={() => updateInvestigationMutation.mutate()}
              className="w-full mt-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
            >
              Simulate Investigation Progress
            </button>
          </CardContent>
        )}
      </Card>

      {/* Heat Warning */}
      {leResponse.investigation_tier >= 3 && (
        <Card className="glass-panel border-red-500/50 bg-red-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              ⚠️ CRITICAL THREAT
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-red-300">
            <p>Federal agencies involved. High risk of raids and asset seizure.</p>
            <p className="mt-2">Recommended: Reduce heat, go underground, or negotiate.</p>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">🔍 Investigation Mechanics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-gray-400">
          <p>• Heat increases investigation tier</p>
          <p>• Higher tiers deploy more units and tactics</p>
          <p>• Evidence credibility affects conviction risk</p>
          <p>• Reducing heat can lower investigation status</p>
          <p>• Raids occur when probability exceeds random chance</p>
        </CardContent>
      </Card>
    </div>
  );
}