import { base44 } from "../src/api/base44Client.js";

// ============================================================
// 🌍 WORLD TICK ENGINE — AAA GAME SIMULATION BACKEND
// Runs every 10 minutes as the heartbeat of the entire economy
// ============================================================

const TICK_PHASES = ["enterprise_production", "heat_decay", "market_update", "territory_income", "gang_wars"];

// Base production rates per enterprise type (units/tick)
const ENTERPRISE_PRODUCTION = {
  marijuana_farm: 80,
  chop_shop: 60,
  money_laundering: 120,
  material_production: 90,
  weapons_cache: 50,
  arms_manufacturing: 40,
  counterfeiting_operation: 100,
  human_trafficking_ring: 70,
};

// Base income per territory per tick
const TERRITORY_INCOME_BASE = 2500;

// Market commodity base prices
const COMMODITY_BASE_PRICES = {
  drugs: 500,
  weapons: 800,
  vehicles: 2000,
  electronics: 600,
  raw_materials: 200,
  contraband: 400,
  weapons_cache: 1200,
};

// Heat decay per tick (percentage points)
const HEAT_DECAY_RATE = 3;

// ─────────────────────────────────────────────────────────
// UTILITY: log a tick event to the TickEvent ledger
// ─────────────────────────────────────────────────────────
async function logEvent(tickId, tickNumber, eventType, entityId, entityName, before, after, metadata = {}, phase = "") {
  await base44.entities.TickEvent.create({
    tick_id: tickId,
    tick_number: tickNumber,
    event_type: eventType,
    entity_id: entityId || "",
    entity_name: entityName || "",
    before_value: before || 0,
    after_value: after || 0,
    delta: (after || 0) - (before || 0),
    metadata,
    phase,
  });
}

// ─────────────────────────────────────────────────────────
// PHASE 1: ENTERPRISE PRODUCTION ENGINE
// Each active enterprise generates stock based on level,
// heat, and type. High heat = reduced output.
// ─────────────────────────────────────────────────────────
async function processEnterpriseProduction(tickId, tickNumber) {
  const start = Date.now();
  const enterprises = await base44.entities.CriminalEnterprise.filter({ is_active: true });

  let totalProduced = 0;
  let processed = 0;

  for (const e of enterprises) {
    const baseRate = ENTERPRISE_PRODUCTION[e.type] || 60;
    const levelMultiplier = 1 + (e.level - 1) * 0.25; // +25% per level
    const heatPenalty = 1 - Math.min(e.heat_level / 200, 0.6); // max 60% reduction
    const produced = Math.floor(baseRate * levelMultiplier * heatPenalty);
    const wasFull = e.current_stock >= e.storage_capacity;

    if (!wasFull) {
      const newStock = Math.min(e.current_stock + produced, e.storage_capacity);
      await base44.entities.CriminalEnterprise.update(e.id, {
        current_stock: newStock,
        last_production: new Date().toISOString(),
        total_revenue: (e.total_revenue || 0) + produced * 10,
      });

      await logEvent(tickId, tickNumber, "enterprise_production", e.id, e.name,
        e.current_stock, newStock, { type: e.type, produced, heatPenalty: Math.round(heatPenalty * 100), level: e.level },
        "enterprise_production"
      );
      totalProduced += produced;
    }
    processed++;
  }

  return { processed, totalProduced, duration_ms: Date.now() - start };
}

