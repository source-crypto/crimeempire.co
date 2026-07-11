// AI Mission Director — procedural mission generation from live world state.
// Pure functions: no LLM dependency, deterministic from world conditions.

const TIME_BANDS = [
  { max: 5, key: 'dawn', label: 'Dawn' },
  { max: 11, key: 'day', label: 'Daytime' },
  { max: 17, key: 'dusk', label: 'Dusk' },
  { max: 24, key: 'night', label: 'Night' },
];

export function timeOfDay(date = new Date()) {
  const h = date.getHours();
  return TIME_BANDS.find(b => h < b.max) || TIME_BANDS[TIME_BANDS.length - 1];
}

const WEATHERS = ['clear', 'rain', 'storm', 'fog'];

export function deriveWeather(worldEvents = [], date = new Date()) {
  const catastrophic = worldEvents.find(e => e.severity === 'catastrophic');
  if (catastrophic) return { key: 'storm', label: 'Storm' };
  const major = worldEvents.find(e => e.severity === 'major');
  if (major) return { key: 'rain', label: 'Heavy Rain' };
  const seed = Math.floor(date.getTime() / (1000 * 60 * 60 * 6));
  const w = WEATHERS[seed % WEATHERS.length];
  return { key: w, label: w.charAt(0).toUpperCase() + w.slice(1) };
}

export function computeWorldState({
  playerLevel = 1,
  reputation = {},
  worldEvents = [],
  globalEvents = [],
  economicEvents = [],
  factionActivities = [],
  governance = [],
  wantedLevel = 0,
}) {
  const tod = timeOfDay();
  const weather = deriveWeather(worldEvents);
  const escalation = governance[0]?.escalation_phase || 'normal';
  const activeLawEvents = worldEvents.filter(e => ['law_crackdown', 'police_raid'].includes(e.event_type));
  const policePresence = Math.min(100, Math.round(
    30 + (escalation === 'high' ? 25 : escalation === 'critical' ? 40 : 0) + activeLawEvents.length * 12 + (wantedLevel * 0.3)
  ));
  const boomEvents = [...globalEvents, ...economicEvents].filter(e =>
    ['market_surge', 'market_boom', 'opportunity'].includes(e.event_type || e.effect_type));
  const crashEvents = [...globalEvents, ...economicEvents].filter(e =>
    ['market_crash', 'supply_shortage', 'economic_crisis'].includes(e.event_type || e.effect_type));
  const economicCondition = boomEvents.length > crashEvents.length ? 'boom' : crashEvents.length > boomEvents.length ? 'crash' : 'stable';
  const tensionEvents = worldEvents.filter(e => ['territory_uprising', 'gang_war', 'faction_betrayal'].includes(e.event_type));
  const territoryTension = Math.min(100, Math.round(20 + tensionEvents.length * 18 + factionActivities.length * 5));
  const respect = reputation.underworld_respect ?? 0;
  const streetCred = reputation.street_credibility ?? 0;
  const repScore = respect + streetCred;
  const repTier = repScore > 80 ? 5 : repScore > 40 ? 4 : repScore > 10 ? 3 : repScore > -20 ? 2 : 1;
  return {
    timeOfDay: tod, weather, policePresence, economicCondition, territoryTension,
    repTier, factionActivity: factionActivities.length, escalation,
    activeLawEvents: activeLawEvents.length, boomEvents: boomEvents.length, crashEvents: crashEvents.length,
  };
}

