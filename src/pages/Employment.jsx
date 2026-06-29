import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Briefcase, LineChart, Receipt, Handshake, Loader2 } from 'lucide-react';

import { CAREER_PATHS, getCareerPath, getLevel, getNextLevel, xpToPromote } from '@/components/employment/careerPaths';
import CareerDashboard from '@/components/employment/CareerDashboard';
import JobMarket from '@/components/employment/JobMarket';
import PerformanceCenter from '@/components/employment/PerformanceCenter';
import TransparencyPanel, { computeSalaryBreakdown } from '@/components/employment/TransparencyPanel';
import RetirementPanel from '@/components/employment/RetirementPanel';

const TABS = [
  { id: 'career', label: 'My Career', icon: Briefcase },
  { id: 'market', label: 'Job Market', icon: Briefcase },
  { id: 'performance', label: 'Performance', icon: LineChart },
  { id: 'transparency', label: 'Salary & Transparency', icon: Receipt },
  { id: 'retirement', label: 'Retirement & Founding', icon: Handshake },
];

export default function Employment() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('career');
  const [pendingPay, setPendingPay] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [runningReview, setRunningReview] = useState(false);

  // Auth + player
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0]; },
    enabled: !!user,
  });

  // Employment record (one per player)
  const { data: employmentList, isLoading: empLoading } = useQuery({
    queryKey: ['employment', user?.email],
    queryFn: async () => base44.entities.Employment.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const employment = employmentList?.[0];

  // Job postings (internal market)
  const { data: postings, isLoading: postingsLoading } = useQuery({
    queryKey: ['jobpostings'],
    queryFn: () => base44.entities.JobPosting.list('-created_date', 50),
  });

  // Performance metrics
  const { data: metrics } = useQuery({
    queryKey: ['performance-metrics', employment?.player_id],
    queryFn: () => base44.entities.PerformanceMetric.filter({ player_id: employment.player_id }),
    enabled: !!employment?.player_id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['employment', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['jobpostings'] });
    queryClient.invalidateQueries({ queryKey: ['performance-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['player', user?.email] });
  };

  // ---- Enter the labor market (first-time init) ----
  const enterMarket = useMutation({
    mutationFn: async ({ pathKey }) => {
      const path = getCareerPath(pathKey);
      const level = path.levels[0];
      const now = new Date().toISOString();
      const initXp = (playerData?.experience || 0) / 100; // carry some player XP
      const rec = await base44.entities.Employment.create({
        player_id: playerData.id,
        username: playerData.username,
        employment_status: 'seeking',
        career_path: pathKey,
        job_title: level.title,
        career_level: level.level,
        salary: level.salary,
        pay_type: 'fixed',
        performance_rating: 70,
        experience_points: Math.floor(initXp),
        tenure_days: 0,
        pension_accrued: 0,
        retirement_eligible: false,
        certifications: [],
        employment_history: [],
        hired_at: now,
      });
      return rec;
    },
    onSuccess: () => { toast.success('Welcome to the labor market!'); invalidateAll(); },
    onError: (e) => toast.error('Failed to enter market: ' + (e.message || 'error')),
  });

  // ---- Apply for a job (auto-hire if qualified) ----
  const applyJob = useMutation({
    mutationFn: async (job) => {
      const salary = Math.floor((job.salary_min + job.salary_max) / 2);
      const history = (employment.employment_history || []).slice();
      if (employment.employment_status === 'employed' || employment.employment_status === 'self_employed') {
        history.unshift({
          employer_name: employment.employer_name,
          job_title: employment.job_title,
          career_path: employment.career_path,
          level: employment.career_level,
          salary: employment.salary,
          start_date: employment.hired_at,
          end_date: new Date().toISOString(),
          reason: 'Left for new position',
        });
      }
      const updated = await base44.entities.Employment.update(employment.id, {
        employment_status: 'employed',
        employer_id: job.organization_id || '',
        employer_name: job.organization_name,
        employer_type: job.organization_type || 'organization',
        business_id: '',
        career_path: job.career_path,
        job_title: job.job_title,
        career_level: job.career_level,
        salary,
        pay_type: job.pay_type,
        tenure_days: 0,
        hired_at: new Date().toISOString(),
        employment_history: history,
      });
      // mark posting filled
      await base44.entities.JobPosting.update(job.id, {
        status: 'filled',
        filled_by_player_id: playerData.id,
        applicants: [...(job.applicants || []), { player_id: playerData.id, username: playerData.username, applied_at: new Date().toISOString() }],
      });
      return updated;
    },
    onSuccess: () => { toast.success('🎉 Hired! Your application was accepted.'); invalidateAll(); setTab('career'); },
    onError: (e) => toast.error('Application failed: ' + (e.message || 'error')),
  });

  // ---- Collect paycheck ----
  const collectPay = useMutation({
    mutationFn: async () => {
      const b = computeSalaryBreakdown(employment);
      if (employment.employment_status === 'retired') {
        const pension = Math.floor((employment.pension_accrued || 0) * 0.02);
        if (pension <= 0) throw new Error('No pension available');
        await base44.entities.Player.update(playerData.id, { buy_power: (playerData.buy_power || 0) + pension });
        await base44.entities.Employment.update(employment.id, { last_paid_at: new Date().toISOString() });
        return pension;
      }
      // employed: gain net pay + XP + pension accrual + tenure
      const xpGain = 80 + Math.floor(employment.career_level * 20);
      const newXp = (employment.experience_points || 0) + xpGain;
      await base44.entities.Player.update(playerData.id, {
        buy_power: (playerData.buy_power || 0) + b.net,
        experience: (playerData.experience || 0) + xpGain,
      });
      await base44.entities.Employment.update(employment.id, {
        experience_points: newXp,
        tenure_days: (employment.tenure_days || 0) + 1,
        pension_accrued: (employment.pension_accrued || 0) + b.pension,
        last_paid_at: new Date().toISOString(),
      });
      return b.net;
    },
    onMutate: () => setPendingPay(true),
    onSuccess: (amt) => { toast.success(`💰 Collected $${amt.toLocaleString()} net pay.`); invalidateAll(); },
    onError: (e) => toast.error(e.message || 'Could not collect pay'),
    onSettled: () => setPendingPay(false),
  });

  // ---- Promote ----
  const promote = useMutation({
    mutationFn: async () => {
      const next = getNextLevel(employment.career_path, employment.career_level);
      if (!next) throw new Error('Already at top level');
      if ((employment.experience_points || 0) < xpToPromote(employment.career_level)) throw new Error('Not enough XP');
      if ((employment.performance_rating || 0) < 65) throw new Error('Performance too low');
      await base44.entities.Employment.update(employment.id, {
        career_level: next.level,
        job_title: next.title,
        salary: next.salary,
        experience_points: (employment.experience_points || 0) - xpToPromote(employment.career_level),
      });
      return next;
    },
    onSuccess: (next) => { toast.success(`⬆️ Promoted to ${next.title}!`); invalidateAll(); },
    onError: (e) => toast.error(e.message || 'Promotion failed'),
  });

  // ---- Run performance review (deterministic + slight variance) ----
  const runReview = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const label = `${now.getFullYear()}-${tab === 'performance' ? 'M' + (now.getMonth() + 1) : 'W' + Math.ceil(now.getDate() / 7)}`;
      const base = employment.performance_rating || 70;
      const rand = (c, spread) => Math.max(0, Math.min(100, Math.round(base + (Math.random() - 0.5) * spread + c)));
      const kpis = {
        productivity: rand(2, 20),
        attendance: rand(5, 15),
        reliability: rand(0, 20),
        leadership: rand(Math.max(0, employment.career_level * 4 - 10), 25),
        teamwork: rand(0, 20),
        efficiency: rand(3, 18),
        innovation: rand(-5, 30),
        customer_satisfaction: rand(0, 20),
        training_progress: Math.min(100, (employment.experience_points % 400) / 4),
      };
      const overall = Math.round(Object.values(kpis).reduce((s, v) => s + v, 0) / 9);
      const period = 'monthly';
      const existing = (metrics || []).find((m) => m.period === period);
      const notes = `Review for ${label}. Overall ${overall}/100. ${overall >= 80 ? 'Outstanding performance.' : overall >= 65 ? 'Meets expectations.' : 'Improvement needed.'}`;
      if (existing) {
        await base44.entities.PerformanceMetric.update(existing.id, { ...kpis, overall_score: overall, period_label: label, notes, updated_at: now.toISOString() });
        await base44.entities.Employment.update(employment.id, { performance_rating: overall });
      } else {
        await base44.entities.PerformanceMetric.create({ player_id: employment.player_id, username: employment.username, period, period_label: label, ...kpis, overall_score: overall, notes, updated_at: now.toISOString() });
        await base44.entities.Employment.update(employment.id, { performance_rating: overall });
      }
      return overall;
    },
    onMutate: () => setRunningReview(true),
    onSuccess: (overall) => { toast.success(`Performance review complete: ${overall}/100`); invalidateAll(); },
    onError: (e) => toast.error('Review failed: ' + (e.message || 'error')),
    onSettled: () => setRunningReview(false),
  });

  // ---- AI performance analysis ----
  const aiReview = useMutation({
    mutationFn: async () => {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a transparent performance analyst for a career simulation game. Analyze this employee and give concise, specific feedback (under 120 words). Path: ${employment.career_path}, Title: ${employment.job_title}, Level: ${employment.career_level}, Current performance: ${employment.performance_rating}/100, XP: ${employment.experience_points}, Tenure: ${employment.tenure_days} days. Provide: (1) one strength, (2) one area to improve, (3) one concrete action to earn the next promotion.`,
        response_json_schema: { type: 'object', properties: { feedback: { type: 'string' } }, required: ['feedback'] },
      });
      return res.feedback;
    },
    onMutate: () => setRunningReview(true),
    onSuccess: (fb) => { toast.success('AI analysis ready', { description: fb, duration: 8000 }); },
    onError: () => toast.error('AI analysis unavailable right now'),
    onSettled: () => setRunningReview(false),
  });

  // ---- Retire ----
  const retire = useMutation({
    mutationFn: async () => {
      await base44.entities.Employment.update(employment.id, {
        employment_status: 'retired',
        retirement_eligible: true,
        employment_history: [...(employment.employment_history || []), {
          employer_name: employment.employer_name, job_title: employment.job_title, career_path: employment.career_path, level: employment.career_level, salary: employment.salary, start_date: employment.hired_at, end_date: new Date().toISOString(), reason: 'Retired (top level)',
        }],
      });
    },
    onMutate: () => setRetiring(true),
    onSuccess: () => { toast.success('🏖️ You have retired. Collect your pension.'); invalidateAll(); },
    onError: (e) => toast.error(e.message || 'Retirement failed'),
    onSettled: () => setRetiring(false),
  });

  // ---- Found your own organization (entrepreneurship) ----
  const foundCompany = useMutation({
    mutationFn: async () => {
      await base44.entities.Employment.update(employment.id, {
        employment_status: 'self_employed',
        employer_name: `${playerData.username || 'My'} Organization`,
        employer_type: 'self_owned',
        career_path: 'entrepreneurship',
        career_level: 1,
        job_title: 'Founder',
        salary: 0,
        pay_type: 'fixed',
        tenure_days: 0,
        hired_at: new Date().toISOString(),
        employment_history: [...(employment.employment_history || []), {
          employer_name: employment.employer_name, job_title: employment.job_title, career_path: employment.career_path, level: employment.career_level, salary: employment.salary, start_date: employment.hired_at, end_date: new Date().toISOString(), reason: 'Resigned to found own organization',
        }],
      });
      // auto-post one founder vacancy so the market is alive
      await base44.entities.JobPosting.create({
        organization_name: `${playerData.username || 'My'} Organization`,
        organization_type: 'organization',
        job_title: 'Operations Manager',
        career_path: 'logistics',
        career_level: 2,
        salary_min: 3000, salary_max: 5000,
        pay_type: 'fixed',
        contract_duration_days: 30,
        description: 'Help run the newly founded organization.',
        requirements: { min_experience: 250, min_performance: 60 },
        benefits: { profit_sharing_pct: 5, vacation_days: 7, health_insurance: true, pension_pct: 4 },
        status: 'open',
        applicants: [],
        posted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => { toast.success('🚀 You founded your own organization!'); invalidateAll(); },
    onError: (e) => toast.error(e.message || 'Founding failed'),
  });

  // ---- First-time: choose career path to enter the market ----
  const [chosenPath, setChosenPath] = useState('corporate');

  if (empLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading labor market…</div>;
  }

  if (!employment) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="glass-panel border border-purple-500/20 p-6 rounded-xl text-center">
          <Briefcase className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Enter the Living Labor Market</h1>
          <p className="text-gray-400 mt-1 text-sm">Every player exists in a labor market — get hired, climb the ladder, or found your own organization. Choose a starting career path to begin.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CAREER_PATHS.filter((p) => p.key !== 'entrepreneurship').map((p) => (
            <button key={p.key} onClick={() => setChosenPath(p.key)}
              className={`p-4 rounded-lg border text-left transition-all ${chosenPath === p.key ? p.accent + ' ring-1 ring-purple-500' : 'border-gray-700 bg-slate-900/40 hover:border-gray-500'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{p.icon}</span>
                <span className={`font-bold ${p.color}`}>{p.name}</span>
              </div>
              <p className="text-xs text-gray-400">{p.description}</p>
              <p className="text-xs text-gray-500 mt-1">Starts as: {p.levels[0].title} (${p.levels[0].salary.toLocaleString()}/cycle)</p>
            </button>
          ))}
        </div>
        <Button onClick={() => enterMarket.mutate({ pathKey: chosenPath })} disabled={enterMarket.isPending} className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg">
          {enterMarket.isPending ? 'Entering…' : '➡️ Enter the Labor Market'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-purple-400" /> Employment & Career
        </h1>
        <p className="text-gray-400 mt-1">A living labor market where you get hired, climb the ladder, and build a career — or found your own organization.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${tab === t.id ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'career' && <CareerDashboard employment={employment} onPromote={() => promote.mutate()} onCollect={() => collectPay.mutate()} pendingPay={pendingPay} />}
      {tab === 'market' && <JobMarket postings={postings} employment={employment} playerData={playerData} onApply={(job) => applyJob.mutate(job)} loading={postingsLoading} />}
      {tab === 'performance' && <PerformanceCenter metrics={metrics} employment={employment} onRunReview={() => runReview.mutate()} onAIReview={() => aiReview.mutate()} running={runningReview} />}
      {tab === 'transparency' && <TransparencyPanel employment={employment} />}
      {tab === 'retirement' && <RetirementPanel employment={employment} playerData={playerData} onRetire={() => retire.mutate()} onFoundCompany={() => foundCompany.mutate()} retiring={retiring} />}
    </div>
    );
    }