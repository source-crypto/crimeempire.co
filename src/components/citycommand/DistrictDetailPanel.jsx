import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Building2, AlertTriangle, X, MapPin } from 'lucide-react';

function riskColor(v) {
  if (v >= 70) return 'text-red-400';
  if (v >= 40) return 'text-orange-400';
  return 'text-yellow-400';
}
function riskLabel(v) {
  if (v >= 70) return 'Critical';
  if (v >= 40) return 'Elevated';
  return 'Low';
}

export default function DistrictDetailPanel({ territory, intensity, businesses, intelReports, lawUnits, onClose }) {
  if (!territory) return null;
  return (
    <Card className="glass-panel border-cyan-500/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">{territory.name}</h3>
            {territory.is_contested && <Badge className="bg-red-600 text-white">Contested</Badge>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-purple-500/20">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">Risk Level</span>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${riskColor(intensity)}`}>{riskLabel(intensity)}</p>
            <p className="text-xs text-gray-500">{intensity}/100 · {territory.resource_type}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Local Businesses ({businesses.length})
          </h4>
          {businesses.length === 0 ? (
            <p className="text-xs text-gray-500">No businesses registered in this district.</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {businesses.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-slate-900/40">
                  <span className="text-white truncate">{b.emoji} {b.name}</span>
                  <div className="flex items-center gap-2 text-gray-400 shrink-0">
                    <span>${(b.income_per_hour || 0).toLocaleString()}/hr</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{b.legitimacy}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Active Intelligence ({intelReports.length})
          </h4>
          {intelReports.length === 0 ? (
            <p className="text-xs text-gray-500">No active intel for this district.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {intelReports.map((r) => (
                <div key={r.id} className="text-xs px-2 py-1.5 rounded bg-red-950/30 border border-red-500/20">
                  <p className="text-red-300 font-medium">{r.event_name || r.title}</p>
                  {r.description && <p className="text-gray-400 mt-0.5">{r.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {lawUnits.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Nearby Law Enforcement ({lawUnits.length})
            </h4>
            <div className="space-y-1">
              {lawUnits.map((u) => (
                <div key={u.id} className="flex justify-between text-xs px-2 py-1 rounded bg-blue-950/30">
                  <span className="text-blue-300 capitalize">{u.unit_type}</span>
                  <span className="text-gray-400">Threat {u.threat_level ?? 50}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}