const ARCHETYPES = [
  {
    id: 'smugglers_run',
    title: (ws) => `Smuggler's Run — ${ws.economicCondition === 'boom' ? 'Hot Market' : 'Quiet Corridor'}`,
    type: 'crew_mission',
    narrative: (ws) => `Demand is ${ws.economicCondition}; ${ws.weather.label.toLowerCase()} skies and ${ws.policePresence > 60 ? 'heavy patrols' : 'thin patrols'} shape the route. Move the cargo before the window closes.`,
    objectives: ['Source the cargo from your supplier', 'Load transport at the dockyard', 'Deliver to the drop point undetected', 'Collect payment and launder proceeds'],
    baseDiff: 35,
    weight: (ws) => 50 + (ws.economicCondition === 'boom' ? 30 : 0) + (ws.policePresence < 50 ? 15 : 0) - (ws.weather.key === 'storm' ? 5 : 0),
    factors: (ws) => ({ economicCondition: ws.economicCondition, policePresence: ws.policePresence, weather: ws.weather.key }),
  },
  {
    id: 'heat_decoy',
    title: (ws) => `Heat Decoy — ${ws.policePresence > 70 ? 'Red Zone' : 'Yellow Zone'}`,
    type: 'side_quest',
    narrative: (ws) => `Law enforcement presence is at ${ws.policePresence}/100. Draw their attention away from your operations with a coordinated decoy, then slip your real crew through the gap.`,
    objectives: ['Stage a loud distraction across town', 'Monitor police radio channels', 'Confirm patrols reroute to the decoy', 'Extract your active crew to safety'],
    baseDiff: 45,
    weight: (ws) => 20 + (ws.policePresence > 60 ? 35 : 0) + (ws.activeLawEvents > 0 ? 15 : 0),
    factors: (ws) => ({ policePresence: ws.policePresence, activeLawEvents: ws.activeLawEvents }),
  },
  {
    id: 'territory_push',
    title: (ws) => `Territory Push — ${ws.territoryTension > 60 ? 'Contested Block' : 'Soft Target'}`,
    type: 'faction_conflict',
    narrative: (ws) => `Rival influence is wavering (tension ${ws.territoryTension}/100). ${ws.factionActivity > 0 ? 'Faction activity creates an opening.' : 'A quiet block awaits a bold move.'} Seize the turf before they regroup.`,
    objectives: ['Scout the rival-held block', 'Disrupt their supply line', 'Intimidate local lieutenants', 'Raise your flag and hold the corner'],
    baseDiff: 55,
    weight: (ws) => 25 + (ws.territoryTension > 50 ? 30 : 0) + (ws.factionActivity > 0 ? 12 : 0),
    factors: (ws) => ({ territoryTension: ws.territoryTension, factionActivity: ws.factionActivity }),
  },
  {
    id: 'black_market_play',
    title: (ws) => `Market Play — ${ws.economicCondition === 'boom' ? 'Riding the Surge' : ws.economicCondition === 'crash' ? 'Short Squeeze' : 'Steady Trade'}`,
    type: 'side_quest',
    narrative: (ws) => `The market is ${ws.economicCondition}. Source supply, undercut rivals, and expand your network while the conditions hold.`,
    objectives: ['Acquire undervalued inventory', 'Undercut rival listings by 10%', 'Recruit a new distributor', 'Bank the profit before conditions shift'],
    baseDiff: 30,
    weight: (ws) => 30 + (ws.economicCondition === 'boom' ? 25 : 0) + (ws.economicCondition === 'crash' ? 15 : 0),
    factors: (ws) => ({ economicCondition: ws.economicCondition, boomEvents: ws.boomEvents }),
  },
  {
    id: 'night_opportunity',
    title: (ws) => `Night Opportunity — ${ws.weather.label}`,
    type: 'side_quest',
    narrative: (ws) => `Under cover of ${ws.weather.label.toLowerCase()} and darkness, a window opens. ${ws.policePresence > 60 ? 'Patrols are thick but distracted.' : 'Streets are quiet.'} Move fast and vanish.`,
    objectives: ['Infiltrate the target location', 'Acquire the objective asset', 'Avoid detection by patrols', 'Vanish before dawn'],
    baseDiff: 40,
    weight: (ws) => 15 + (ws.timeOfDay.key === 'night' ? 30 : 0) + (ws.timeOfDay.key === 'dusk' ? 15 : 0) + (['rain', 'fog', 'storm'].includes(ws.weather.key) ? 12 : 0),
    factors: (ws) => ({ timeOfDay: ws.timeOfDay.key, weather: ws.weather.key }),
  },
  {
    id: 'rival_heist_prep',
    title: () => `Rival Heist Prep — Intel Phase`,
    type: 'heist_preparation',
    narrative: (ws) => `A rival faction ${ws.factionActivity > 0 ? 'is distracted by internal conflict' : 'sits on a high-value stash'}. Gather what you need to hit them before they fortify.`,
    objectives: ['Recon the rival stash house', 'Recruit a specialist for the job', 'Map guard rotations', 'Finalize the entry plan'],
    baseDiff: 50,
    weight: (ws) => 20 + (ws.territoryTension > 40 ? 18 : 0) + (ws.factionActivity > 0 ? 15 : 0),
    factors: (ws) => ({ territoryTension: ws.territoryTension, factionActivity: ws.factionActivity }),
  },
  {
    id: 'crackdown_evasion',
    title: () => `Crackdown Evasion`,
    type: 'crew_mission',
    narrative: (ws) => `A law enforcement crackdown (${ws.activeLawEvents} active operations) threatens your network. Lay low, relocate stashes, and buy time.`,
    objectives: ['Relocate primary stash', 'Activate safehouse protocol', 'Bribe a compromised contact', 'Wait for heat to decay'],
    baseDiff: 38,
    weight: (ws) => 10 + (ws.activeLawEvents > 0 ? 35 : 0) + (ws.policePresence > 70 ? 20 : 0),
    factors: (ws) => ({ activeLawEvents: ws.activeLawEvents, policePresence: ws.policePresence }),
  },
];

