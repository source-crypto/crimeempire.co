import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function GameEngine({ playerData }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!playerData?.id) return;

    const processEnterpriseProduction = async () => {
      try {
        const enterprises = await base44.entities.CriminalEnterprise.filter({
          owner_id: playerData.id,
          is_active: true
        });

        for (const enterprise of enterprises) {
          const lastProduction = new Date(enterprise.last_production || enterprise.created_date);
          const now = new Date();
          const hoursElapsed = (now - lastProduction) / (1000 * 60 * 60);

          if (hoursElapsed >= 1) {
            const produced = Math.floor(hoursElapsed * enterprise.production_rate);
            const newStock = Math.min(
              (enterprise.current_stock || 0) + produced,
              enterprise.storage_capacity
            );

            const revenue = produced * 50;

            await base44.entities.CriminalEnterprise.update(enterprise.id, {
              current_stock: newStock,
              last_production: now.toISOString(),
              total_revenue: (enterprise.total_revenue || 0) + revenue
            });

            const existingPassive = await base44.entities.PassiveIncome.filter({
              player_id: playerData.id,
              source_id: enterprise.id
            });

            if (existingPassive.length === 0) {
              await base44.entities.PassiveIncome.create({
                player_id: playerData.id,
                source_type: 'enterprise',
                source_id: enterprise.id,
                income_rate: enterprise.production_rate * 50,
                last_collection: now.toISOString()
              });
            }

            if (revenue > 0) {
              await base44.entities.Reward.create({
                player_id: playerData.id,
                reward_type: 'enterprise_production',
                crypto_amount: revenue,
                source_id: enterprise.id,
                source_name: enterprise.name,
                status: 'pending',
                auto_claimed: true
              });
            }
          }
        }
      } catch (error) {
        console.error('Enterprise production error:', error);
      }
    };

    const processTerritoryIncome = async () => {
      try {
        const territories = await base44.entities.Territory.filter({
          controlling_crew_id: playerData.crew_id
        });

        for (const territory of territories) {
          const hourlyIncome = Math.floor(1000 * (territory.revenue_multiplier || 1));
          
          const existingPassive = await base44.entities.PassiveIncome.filter({
            player_id: playerData.id,
            source_id: territory.id
          });

          if (existingPassive.length === 0 && playerData.crew_id) {
            await base44.entities.PassiveIncome.create({
              player_id: playerData.id,
              source_type: 'territory',
              source_id: territory.id,
              income_rate: hourlyIncome,
              last_collection: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Territory income error:', error);
      }
    };

    const autoClaimRewards = async () => {
      try {
        const autoRewards = await base44.entities.Reward.filter({
          player_id: playerData.id,
          status: 'pending',
          auto_claimed: true
        });

        for (const reward of autoRewards) {
          const cryptoAmount = reward.crypto_amount || 0;
          const cashAmount = reward.cash_amount || 0;
          const expAmount = reward.experience_points || 0;

          await base44.entities.Player.update(playerData.id, {
            crypto_balance: (playerData.crypto_balance || 0) + cryptoAmount,
            buy_power: (playerData.buy_power || 0) + cashAmount,
            experience: (playerData.experience || 0) + expAmount,
            total_earnings: (playerData.total_earnings || 0) + cryptoAmount + cashAmount
          });

          await base44.entities.Reward.update(reward.id, {
            status: 'claimed',
            claimed_at: new Date().toISOString()
          });
        }

        if (autoRewards.length > 0) {
          queryClient.invalidateQueries(['player']);
        }
      } catch (error) {
        console.error('Auto claim error:', error);
      }
    };

    processEnterpriseProduction();
    processTerritoryIncome();
    autoClaimRewards();

    const productionInterval = setInterval(processEnterpriseProduction, 300000); // 5 min
    const territoryInterval = setInterval(processTerritoryIncome, 600000); // 10 min
    const claimInterval = setInterval(autoClaimRewards, 30000); // 30 sec

    return () => {
      clearInterval(productionInterval);
      clearInterval(territoryInterval);
      clearInterval(claimInterval);
    };
  }, [playerData?.id, queryClient]);

  return null;
}