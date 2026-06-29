import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCareerPath } from './careerPaths';
import { Search, Building2, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function JobMarket({ postings, employment, playerData, onApply, loading }) {
  const [filter, setFilter] = useState('all');
  const [applyingId, setApplyingId] = useState(null);

  const paths = ['all', 'corporate', 'logistics', 'security', 'government'];
  const visible = (postings || []).filter((p) => p.status === 'open' && (filter === 'all' || p.career_path === filter));

  const meetsRequirements = (job) => {
    const r = job.requirements || {};
    const checks = [];
    if (r.min_experience && (employment?.experience_points || 0) < r.min_experience) checks.push(`Experience ≥ ${r.min_experience}`);
    if (r.min_performance && (employment?.performance_rating || 0) < r.min_performance) checks.push(`Performance ≥ ${r.min_performance}`);
    return { met: checks.length === 0, missing: checks };
  };

  const handleApply = async (job) => {
    const { met, missing } = meetsRequirements(job);
    if (!met) {
      toast.error(`Not qualified: ${missing.join(', ')}`);
      return;
    }
    setApplyingId(job.id);
    try {
      await onApply(job);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center gap-2"><Search className="w-5 h-5 text-purple-400" />Internal Job Market</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {paths.map((p) => (
              <button key={p} onClick={() => setFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === p ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
                {p === 'all' ? 'All Paths' : getCareerPath(p).name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-gray-400 text-center py-6 text-sm">Loading vacancies…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.length === 0 && !loading && (
          <Card className="glass-panel border border-gray-700 md:col-span-2">
            <CardContent className="flex flex-col items-center py-10 text-gray-500">
              <Briefcase className="w-10 h-10 mb-2 opacity-30" />
              <p>No open vacancies in this category right now.</p>
            </CardContent>
          </Card>
        )}
        {visible.map((job) => {
          const path = getCareerPath(job.career_path);
          const { met, missing } = meetsRequirements(job);
          const isMyJob = employment?.employer_name === job.organization_name && employment?.job_title === job.job_title;
          return (
            <Card key={job.id} className={`glass-panel border ${path.accent}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-base">{job.job_title}</CardTitle>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" />{job.organization_name}</p>
                  </div>
                  <span className="text-2xl">{path.icon}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="bg-slate-700">{path.name} · Lv {job.career_level}</Badge>
                  <Badge className="bg-green-800">${job.salary_min?.toLocaleString()}–${job.salary_max?.toLocaleString()}</Badge>
                  <Badge variant="outline" className="text-gray-300">{job.pay_type}</Badge>
                  <Badge variant="outline" className="text-gray-300">{job.contract_duration_days}d contract</Badge>
                </div>
                <p className="text-xs text-gray-400">{job.description}</p>

                <div className="bg-slate-900/50 rounded p-2 border border-gray-700 text-xs space-y-1">
                  <p className="text-gray-300 font-semibold">Requirements</p>
                  {job.requirements?.min_experience ? <p className={missing.includes(`Experience ≥ ${job.requirements.min_experience}`) ? 'text-red-400' : 'text-green-400'}>{missing.includes(`Experience ≥ ${job.requirements.min_experience}`) ? '✗' : '✓'} Experience ≥ {job.requirements.min_experience} XP</p> : <p className="text-green-400">✓ No experience floor</p>}
                  {job.requirements?.min_performance ? <p className={missing.includes(`Performance ≥ ${job.requirements.min_performance}`) ? 'text-red-400' : 'text-green-400'}>{missing.includes(`Performance ≥ ${job.requirements.min_performance}`) ? '✗' : '✓'} Performance ≥ {job.requirements.min_performance}</p> : null}
                </div>

                <div className="bg-slate-900/50 rounded p-2 border border-gray-700 text-xs">
                  <p className="text-gray-300 font-semibold mb-1">Benefits</p>
                  <div className="flex flex-wrap gap-1">
                    {job.benefits?.profit_sharing_pct ? <Badge variant="secondary" className="text-xs">{job.benefits.profit_sharing_pct}% profit share</Badge> : null}
                    {job.benefits?.vacation_days ? <Badge variant="secondary" className="text-xs">{job.benefits.vacation_days}d vacation</Badge> : null}
                    {job.benefits?.health_insurance ? <Badge variant="secondary" className="text-xs">Health ins.</Badge> : null}
                    {job.benefits?.pension_pct ? <Badge variant="secondary" className="text-xs">{job.benefits.pension_pct}% pension</Badge> : null}
                  </div>
                </div>

                <Button onClick={() => handleApply(job)} disabled={!!isMyJob || !!applyingId} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40">
                  {isMyJob ? 'Current Position' : applyingId === job.id ? 'Applying…' : met ? '📝 Apply Now' : 'View Qualifications'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}