function buildSpec(archetype, ws, playerLevel) {
  const policeAdj = ws.policePresence > 60 ? 15 : ws.policePresence > 40 ? 8 : 0;
  const tensionAdj = ws.territoryTension > 60 ? 12 : 0;
  const weatherAdj = ws.weather.key === 'storm' ? 10 : ws.weather.key === 'rain' ? 5 : 0;
  const nightAdj = ws.timeOfDay.key === 'night' ? -5 : 0;
  const levelAdj = Math.min(20, playerLevel * 2);
  const diffScore = Math.max(5, Math.min(100, archetype.baseDiff + policeAdj + tensionAdj + weatherAdj + nightAdj + levelAdj));
  const difficulty = diffScore < 30 ? 'easy' : diffScore < 55 ? 'medium' : diffScore < 78 ? 'hard' : 'extreme';
  const economyMult = ws.economicCondition === 'boom' ? 1.3 : ws.economicCondition === 'crash' ? 0.85 : 1.0;
  const baseReward = 4000 + diffScore * 90;
  const crypto = Math.round(baseReward * economyMult);
  const experience = Math.round(250 + diffScore * 4);
  const reputation = Math.round(10 + diffScore * 0.2);
  const factorList = [
    { factor_type: 'police_presence', value: ws.policePresence, reason: policeAdj ? `+${policeAdj} (patrols)` : 'No patrol pressure' },
    { factor_type: 'territory_tension', value: ws.territoryTension, reason: tensionAdj ? `+${tensionAdj} (contested)` : 'Stable turf' },
    { factor_type: 'weather', value: ws.weather.key, reason: weatherAdj ? `+${weatherAdj} (${ws.weather.label})` : 'Clear' },
    { factor_type: 'time_of_day', value: ws.timeOfDay.key, reason: nightAdj ? 'Night: -5 detection' : 'Daylight' },
    { factor_type: 'economy', value: ws.economicCondition, reason: `x${economyMult} reward` },
    { factor_type: 'player_level', value: playerLevel, reason: `+${levelAdj} (scaling)` },
  ];
  return {
    archetype_id: archetype.id,
    title: archetype.title(ws),
    narrative: archetype.narrative(ws),
    mission_type: archetype.type,
    difficulty, diffScore,
    objectives: archetype.objectives.map((desc) => ({ description: desc, completed: false, progress: 0 })),
    rewards: { crypto, experience, reputation, items: [] },
    requirements: { min_level: Math.max(1, playerLevel - 2), crew_required: diffScore > 65 },
    factors: archetype.factors(ws),
    factorList,
    worldState: ws,
  };
}

export function generateSlate(worldState, playerLevel = 1) {
  const weighted = ARCHETYPES.map(a => ({ a, w: Math.max(1, a.weight(worldState)) }));
  weighted.sort((x, y) => y.w - x.w);
  const count = Math.min(3, weighted.length);
  // rotate the slate slightly by time so repeated generations vary
  const offset = Math.floor(Date.now() / 60000) % Math.max(1, weighted.length - count + 1);
  const picked = weighted.slice(offset, offset + count);
  const fill = weighted.slice(0, count - picked.length);
  return [...picked, ...fill].map(({ a }) => buildSpec(a, worldState, playerLevel));
}