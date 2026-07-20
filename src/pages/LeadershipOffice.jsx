import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, Landmark, Users, HardHat, HeartPulse, GraduationCap, Home, Factory, ShoppingBag, Plane, Wifi, Fuel, Cpu, TrendingUp } from 'lucide-react';
import { LEADERSHIP_TITLES, currentLeadershipTitle, nextLeadershipTitle, computeGovernanceStats } from '@/lib/empireMetrics';

const BAR_CLASS = {
  'text-green-400': 'bg-green-400',
  'text-pink-400': 'bg-pink-400',
  'text-cyan-400': 'bg-cyan-400',
  'text-purple-400': 'bg-purple-400',
  'text-red-400': 'bg-red-400',
  'text-amber-400': 'bg-amber-400',
  'text-orange-400': 'bg-orange-400',
  'text-blue-400': 'bg-blue-400',
};

function MetricBar({ label, value, icon: Icon, color = 'text-cyan-400' }) {
  return (
    <div className="px-2 py-2 rounded-lg bg-slate-900/40">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 flex items-center gap-1.5"><Icon className={`w-3.5 h-3.5 ${color}`} />{label}</span>
        <span className={`text-xs font-bold ${color}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${BAR_CLASS[color] || 'bg-cyan-400'}`} style={{ width: `${Math.min(100, typeof value === 'number' ? value : 0)}%` }} />
      </div>
    </div>
  );
}

export default function LeadershipOffice() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: player } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0] || null; },
    enabled: !!user?.email,
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['govProperties', player?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: player.id }, '-acquired_at', 100),
    enabled: !!player?.id,
  });
  const { data: territories = [] } = useQuery({ queryKey: ['govTerritories'], queryFn: () => base44.entities.Territory.list() });
  const { data: employments = [] } = useQuery({
    queryKey: ['govEmployment', player?.id],
    queryFn: () => base44.entities.Employment.filter({ player_id: player.id }),
    enabled: !!player?.id,
  });
  const { data: macroData = [] } = useQuery({ queryKey: ['govMacro'], queryFn: () => base44.entities.MacroEconomicData.list() });

  const myTerritories = useMemo(() => territories.filter((t) => t.controlling_crew_id === player?.crew_id), [territories, player]);
  const gov = useMemo(() => computeGovernanceStats({ player, properties, territories, employments, macroData, myTerritories }), [player, properties, territories, employments, macroData, myTerritories]);

  if (!player) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  const title = currentLeadershipTitle(player.level || 1);
  const nextTitle = nextLeadershipTitle(player.level || 1);
  const titleIdx = LEADERSHIP_TITLES.findIndex((t) => t.title === title.title);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Landmark className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Office of the Mayor & President</h1>
          <p className="text-sm text-gray-400">City governance dashboard & leadership progression</p>
        </div>
      </div>

      <Card className="glass-panel border-amber-500/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center"><Crown className="w-6 h-6 text-slate-900" /></div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Current Office</p>
                <p className="text-xl font-bold text-amber-300">{title.title}</p>
                <p className="text-xs text-gray-400">{player.username || 'Operative'} · Level {player.level || 1}</p>
              </div>
            </div>
            {nextTitle && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Next Rank</p>
                <p className="text-sm font-bold text-purple-300">{nextTitle.title}</p>
                <p className="text-xs text-gray-500">Unlocks at Lvl {nextTitle.minLevel}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
            {LEADERSHIP_TITLES.map((t, i) => (
              <div key={t.title} className="flex items-center shrink-0">
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${i <= titleIdx ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-slate-700 text-gray-500'}`}>
                  {t.title}
                </div>
                {i < LEADERSHIP_TITLES.length - 1 && <div className={`w-4 h-px ${i < titleIdx ? 'bg-amber-500/40' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center gap-2"><Users className="w-4 h-4 text-green-400" /> Population</h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">Total Population</span>
            <span className="text-lg font-bold text-green-400">{gov.population.total.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <MetricBar label="Growth %" value={gov.population.growth} icon={TrendingUp} color="text-green-400" />
            <MetricBar label="Happiness" value={gov.population.happiness} icon={HeartPulse} color="text-pink-400" />
            <MetricBar label="Employment" value={gov.population.employment} icon={Users} color="text-cyan-400" />
            <MetricBar label="Education" value={gov.population.education} icon={GraduationCap} color="text-purple-400" />
            <MetricBar label="Healthcare" value={gov.population.healthcare} icon={HeartPulse} color="text-red-400" />
            <MetricBar label="Housing" value={gov.population.housingAvail} icon={Home} color="text-amber-400" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-panel border-cyan-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center gap-2"><Factory className="w-4 h-4 text-cyan-400" /> Economy</h3>
            <div className="flex justify-between mb-3"><span className="text-xs text-gray-400">City GDP</span><span className="text-lg font-bold text-cyan-400">${gov.economy.gdp.toLocaleString()}</span></div>
            <div className="space-y-2">
              <MetricBar label="Inflation" value={Math.round(gov.economy.inflation * 10) / 10} icon={TrendingUp} color="text-orange-400" />
              <MetricBar label="Manufacturing" value={gov.economy.manufacturing} icon={Factory} color="text-blue-400" />
              <MetricBar label="Retail" value={gov.economy.retail} icon={ShoppingBag} color="text-green-400" />
              <MetricBar label="Tourism" value={gov.economy.tourism} icon={Plane} color="text-purple-400" />
              <MetricBar label="Tech Sector" value={gov.economy.tech} icon={Cpu} color="text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="glass-panel border-amber-500/20">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center gap-2"><HardHat className="w-4 h-4 text-amber-400" /> Infrastructure</h3>
              <div className="flex justify-between mb-2"><span className="text-xs text-gray-400">Infrastructure Index</span><span className="text-lg font-bold text-amber-400">{gov.infrastructure}/100</span></div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: `${gov.infrastructure}%` }} /></div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-cyan-400" /> Connectivity</span>
                <span className="flex items-center gap-1"><Fuel className="w-3 h-3 text-amber-400" /> Utilities</span>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-red-500/20">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wide flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-400" /> Public Services</h3>
              <div className="flex justify-between mb-2"><span className="text-xs text-gray-400">Services Index</span><span className="text-lg font-bold text-red-400">{gov.publicServices}/100</span></div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 to-pink-400 rounded-full" style={{ width: `${gov.publicServices}%` }} /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}