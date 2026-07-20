// Centralized empire-level metric calculations for the AAA simulation layer

export const LEADERSHIP_TITLES = [
  { title: 'Founder', minLevel: 1 },
  { title: 'Executive Director', minLevel: 5 },
  { title: 'Regional Director', minLevel: 10 },
  { title: 'Commissioner', minLevel: 15 },
  { title: 'Governor', minLevel: 20 },
  { title: 'Minister', minLevel: 28 },
  { title: 'Chancellor', minLevel: 36 },
  { title: 'Mayor', minLevel: 45 },
  { title: 'Council President', minLevel: 55 },
  { title: 'Regional Administrator', minLevel: 65 },
  { title: 'Strategic Advisor', minLevel: 75 },
  { title: 'President', minLevel: 90 },
];

export function currentLeadershipTitle(level = 1) {
  let title = LEADERSHIP_TITLES[0];
  for (const t of LEADERSHIP_TITLES) {
    if (level >= t.minLevel) title = t;
  }
  return title;
}

export function nextLeadershipTitle(level = 1) {
  for (const t of LEADERSHIP_TITLES) {
    if (level < t.minLevel) return t;
  }
  return null;
}

export function propertyMonthlyROI(p) {
  const purchase = p.purchase_price || p.market_value || 0;
  if (!purchase) return 0;
  const netMonthly = ((p.income_per_hour || 0) - (p.upkeep_per_hour || 0)) * 24 * 30;
  return Math.round((netMonthly / purchase) * 1000) / 10;
}

export function propertyAnnualROI(p) {
  return Math.round(propertyMonthlyROI(p) * 12 * 10) / 10;
}

export function appreciationPct(p) {
  const purchase = p.purchase_price || 0;
  const market = p.market_value || 0;
  if (!purchase) return 0;
  return Math.round(((market - purchase) / purchase) * 1000) / 10;
}

export function valuationHistory(p, points = 12) {
  const start = p.purchase_price || p.market_value || 0;
  const end = p.market_value || start;
  const acquired = p.acquired_at ? new Date(p.acquired_at).getTime() : Date.now() - points * 86400000;
  const now = Date.now();
  const span = Math.max(1, now - acquired);
  const out = [];
  for (let i = 0; i <= points; i++) {
    const frac = i / points;
    const t = acquired + span * frac;
    // linear interpolation with slight noise for a living-market feel
    const noise = Math.sin(i * 1.7) * (Math.abs(end - start) * 0.04);
    const value = Math.round(start + (end - start) * frac + noise);
    out.push({ date: new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value });
  }
  return out;
}

export function computeEmpireMetrics({ player, properties = [], territories = [], employments = [], myTerritories = [] }) {
  const crypto = player?.crypto_balance || 0;
  const buyPower = player?.buy_power || 0;
  const assetValue = properties.reduce((s, p) => s + (p.market_value || p.purchase_price || 0), 0);
  const cashFlowHourly = properties.reduce((s, p) => s + ((p.income_per_hour || 0) - (p.upkeep_per_hour || 0)), 0);
  const cashFlowWeekly = Math.round(cashFlowHourly * 24 * 7);
  const cashFlowMonthly = Math.round(cashFlowHourly * 24 * 30);
  const monthlyProfit = cashFlowMonthly - employments.reduce((s, e) => s + (e.salary || 0), 0);
  const weeklyRevenue = Math.round(properties.reduce((s, p) => s + (p.income_per_hour || 0), 0) * 24 * 7);
  const payrollCycle = employments.reduce((s, e) => s + (e.salary || 0), 0);
  const territoryValue = myTerritories.reduce((s, t) => s + ((t.control_percentage || 100) / 100) * 75000, 0);
  const netWorth = crypto + buyPower + assetValue + territoryValue;
  const influenceRating = Math.min(100, Math.round(
    (player?.level || 1) * 2.5 +
    (player?.endgame_points || 0) * 0.4 +
    myTerritories.length * 5 +
    (player?.territory_count || 0) * 3 +
    properties.length * 1.5
  ));
  const populationSupport = Math.min(100, Math.round(
    50 + properties.reduce((s, p) => s + (p.happiness || 70) * 0.1, 0) +
    myTerritories.length * 2 - (player?.wanted_level || 0) * 4
  ));
  const stabilityIndex = Math.max(0, Math.min(100, Math.round(
    70 + (player?.level || 1) * 0.5 - (player?.wanted_level || 0) * 6 -
    myTerritories.filter((t) => t.is_contested).length * 8
  )));
  const riskLevel = Math.min(100, Math.round((player?.wanted_level || 0) * 16 + myTerritories.filter((t) => t.is_contested).length * 10));
  const reputation = player?.endgame_points || 0;
  const globalRank = Math.max(1, Math.round(1000 - influenceRating * 9 - reputation * 0.5));
  const title = currentLeadershipTitle(player?.level || 1);

  return {
    netWorth, cashFlowHourly, cashFlowWeekly, cashFlowMonthly, monthlyProfit, weeklyRevenue,
    assetValue, territoryValue, payrollCycle, influenceRating, populationSupport,
    stabilityIndex, riskLevel, reputation, globalRank, title,
    territoryCount: myTerritories.length,
    propertyCount: properties.length,
  };
}