// ─────────────────────────────────────────────────────────
// PHASE 2: HEAT DECAY SYSTEM
// Wanted levels and enterprise heat decay each tick.
// Players with recent activity decay slower.
// ─────────────────────────────────────────────────────────
async function processHeatDecay(tickId, tickNumber) {
  const start = Date.now();
  const players = await base44.entities.Player.list();
  const enterprises = await base44.entities.CriminalEnterprise.list();

  let processed = 0;

  // Decay player wanted levels
  for (const p of players) {
    if (!p.wanted_level || p.wanted_level <= 0) continue;
    const oldLevel = p.wanted_level;
    const newLevel = Math.max(0, p.wanted_level - 1);
    await base44.entities.Player.update(p.id, { wanted_level: newLevel });
    await logEvent(tickId, tickNumber, "heat_decay", p.id, p.username,
      oldLevel, newLevel, { type: "player_heat" }, "heat_decay"
    );
    processed++;
  }

  // Decay enterprise heat
  for (const e of enterprises) {
    if (!e.heat_level || e.heat_level <= 0) continue;
    const oldHeat = e.heat_level;
    const newHeat = Math.max(0, e.heat_level - HEAT_DECAY_RATE);
    await base44.entities.CriminalEnterprise.update(e.id, { heat_level: newHeat });
    await logEvent(tickId, tickNumber, "heat_decay", e.id, e.name,
      oldHeat, newHeat, { type: "enterprise_heat", decayRate: HEAT_DECAY_RATE }, "heat_decay"
    );
    processed++;
  }

  return { processed, duration_ms: Date.now() - start };
}

// ─────────────────────────────────────────────────────────
// PHASE 3: DYNAMIC MARKET ENGINE
// Adjusts commodity prices based on supply/demand ratio.
// Uses EMA smoothing + volatility clamping for stability.
// ─────────────────────────────────────────────────────────
async function processMarketPrices(tickId, tickNumber) {
  const start = Date.now();
  const commodities = await base44.entities.CommodityPrice.list();
  const allEnterprises = await base44.entities.CriminalEnterprise.list("-created_date", 200);

  // Calculate global supply from enterprise stocks
  const supplyByType = {};
  for (const e of allEnterprises) {
    const key = e.type.replace(/_/g, "_");
    supplyByType[key] = (supplyByType[key] || 0) + (e.current_stock || 0);
  }

  let updated = 0;

  for (const commodity of commodities) {
    const basePrice = COMMODITY_BASE_PRICES[commodity.commodity] || commodity.base_price;
    const supply = commodity.supply_volume || 100;
    const demand = commodity.demand_level === "critical" ? 200
      : commodity.demand_level === "high" ? 150
      : commodity.demand_level === "medium" ? 100
      : 60;

    // Supply/demand ratio drives price
    const ratio = demand / Math.max(supply, 1);
    let rawPrice = basePrice * ratio;

    // EMA smoothing: blend 30% new price, 70% current
    const smoothedPrice = commodity.current_price
      ? commodity.current_price * 0.7 + rawPrice * 0.3
      : rawPrice;

    // Clamp: price can't deviate more than 50% from base
    const finalPrice = Math.round(
      Math.max(basePrice * 0.5, Math.min(basePrice * 2.0, smoothedPrice))
    );

    const pctChange = basePrice > 0 ? ((finalPrice - basePrice) / basePrice) * 100 : 0;
    const trend = finalPrice > (commodity.current_price || basePrice) ? "rising"
      : finalPrice < (commodity.current_price || basePrice) ? "falling"
      : "stable";

    // Append to price history
    const history = (commodity.price_history || []).slice(-23); // keep last 24
    history.push({ price: finalPrice, ts: new Date().toISOString() });

    await base44.entities.CommodityPrice.update(commodity.id, {
      current_price: finalPrice,
      pct_change: Math.round(pctChange * 10) / 10,
      trend,
      price_history: history,
    });

    await logEvent(tickId, tickNumber, "market_update", commodity.id, commodity.commodity,
      commodity.current_price || basePrice, finalPrice,
      { basePrice, demand, supply, ratio: Math.round(ratio * 100) / 100, trend, pctChange: Math.round(pctChange * 10) / 10 },
      "market_update"
    );
    updated++;
  }

  return { updated, duration_ms: Date.now() - start };
}

