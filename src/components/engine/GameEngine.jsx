import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function GameEngine({ playerData }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!playerData?.id) return;

    const sessionId = `session_${Date.now()}`;
    let sessionStart = new Date();
    let actionCount = 0;

    // Create session on mount
    base44.entities.GameSession.create({
      player_id: playerData.id,
      session_start: sessionStart.toISOString(),
      session_type: 'active',
      actions_taken: 0,
      crypto_earned: 0,
      experience_gained: 0
    }).then((session) => {
      window.__gameSession = session;
    });

    // Track actions
    const trackAction = () => {
      actionCount++;
      if (window.__gameSession) {
        base44.entities.GameSession.update(window.__gameSession.id, {
          actions_taken: actionCount
        });
      }
    };

    document.addEventListener('click', trackAction);

    // Passive income accumulation every minute
    const incomeInterval = setInterval(async () => {
      const passiveIncomes = await base44.entities.PassiveIncome.filter({
        player_id: playerData.id,
        is_active: true
      });

      let totalIncome = 0;
      for (const income of passiveIncomes) {
        const hourlyRate = income.hourly_rate || 0;
        const minuteRate = hourlyRate / 60;
        totalIncome += minuteRate;

        await base44.entities.PassiveIncome.update(income.id, {
          accumulated_amount: (income.accumulated_amount || 0) + minuteRate
        });
      }

      if (totalIncome > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: (playerData.crypto_balance || 0) + totalIncome
        });
        queryClient.invalidateQueries(['player']);
      }
    }, 60000); // Every minute

    // End session on unmount
    return () => {
      document.removeEventListener('click', trackAction);
      clearInterval(incomeInterval);

      if (window.__gameSession) {
        const sessionEnd = new Date();
        const duration = Math.floor((sessionEnd - sessionStart) / 60000);
        
        base44.entities.GameSession.update(window.__gameSession.id, {
          session_end: sessionEnd.toISOString(),
          session_type: 'completed',
          duration_minutes: duration
        });
      }
    };
  }, [playerData?.id]);

  return null; // This is a background engine component
}