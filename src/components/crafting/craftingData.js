// Raw material catalog and helper functions for the Crafting & Workshop system.

export const MATERIAL_CATALOG = [
  { name: 'Scrap Metal', category: 'metal', price: 40, rarity: 'common', icon: '🔩', source: 'Industrial district scrapyards' },
  { name: 'Steel', category: 'metal', price: 120, rarity: 'uncommon', icon: '⚙️', source: 'Construction sites' },
  { name: 'Electronics Chips', category: 'electronics', price: 90, rarity: 'common', icon: '🔌', source: 'Tech district salvage' },
  { name: 'Circuit Boards', category: 'electronics', price: 180, rarity: 'uncommon', icon: '💻', source: 'E-waste dumps' },
  { name: 'Fabric Roll', category: 'textile', price: 50, rarity: 'common', icon: '🧵', source: 'Garment district' },
  { name: 'Leather', category: 'textile', price: 140, rarity: 'uncommon', icon: '🟤', source: 'Tanneries' },
  { name: 'Chemicals', category: 'chemical', price: 160, rarity: 'uncommon', icon: '🧪', source: 'Industrial plants' },
  { name: 'Pharmaceutical Base', category: 'chemical', price: 220, rarity: 'rare', icon: '💊', source: 'Medical suppliers' },
  { name: 'Lumber', category: 'material', price: 60, rarity: 'common', icon: '🪵', source: 'Rural county mills' },
  { name: 'Glass', category: 'material', price: 75, rarity: 'common', icon: '🪟', source: 'Glassworks' },
  { name: 'Rare Alloy', category: 'metal', price: 480, rarity: 'rare', icon: '🔷', source: 'Smuggling fronts' },
  { name: 'Silicon Wafer', category: 'electronics', price: 320, rarity: 'rare', icon: '💠', source: 'Tech startups' },
];

export const RARITY_META = {
  common: { color: 'text-gray-300', border: 'border-gray-500/40', bg: 'bg-gray-800/40', pct: 60 },
  uncommon: { color: 'text-green-400', border: 'border-green-500/40', bg: 'bg-green-900/20', pct: 25 },
  rare: { color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-900/20', pct: 10 },
  epic: { color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-900/20', pct: 4 },
  legendary: { color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-900/20', pct: 1 },
};

export const CATEGORY_META = {
  vehicle_parts: { label: 'Vehicle Parts', icon: '🚗', color: 'text-amber-400' },
  electronics: { label: 'Electronics', icon: '🔌', color: 'text-cyan-400' },
  clothing: { label: 'Clothing', icon: '👕', color: 'text-pink-400' },
  medical: { label: 'Medical Supplies', icon: '💊', color: 'text-emerald-400' },
  building_materials: { label: 'Building Materials', icon: '🧱', color: 'text-orange-400' },
  furniture: { label: 'Furniture', icon: '🪑', color: 'text-violet-400' },
};

// XP needed to reach the next crafting level.
export const xpToNextCraftingLevel = (level) => 100 + level * 50;

// Random material from a gather action, weighted by rarity.
export const rollGatherMaterials = (luck = 0) => {
  // luck reduces common chance slightly (better scavengers find rarer mats)
  const roll = Math.random() * 100;
  let rarity;
  if (roll < (1 + luck * 0.5)) rarity = 'legendary';
  else if (roll < (5 + luck * 0.3)) rarity = 'epic';
  else if (roll < (15 + luck * 0.2)) rarity = 'rare';
  else if (roll < (40 + luck * 0.1)) rarity = 'uncommon';
  else rarity = 'common';
  const pool = MATERIAL_CATALOG.filter((m) => m.rarity === rarity);
  if (pool.length === 0) {
    return MATERIAL_CATALOG[Math.floor(Math.random() * MATERIAL_CATALOG.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

export const getMaterial = (name) => MATERIAL_CATALOG.find((m) => m.name === name);