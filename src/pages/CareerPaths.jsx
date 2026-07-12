import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CareerPathCard from '@/components/careers/CareerPathCard';
import { generateCareerPaths } from '@/lib/careerPathGenerator';
import { Loader2, Compass } from 'lucide-react';
import { toast } from 'sonner';

export default function CareerPaths() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0] || null; },
    enabled: !!user?.email,
  });
  const { data: playerSkills = [] } = useQuery({
    queryKey: ['playerSkills', playerData?.id],
    queryFn: () => base44.entities.PlayerSkill.filter({ player_id: playerData.id }),
    enabled: !!playerData?.id,
  });
  const { data: reputation = {} } = useQuery({
    queryKey: ['playerReputation', playerData?.id],
    queryFn: async () => { const r = await base44.entities.PlayerReputation.filter({ player_id: playerData.id }); return r[0] || {}; },
    enabled: !!playerData?.id,
  });
  const { data: employment = [] } = useQuery({
    queryKey: ['employment', playerData?.id],
    queryFn: async () => { const e = await base44.entities.Employment.filter({ player_id: playerData.id }); return e; },
    enabled: !!playerData?.id,
  });

  const paths = useMemo(() => generateCareerPaths(playerSkills, reputation), [playerSkills, reputation]);
  const visible = paths.filter(p => filter === 'all' || p.track === filter);

  const embarkMutation = useMutation({
    mutationFn: async (path) => {
      const now = new Date().toISOString();
      await base44.entities.Employment.create({
        player_id: playerData.id,
        username: playerData.username,
        employment_status: 'employed',
        employer_name: path.employer,
        employer_type: path.track === 'lawful' ? (path.careerPath === 'government' ? 'government' : 'organization') : 'organization',
        career_path: path.careerPath,
        job_title: path.progression[0],
        career_level: 1,
        salary: path.payout.baseSalary,
        pay_type: path.payout.payType,
        performance_rating: 70,
        experience_points: 0,
        tenure_days: 0,
        hired_at: now,
        last_paid_at: now,
        pension_accrued: 0,
        retirement_eligible: false,
        certifications: [],
        employment_history: employment[0]?.employment_history || [],
      });
      return path.name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries(['employment']);
      toast.success(`Embarked on career: ${name}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!playerData) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;

  const lawfulCount = paths.filter(p => p.track === 'lawful').length;
  const crimCount = paths.length - lawfulCount;
  const eligibleCount = paths.filter(p => p.eligible).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Compass className="w-7 h-7 text-cyan-400" /> Career Path Generator
          </h1>
          <p className="text-gray-400 mt-1">Unique lawful & criminal career paths — skill requirements, entry-level roles, and payout structures</p>
        </div>
        <div className="flex gap-1.5">
          {['all', 'lawful', 'criminal'].map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className={filter === f ? 'bg-purple-600 text-white' : 'text-gray-400 border-purple-500/30'} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All Paths' : f === 'lawful' ? 'Lawful' : 'Criminal'}
            </Button>
          ))}
        </div>
      </div>

      <Card className="glass-panel border-purple-500/20">
        <CardContent className="p-4 grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xs text-gray-400">Lawful Paths</p><p className="text-green-400 font-bold text-xl">{lawfulCount}</p></div>
          <div><p className="text-xs text-gray-400">Criminal Paths</p><p className="text-red-400 font-bold text-xl">{crimCount}</p></div>
          <div><p className="text-xs text-gray-400">You Qualify For</p><p className="text-cyan-400 font-bold text-xl">{eligibleCount}</p></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(p => (
          <CareerPathCard key={p.id} path={p} onEmbark={() => embarkMutation.mutate(p)} disabled={embarkMutation.isPending} />
        ))}
      </div>
    </div>
  );
}