// ─────────────────────────────────────────────────────────
// PHASE 4: TERRITORY PASSIVE INCOME
// Territory owners earn per tick based on control %, 
// revenue multiplier, and whether territory is at war.
// ─────────────────────────────────────────────────────────
async function processTerritoryIncome(tickId, tickNumber) {
  const start = Date.now();
  const territories = await base44.entities.Territory.filter({ is_contested: false });
  const activeWars = await base44.entities.TerritoryWar.filter({ status: "active" });
  const warredTerritoryIds = new Set(activeWars.map(w => w.territory_id));

  // Group territories by crew
  const crewIncomeMap = {};
  let processed = 0;
  let totalDistributed = 0;

  for (const t of territories) {
    if (!t.controlling_crew_id) continue;

    // War penalty: 50% income reduction in contested zones
    const warPenalty = warredTerritoryIds.has(t.id) ? 0.5 : 1.0;
    const controlBonus = (t.control_percentage || 100) / 100;
    const income = Math.floor(TERRITORY_INCOME_BASE * (t.revenue_multiplier || 1) * controlBonus * warPenalty);

    if (!crewIncomeMap[t.controlling_crew_id]) {
      crewIncomeMap[t.controlling_crew_id] = { income: 0, territories: [] };
    }
    crewIncomeMap[t.controlling_crew_id].income += income;
    crewIncomeMap[t.controlling_crew_id].territories.push(t.id);

    await logEvent(tickId, tickNumber, "territory_income", t.id, t.name,
      0, income,
      { crew_id: t.controlling_crew_id, controlPct: t.control_percentage, warPenalty, multiplier: t.revenue_multiplier },
      "territory_income"
    );
    totalDistributed += income;
    processed++;
  }

  // Distribute income to all players in each crew
  const allPlayers = await base44.entities.Player.list();
  for (const [crewId, data] of Object.entries(crewIncomeMap)) {
    const crewPlayers = allPlayers.filter(p => p.crew_id === crewId);
    if (crewPlayers.length === 0) continue;

    // Boss gets 40%, rest split evenly
    const boss = crewPlayers.find(p => p.crew_role === "boss");
    const nonBoss = crewPlayers.filter(p => p.crew_role !== "boss");
    const bossShare = Math.floor(data.income * 0.4);
    const soldierShare = nonBoss.length > 0 ? Math.floor((data.income * 0.6) / nonBoss.length) : 0;

    if (boss) {
      await base44.entities.Player.update(boss.id, {
        crypto_balance: (boss.crypto_balance || 0) + bossShare,
        total_earnings: (boss.total_earnings || 0) + bossShare,
      });
    }
    for (const p of nonBoss) {
      await base44.entities.Player.update(p.id, {
        crypto_balance: (p.crypto_balance || 0) + soldierShare,
        total_earnings: (p.total_earnings || 0) + soldierShare,
      });
    }
  }

  return { processed, totalDistributed, duration_ms: Date.now() - start };
}