export function computeGovernanceStats({ player, properties = [], territories = [], employments = [], macroData = [], myTerritories = [] }) {
  const staffTotal = properties.reduce((s, p) => s + (p.staff_count || 0), 0);
  const employedCount = employments.filter((e) => e.employment_status === 'employed').length;
  const population = Math.max(1000, (player?.level || 1) * 1200 + staffTotal * 350 + myTerritories.length * 8000);
  const populationGrowth = Math.min(15, Math.round((myTerritories.length * 0.8 + properties.length * 0.3) * 10) / 10);
  const happiness = Math.min(100, Math.round(50 + properties.reduce((s, p) => s + (p.happiness || 70) * 0.06, 0) + myTerritories.length * 1.5 - (player?.wanted_level || 0) * 3));
  const employmentRate = Math.min(98, Math.round(60 + employedCount * 2 + myTerritories.length * 1.5));
  const education = Math.min(100, Math.round(40 + (player?.level || 1) * 1.2));
  const healthcare = Math.min(100, Math.round(45 + properties.filter((p) => p.property_type === 'hotel' || p.property_type === 'restaurant').length * 4 + (player?.level || 1)));
  const housingAvail = Math.min(100, Math.round(50 + properties.length * 3));

  const gdp = Math.round((properties.reduce((s, p) => s + (p.income_per_hour || 0), 0) * 24 * 30) + myTerritories.length * 250000);
  const inflation = macroData.find((m) => m.data_type === 'inflation_data')?.current_value ?? 3.2;
  const manufacturing = Math.min(100, Math.round(properties.filter((p) => ['factory', 'warehouse'].includes(p.property_type)).length * 12 + 20));
  const retail = Math.min(100, Math.round(properties.filter((p) => ['restaurant', 'gas_station', 'nightclub', 'casino'].includes(p.property_type)).length * 10 + 25));
  const tourism = Math.min(100, Math.round(properties.filter((p) => ['hotel', 'nightclub', 'casino', 'private_island'].includes(p.property_type)).length * 9 + 20));
  const techSector = Math.min(100, Math.round((player?.skills?.hacking || 0) * 0.6 + 20));

  const infrastructure = Math.min(100, Math.round(40 + myTerritories.length * 4 + (player?.level || 1) * 0.8));
  const publicServices = Math.min(100, Math.round(35 + (player?.level || 1) + properties.length * 1.5));

  return {
    population: { growth: populationGrowth, happiness, employment: employmentRate, education, healthcare, housingAvail, total: population },
    economy: { gdp, inflation, manufacturing, retail, tourism, tech: techSector },
    infrastructure, publicServices,
  };
}