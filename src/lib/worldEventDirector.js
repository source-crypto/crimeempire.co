// World Event Director — evaluates live world conditions and surfaces triggerable
// world events (transit disruptions, infrastructure failures, economic shifts,
// major investigations, rival gang wars, public events). Pure functions.
import { computeWorldState } from './missionDirector';

const ARCHETYPES = [
  {
    id: 'transit_disruption',
    title: (ws) => `Transit Disruption — ${ws.weather.key === 'storm' ? 'Storm Damage' : 'Signal Failure'}`,
    worldType: 'economic_crisis',
    globalType: 'supply_shortage',
    severity: 'moderate',
    narrative: (ws) => `A ${ws.weather.label.toLowerCase()} event has disrupted the city's transit network. Freight delays ripple through supply chains; ${ws.economicCondition === 'boom' ? 'demand is already strained' : 'prices soften'}.`,
    weight: (ws) => 25 + (['storm', 'rain'].includes(ws.weather.key) ? 30 : 0) + (ws.economicCondition === 'boom' ? 10 : 0),
    effects: { heat: 0, revenue: -0.1, defense: 0, wanted: 0 },
    market: { price: 0.15, demand: 0.1, supply: -0.2 },
    factors: (ws) => ({ weather: ws.weather.key, economy: ws.economicCondition }),
  },
  {
    id: 'infrastructure_failure',
    title: () => `Infrastructure Failure — Power Grid`,
    worldType: 'economic_crisis',
    globalType: 'supply_shortage',
    severity: 'major',
    narrative: (ws) => `A power grid failure blacks out parts of the city. ${ws.territoryTension > 50 ? 'Unrest spreads in contested districts.' : 'Emergency services scramble.'} Security systems down — a window for bold moves.`,
    weight: (ws) => 15 + (ws.territoryTension > 50 ? 25 : 0) + (ws.policePresence > 70 ? 10 : 0),
    effects: { heat: -10, revenue: -0.15, defense: -0.2, wanted: 0 },
    market: { price: 0.1, demand: -0.1, supply: -0.15 },
    factors: (ws) => ({ territoryTension: ws.territoryTension, policePresence: ws.policePresence }),
  },
  {
    id: 'economic_boom',
    title: () => `Economic Surge — Market Boom`,
    worldType: 'market_boom',
    globalType: 'market_surge',
    severity: 'moderate',
    narrative: () => `Tourism and retail demand spike across the city. Businesses boom, liquidity floods the streets — prime conditions to move product and launder cash.`,
    weight: (ws) => 20 + (ws.economicCondition === 'boom' ? 30 : 0) + (ws.timeOfDay.key === 'day' ? 8 : 0),
    effects: { heat: 0, revenue: 0.2, defense: 0, wanted: 0 },
    market: { price: 0.1, demand: 0.25, supply: 0.05 },
    factors: (ws) => ({ economy: ws.economicCondition, timeOfDay: ws.timeOfDay.key }),
  },
  {
    id: 'economic_crash',
    title: () => `Economic Shock — Market Crash`,
    worldType: 'economic_crisis',
    globalType: 'market_crash',
    severity: 'major',
    narrative: () => `A market crash tightens credit and panics investors. Asset prices collapse — distress sales create acquisition opportunities, but cash flow tightens.`,
    weight: (ws) => 15 + (ws.economicCondition === 'crash' ? 30 : 0),
    effects: { heat: 0, revenue: -0.2, defense: 0, wanted: 0 },
    market: { price: -0.2, demand: -0.2, supply: 0.1 },
    factors: (ws) => ({ economy: ws.economicCondition }),
  },
  {
    id: 'major_investigation',
    title: (ws) => `Major Investigation — ${ws.policePresence > 70 ? 'Federal Task Force' : 'Detective Sweep'}`,
    worldType: 'law_crackdown',
    globalType: 'police_crackdown',
    severity: 'major',
    narrative: (ws) => `Law enforcement launches a major investigation (presence ${ws.policePresence}/100). ${ws.activeLawEvents > 0 ? 'Stacking on active operations.' : 'Fresh task force mobilizing.'} Heat rises across your network.`,
    weight: (ws) => 20 + (ws.policePresence > 60 ? 30 : 0) + (ws.activeLawEvents > 0 ? 15 : 0),
    effects: { heat: 25, revenue: 0, defense: 0, wanted: 1 },
    market: { price: 0, demand: -0.05, supply: 0 },
    factors: (ws) => ({ policePresence: ws.policePresence, activeLawEvents: ws.activeLawEvents }),
  },
  {
    id: 'rival_gang_war',
    title: () => `Rival Gang War`,
    worldType: 'gang_war',
    globalType: 'gang_war',
    severity: 'major',
    narrative: (ws) => `Rival factions escalate to open conflict (tension ${ws.territoryTension}/100). ${ws.factionActivity > 0 ? 'Multiple crews mobilizing.' : 'A surprise offensive.'} Turf shifts and chaos create openings — and danger.`,
    weight: (ws) => 20 + (ws.territoryTension > 50 ? 30 : 0) + (ws.factionActivity > 0 ? 15 : 0),
    effects: { heat: 10, revenue: -0.1, defense: -0.1, wanted: 0 },
    market: { price: 0.1, demand: 0, supply: -0.1 },
    factors: (ws) => ({ territoryTension: ws.territoryTension, factionActivity: ws.factionActivity }),
  },
  {
    id: 'public_festival',
    title: () => `Public Festival — Citywide Event`,
    worldType: 'market_boom',
    globalType: 'opportunity',
    severity: 'minor',
    narrative: (ws) => `A major festival fills the streets. ${ws.timeOfDay.key === 'night' ? 'Night crowds surge.' : 'Daytime attendance peaks.'} Dense crowds, thin police per capita — ideal for moving product.`,
    weight: (ws) => 15 + (ws.timeOfDay.key === 'night' ? 20 : 12) + (ws.policePresence < 50 ? 10 : 0),
    effects: { heat: 5, revenue: 0.15, defense: 0, wanted: 0 },
    market: { price: 0.05, demand: 0.2, supply: 0 },
    factors: (ws) => ({ timeOfDay: ws.timeOfDay.key, policePresence: ws.policePresence }),
  },
];

function buildSpec(a, ws) {
  return {
    archetype_id: a.id,
    title: a.title(ws),
    narrative: a.narrative(ws),
    worldType: a.worldType,
    globalType: a.globalType,
    severity: a.severity,
    effects: a.effects,
    market: a.market,
    factors: a.factors(ws),
    weight: Math.max(1, a.weight(ws)),
  };
}

export function evaluateEvents(worldState) {
  const weighted = ARCHETYPES.map(a => ({ a, w: Math.max(1, a.weight(worldState)) })).sort((x, y) => y.w - x.w);
  const count = Math.min(4, weighted.length);
  const offset = Math.floor(Date.now() / 120000) % Math.max(1, weighted.length - count + 1);
  const picked = weighted.slice(offset, offset + count);
  const fill = weighted.slice(0, count - picked.length);
  return [...picked, ...fill].map(({ a }) => buildSpec(a, worldState));
}

export { computeWorldState };