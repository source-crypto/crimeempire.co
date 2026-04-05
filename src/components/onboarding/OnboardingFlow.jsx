import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sounds } from '@/utils/sounds';

const STEPS = [
  { id: 'profile', icon: '👤', title: 'Create Your Identity', desc: 'Choose a name and build your criminal persona', action: 'Setup Player', page: '/PlayerManagement' },
  { id: 'enterprise', icon: '🏭', title: 'Build Your First Enterprise', desc: 'Buy a marijuana farm or chop shop to start earning', action: 'Open Enterprises', page: '/Enterprises' },
  { id: 'crew', icon: '👥', title: 'Join or Create a Crew', desc: 'Strength in numbers — find allies in the city', action: 'Find Crew', page: '/Factions' },
  { id: 'territory', icon: '🗺️', title: 'Claim Your First Territory', desc: 'Capture a sector to generate passive income', action: 'Territory Map', page: '/TerritoryControl' },
  { id: 'trade', icon: '💹', title: 'Execute Your First Trade', desc: 'Buy low, sell high on the commodity market', action: 'Open Market', page: '/CommodityMarket' },
];

export default function OnboardingFlow({ onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const p = await base44.entities.Player.filter({ created_by: user.email }); return p[0]; },
    enabled: !!user
  });

  const completedSteps = (() => {
    if (!playerData) return [];
    const completed = [];
    if (playerData.username) completed.push('profile');
    if ((playerData.stats?.items_traded || 0) > 0) completed.push('trade');
    if (playerData.crew_id) completed.push('crew');
    if ((playerData.territory_count || 0) > 0) completed.push('territory');
    return completed;
  })();

  const progress = (completedSteps.length / STEPS.length) * 100;
  const allDone = completedSteps.length === STEPS.length;

  const claimBonus = useMutation({
    mutationFn: async () => {
      await base44.entities.Player.update(playerData.id, {
        crypto_balance: (playerData.crypto_balance || 0) + 25000,
        endgame_points: (playerData.endgame_points || 0) + 1000,
      });
      await base44.auth.updateMe({ onboarding_complete: true });
    },
    onSuccess: () => { sounds.levelUp(); queryClient.invalidateQueries(); onClose?.(); }
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel border border-purple-500/40 rounded-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="w-6 h-6 text-purple-400" />Getting Started</h2>
            <p className="text-gray-400 text-sm mt-1">{completedSteps.length} of {STEPS.length} objectives complete</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
        </div>

        <Progress value={progress} className="h-2 mb-6" />

        {allDone ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-yellow-400 mb-2">Onboarding Complete!</h3>
            <p className="text-gray-300 mb-6">You've mastered the basics. Claim your $25,000 bonus + 1,000 XP.</p>
            <Button className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-8 py-3 text-lg" onClick={() => claimBonus.mutate()} disabled={claimBonus.isPending}>
              {claimBonus.isPending ? 'Claiming...' : '💰 Claim Bonus'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const done = completedSteps.includes(step.id);
              const isCurrent = i === STEPS.findIndex(s => !completedSteps.includes(s.id));
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    done ? 'border-green-500/30 bg-green-900/10' :
                    isCurrent ? 'border-purple-500/50 bg-purple-900/20' :
                    'border-gray-700/50 opacity-60'
                  }`}
                >
                  <div className="text-2xl flex-shrink-0">{done ? '✅' : step.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${done ? 'text-green-400 line-through' : 'text-white'}`}>{step.title}</p>
                    <p className="text-xs text-gray-400">{step.desc}</p>
                  </div>
                  {!done && isCurrent && (
                    <Button size="sm" className="bg-purple-700 hover:bg-purple-600 flex-shrink-0"
                      onClick={() => { navigate(step.page); onClose?.(); sounds.click(); }}>
                      {step.action} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  {done && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}