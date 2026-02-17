import React, { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function GameEngine({ playerData }) {
  const queryClient = useQueryClient();
  const engineStateRef = useRef({
    lastOptimization: Date.now(),
    eventQueue: [],
    simulationCache: {},
    yieldMetrics: { operations: 0, successRate: 100, avgResponseTime: 0 }
  });

  useEffect(() => {
    if (!playerData?.id) return;

    const sessionId = `session_${Date.now()}`;
    let sessionStart = new Date();
    let actionCount = 0;
    let cycleCount = 0;

    // Initialize self-sustaining engine
    base44.entities.GameSession.create({
      player_id: playerData.id,
      session_start: sessionStart.toISOString(),
      session_type: 'active',
      actions_taken: 0,
      crypto_earned: 0,
      experience_gained: 0
    }).then((session) => {
      window.__gameSession = session;
      broadcastEngineIntent('initialization', { sessionId: session.id, player: playerData.username });
    });

    // High-speed event bridge (simulation ↔ creation)
    const processBridge = async () => {
      const state = engineStateRef.current;
      
      // Drain event queue
      while (state.eventQueue.length > 0) {
        const event = state.eventQueue.shift();
        await assimilateEvent(event);
      }
      
      // Simulate world state
      const simulation = await runSimulation();
      
      // Bridge: Apply simulation to creation
      await applySimulationToGame(simulation);
      
      cycleCount++;
      state.yieldMetrics.operations++;
    };

    // Self-optimization engine (adapts every 10 minutes)
    const optimizationLoop = setInterval(() => {
      const state = engineStateRef.current;
      const now = Date.now();
      const timeSinceOptimization = now - state.lastOptimization;
      
      if (timeSinceOptimization > 600000) { // 10 minutes
        optimizeEngine();
        state.lastOptimization = now;
        broadcastEngineIntent('self_optimization', { 
          cycles: cycleCount, 
          metrics: state.yieldMetrics 
        });
      }
    }, 120000);

    // High-yield runtime loop (runs every 3 minutes for efficiency)
    const runtimeLoop = setInterval(async () => {
      const startTime = performance.now();
      
      try {
        await processBridge();
        
        // Update yield metrics
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const state = engineStateRef.current;
        state.yieldMetrics.avgResponseTime = 
          (state.yieldMetrics.avgResponseTime + responseTime) / 2;
        
        broadcastEngineIntent('runtime_cycle', { 
          cycle: cycleCount, 
          responseTime: responseTime.toFixed(2) 
        });
      } catch (error) {
        const state = engineStateRef.current;
        state.yieldMetrics.successRate = Math.max(0, state.yieldMetrics.successRate - 1);
      }
    }, 180000); // Runtime: 3 minutes

    // Event assimilation function
    const assimilateEvent = async (event) => {
      const { type, data } = event;
      
      // Create event broadcast
      await base44.entities.EventBroadcast.create({
        event_id: `${type}_${Date.now()}_${playerData.id}`,
        event_name: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        player_id: playerData.id,
        event_type: type,
        event_data: data,
        broadcast_scope: 'player',
        priority: 'normal',
        is_processed: false
      });
      
      // Cache simulation result
      engineStateRef.current.simulationCache[type] = data;
    };

    // Simulation runner
    const runSimulation = async () => {
      // Fetch game state
      const [enterprises, territories, investments] = await Promise.all([
        base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }).catch(() => []),
        base44.entities.Territory.list().then(t => t.filter(x => x.owner_id === playerData.id)).catch(() => []),
        base44.entities.Investment.filter({ player_id: playerData.id, status: 'active' }).catch(() => [])
      ]);
      
      // Simulate income
      const enterpriseIncome = enterprises.reduce((sum, e) => sum + (e.production_rate * 10), 0);
      const territoryIncome = territories.reduce((sum, t) => sum + ((t.tax_rate || 2) * (t.value || 50000) / 100), 0);
      const investmentIncome = investments.reduce((sum, i) => sum + (i.daily_return || 0) / 48, 0); // Per 30min
      
      return {
        totalIncome: enterpriseIncome + territoryIncome + investmentIncome,
        enterprises: enterprises.length,
        territories: territories.length,
        investments: investments.length
      };
    };

    // Apply simulation to actual game (bridge)
    const applySimulationToGame = async (simulation) => {
      if (simulation.totalIncome > 0) {
        await base44.entities.Player.update(playerData.id, {
          crypto_balance: (playerData.crypto_balance || 0) + simulation.totalIncome
        });
        
        // Create transaction log for transparency
        await base44.entities.TransactionLog.create({
          player_id: playerData.id,
          transaction_type: 'automated_income',
          amount: simulation.totalIncome,
          balance_after: (playerData.crypto_balance || 0) + simulation.totalIncome,
          description: `Automated income: ${simulation.enterprises} enterprises, ${simulation.territories} territories, ${simulation.investments} investments`
        });
        
        queryClient.invalidateQueries(['player']);
        
        // Queue event for next cycle
        engineStateRef.current.eventQueue.push({
          type: 'income_applied',
          data: { amount: simulation.totalIncome, sources: simulation }
        });
      }
    };

    // Self-optimization
    const optimizeEngine = () => {
      const state = engineStateRef.current;
      
      // Clear old cache entries
      const cacheKeys = Object.keys(state.simulationCache);
      if (cacheKeys.length > 50) {
        state.simulationCache = {};
      }
      
      // Adjust success rate
      if (state.yieldMetrics.successRate < 95) {
        // Engine self-heals by clearing queue
        state.eventQueue = [];
      }
    };

    // Broadcast engine intent
    const broadcastEngineIntent = (intent, data) => {
      console.log(`[GameEngine] Intent: ${intent}`, data);
      
      // Emit to event system
      const event = new CustomEvent('game_engine_intent', {
        detail: { intent, data, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    };

    // Track actions
    const trackAction = () => {
      actionCount++;
      if (window.__gameSession) {
        base44.entities.GameSession.update(window.__gameSession.id, {
          actions_taken: actionCount
        });
      }
      
      // Queue action event
      engineStateRef.current.eventQueue.push({
        type: 'player_action',
        data: { action: actionCount }
      });
    };

    document.addEventListener('click', trackAction);

    // End session on unmount
    return () => {
      document.removeEventListener('click', trackAction);
      clearInterval(runtimeLoop);
      clearInterval(optimizationLoop);

      if (window.__gameSession) {
        const sessionEnd = new Date();
        const duration = Math.floor((sessionEnd - sessionStart) / 60000);
        
        base44.entities.GameSession.update(window.__gameSession.id, {
          session_end: sessionEnd.toISOString(),
          session_type: 'completed',
          duration_minutes: duration
        });
        
        broadcastEngineIntent('shutdown', { 
          duration, 
          cycles: cycleCount,
          metrics: engineStateRef.current.yieldMetrics 
        });
      }
    };
  }, [playerData?.id]);

  return null; // Self-sustaining background engine
}