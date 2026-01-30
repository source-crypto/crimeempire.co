import { base44 } from "@/api/base44Client";

// Automatic reward processing for various game events
export const AutoRewardProcessor = {
  
  // Process heist completion reward
  processHeistReward: async (heistId, playerData, payout) => {
    try {
      const bonusMultiplier = playerData.crew_role === 'boss' ? 1.5 : playerData.crew_role === 'underboss' ? 1.3 : 1.0;
      const finalPayout = Math.floor(payout * bonusMultiplier);

      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: "heist_completion",
        amount: finalPayout,
        currency_type: "crypto",
        description: `Heist Completion Reward (${bonusMultiplier}x bonus)`,
        source_id: heistId,
        source_type: "heist",
        bonus_multiplier: bonusMultiplier
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + finalPayout,
        total_earnings: (playerData.total_earnings || 0) + finalPayout,
        stats: {
          ...playerData.stats,
          heists_completed: (playerData.stats?.heists_completed || 0) + 1,
          total_loot: (playerData.stats?.total_loot || 0) + finalPayout
        }
      });

      return finalPayout;
    } catch (error) {
      console.error("Heist reward error:", error);
      return 0;
    }
  },

  // Process battle victory reward
  processBattleReward: async (battleId, playerData, territoryValue) => {
    try {
      const reward = Math.floor(territoryValue * 1.2);

      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: "battle_win",
        amount: reward,
        currency_type: "crypto",
        description: "Territory Battle Victory",
        source_id: battleId,
        source_type: "battle"
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + reward,
        total_earnings: (playerData.total_earnings || 0) + reward,
        endgame_points: (playerData.endgame_points || 0) + 100,
        stats: {
          ...playerData.stats,
          battles_won: (playerData.stats?.battles_won || 0) + 1
        }
      });

      return reward;
    } catch (error) {
      console.error("Battle reward error:", error);
      return 0;
    }
  },

  // Process mission completion reward
  processMissionReward: async (missionId, playerData, missionRewards) => {
    try {
      const { crypto = 0, experience = 0, reputation = 0 } = missionRewards;

      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: "mission_complete",
        amount: crypto,
        currency_type: "crypto",
        description: "Mission Completion Reward",
        source_id: missionId,
        source_type: "mission"
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + crypto,
        total_earnings: (playerData.total_earnings || 0) + crypto,
        experience: (playerData.experience || 0) + experience,
        endgame_points: (playerData.endgame_points || 0) + reputation
      });

      return crypto;
    } catch (error) {
      console.error("Mission reward error:", error);
      return 0;
    }
  },

  // Process enterprise production earnings
  processEnterpriseEarnings: async (enterpriseId, playerData, earnings) => {
    try {
      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: "enterprise_production",
        amount: earnings,
        currency_type: "crypto",
        description: "Enterprise Production Revenue",
        source_id: enterpriseId,
        source_type: "enterprise"
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + earnings,
        total_earnings: (playerData.total_earnings || 0) + earnings
      });

      return earnings;
    } catch (error) {
      console.error("Enterprise earnings error:", error);
      return 0;
    }
  },

  // Process contract completion
  processContractReward: async (contractId, playerData, payment) => {
    try {
      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: "contract_complete",
        amount: payment,
        currency_type: "crypto",
        description: "AI Contract Completion",
        source_id: contractId,
        source_type: "contract"
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + payment,
        total_earnings: (playerData.total_earnings || 0) + payment,
        stats: {
          ...playerData.stats,
          contracts_completed: (playerData.stats?.contracts_completed || 0) + 1
        }
      });

      return payment;
    } catch (error) {
      console.error("Contract reward error:", error);
      return 0;
    }
  },

  // Process task completion
  processTaskReward: async (taskId, playerData, rewardAmount) => {
    try {
      await base44.entities.RewardTransaction.create({
        player_id: playerData.id,
        player_email: playerData.created_by,
        transaction_type: "task_complete",
        amount: rewardAmount,
        currency_type: "crypto",
        description: "Task Completion Reward",
        source_id: taskId,
        source_type: "task"
      });

      await base44.entities.Player.update(playerData.id, {
        crypto_balance: playerData.crypto_balance + rewardAmount,
        total_earnings: (playerData.total_earnings || 0) + rewardAmount
      });

      return rewardAmount;
    } catch (error) {
      console.error("Task reward error:", error);
      return 0;
    }
  }
};