// ─────────────────────────────────────────────────────────
// PHASE 5: GANG WAR PROCESSING
// Each active TerritoryWar progresses per tick.
// After max_ticks, war is resolved and territory transferred.
// ─────────────────────────────────────────────────────────
async function processGangWars(tickId, tickNumber) {
  const start = Date.now();
  const activeWars = await base44.entities.TerritoryWar.filter({ status: "active" });
  let processed = 0;

  for (const war of activeWars) {
    const newTicks = (war.ticks_elapsed || 0) + 1;
    const isOver = newTicks >= (war.max_ticks || 6);

    // Simulate passive war progression if no explicit actions:
    // Attacker gains +5 to +15 score per tick (pressure), defender gains +3 to +12
    const attackGain = Math.floor(Math.random() * 10) + 5;
    const defenseGain = Math.floor(Math.random() * 9) + 3;

    const newAttackerScore = (war.war_score_attacker || 0) + attackGain;
    const newDefenderScore = (war.war_score_defender || 0) + defenseGain;
    const totalScore = newAttackerScore + newDefenderScore;

    const attackerPct = Math.round((newAttackerScore / totalScore) * 100);
    const defenderPct = 100 - attackerPct;

    // Apply heat to territory
    const territories = await base44.entities.Territory.filter({ id: war.territory_id });
    if (territories[0]) {
      await base44.entities.Territory.update(war.territory_id, {
        is_contested: true,
        control_percentage: defenderPct,
      });

      // Suppress nearby enterprises (heat spike)
      const nearbyEnterprises = await base44.entities.CriminalEnterprise.filter({ crew_id: war.defender_crew_id });
      for (const e of nearbyEnterprises.slice(0, 3)) {
        const newHeat = Math.min(100, (e.heat_level || 0) + 10);
        await base44.entities.CriminalEnterprise.update(e.id, { heat_level: newHeat });
      }
    }

    if (isOver) {
      // WAR RESOLUTION
      const attackerWins = newAttackerScore > newDefenderScore;
      const winnerId = attackerWins ? war.attacker_crew_id : war.defender_crew_id;
      const winnerName = attackerWins ? war.attacker_crew_name : war.defender_crew_name;

      await base44.entities.TerritoryWar.update(war.id, {
        status: "ended",
        ticks_elapsed: newTicks,
        war_score_attacker: newAttackerScore,
        war_score_defender: newDefenderScore,
        attacker_influence_pct: attackerPct,
        defender_influence_pct: defenderPct,
        winner_crew_id: winnerId,
        winner_crew_name: winnerName,
        ended_at: new Date().toISOString(),
      });

      // Transfer territory if attacker wins
      if (attackerWins) {
        await base44.entities.Territory.update(war.territory_id, {
          controlling_crew_id: war.attacker_crew_id,
          is_contested: false,
          control_percentage: 100,
        });
      } else {
        await base44.entities.Territory.update(war.territory_id, {
          is_contested: false,
          control_percentage: 100,
        });
      }

      await logEvent(tickId, tickNumber, "gang_war_ended", war.id, war.territory_name,
        war.war_score_defender, newAttackerScore,
        { winner: winnerName, attackerScore: newAttackerScore, defenderScore: newDefenderScore, territory: war.territory_name },
        "gang_wars"
      );

      // Announce via GlobalEvent
      await base44.entities.GlobalEvent.create({
        title: attackerWins
          ? `⚔️ ${war.attacker_crew_name} seized ${war.territory_name}!`
          : `🛡️ ${war.defender_crew_name} held ${war.territory_name}!`,
        description: `Gang war concluded after ${newTicks} ticks. Final score: ${newAttackerScore} vs ${newDefenderScore}`,
        event_type: "gang_war",
        is_active: true,
        duration_hours: 1,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    } else {
      // War continues
      await base44.entities.TerritoryWar.update(war.id, {
        ticks_elapsed: newTicks,
        war_score_attacker: newAttackerScore,
        war_score_defender: newDefenderScore,
        attacker_influence_pct: attackerPct,
        defender_influence_pct: defenderPct,
      });

      await logEvent(tickId, tickNumber, "gang_war_update", war.id, war.territory_name,
        war.war_score_attacker || 0, newAttackerScore,
        { ticksLeft: (war.max_ticks || 6) - newTicks, attackerPct, defenderPct },
        "gang_wars"
      );
    }
    processed++;
  }

  return { processed, duration_ms: Date.now() - start };
}

// ─────────────────────────────────────────────────────────
// MAIN TICK ORCHESTRATOR
// Idempotent: checks for existing running tick before starting
// ─────────────────────────────────────────────────────────
export default async function worldTickEngine(payload) {
  const tickStart = Date.now();

  // Get last tick number for sequencing
  const recentTicks = await base44.entities.WorldTick.list("-created_date", 1);
  const lastTick = recentTicks[0];

  // Idempotency guard: don't run if a tick is already running
  if (lastTick && lastTick.status === "running") {
    const runningFor = Date.now() - new Date(lastTick.started_at).getTime();
    if (runningFor < 8 * 60 * 1000) { // 8 min timeout
      console.log("World tick already running, skipping.");
      return { skipped: true, reason: "tick_already_running" };
    }
    // If running for >8 min, mark as failed and continue
    await base44.entities.WorldTick.update(lastTick.id, { status: "failed" });
  }

  const tickNumber = (lastTick?.tick_number || 0) + 1;

  // Create tick record
  const tick = await base44.entities.WorldTick.create({
    tick_number: tickNumber,
    status: "running",
    started_at: new Date().toISOString(),
  });

  const results = {
    tick_number: tickNumber,
    phases: {},
    errors: [],
  };

  // ── Phase 1: Enterprise Production ──
  try {
    console.log(`[Tick ${tickNumber}] Phase 1: Enterprise Production`);
    const r = await processEnterpriseProduction(tick.id, tickNumber);
    results.phases.enterprise = r;
  } catch (err) {
    console.error("Phase 1 failed:", err.message);
    results.errors.push(`enterprise_production: ${err.message}`);
  }

  // ── Phase 2: Heat Decay ──
  try {
    console.log(`[Tick ${tickNumber}] Phase 2: Heat Decay`);
    const r = await processHeatDecay(tick.id, tickNumber);
    results.phases.heat_decay = r;
  } catch (err) {
    console.error("Phase 2 failed:", err.message);
    results.errors.push(`heat_decay: ${err.message}`);
  }

  // ── Phase 3: Market Prices ──
  try {
    console.log(`[Tick ${tickNumber}] Phase 3: Market Prices`);
    const r = await processMarketPrices(tick.id, tickNumber);
    results.phases.market = r;
  } catch (err) {
    console.error("Phase 3 failed:", err.message);
    results.errors.push(`market_update: ${err.message}`);
  }

  // ── Phase 4: Territory Income ──
  try {
    console.log(`[Tick ${tickNumber}] Phase 4: Territory Income`);
    const r = await processTerritoryIncome(tick.id, tickNumber);
    results.phases.territory = r;
  } catch (err) {
    console.error("Phase 4 failed:", err.message);
    results.errors.push(`territory_income: ${err.message}`);
  }

  // ── Phase 5: Gang Wars ──
  try {
    console.log(`[Tick ${tickNumber}] Phase 5: Gang Wars`);
    const r = await processGangWars(tick.id, tickNumber);
    results.phases.gang_wars = r;
  } catch (err) {
    console.error("Phase 5 failed:", err.message);
    results.errors.push(`gang_wars: ${err.message}`);
  }

  const duration = Date.now() - tickStart;

  // Mark tick complete
  await base44.entities.WorldTick.update(tick.id, {
    status: results.errors.length === 5 ? "failed" : "completed",
    completed_at: new Date().toISOString(),
    duration_ms: duration,
    enterprises_processed: results.phases.enterprise?.processed || 0,
    players_processed: results.phases.heat_decay?.processed || 0,
    territories_processed: results.phases.territory?.processed || 0,
    wars_processed: results.phases.gang_wars?.processed || 0,
    market_items_updated: results.phases.market?.updated || 0,
    total_income_distributed: results.phases.territory?.totalDistributed || 0,
    total_production_generated: results.phases.enterprise?.totalProduced || 0,
    events_triggered: 0,
    error_log: results.errors,
    phase_timings: {
      enterprise_ms: results.phases.enterprise?.duration_ms || 0,
      heat_decay_ms: results.phases.heat_decay?.duration_ms || 0,
      market_ms: results.phases.market?.duration_ms || 0,
      territory_ms: results.phases.territory?.duration_ms || 0,
      gang_wars_ms: results.phases.gang_wars?.duration_ms || 0,
    },
  });

  console.log(`[Tick ${tickNumber}] ✅ Completed in ${duration}ms`);
  return { success: true, tick_number: tickNumber, duration_ms: duration, results };
}