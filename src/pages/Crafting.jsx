import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Hammer, Pickaxe, Package } from 'lucide-react';

import MaterialGathering from '@/components/crafting/MaterialGathering';
import CraftWorkshop from '@/components/crafting/CraftWorkshop';
import CraftingInventory from '@/components/crafting/CraftingInventory';
import { rollGatherMaterials, getMaterial, xpToNextCraftingLevel, CATEGORY_META, RARITY_META } from '@/components/crafting/craftingData';

const GATHER_COOLDOWN_MS = 20 * 1000;
const CRAFTABLE_ITEM_TYPES = ['equipment', 'vehicle_part', 'material', 'intel', 'blueprint'];

const TABS = [
  { id: 'workshop', label: 'Workshop', icon: Hammer },
  { id: 'materials', label: 'Materials', icon: Pickaxe },
  { id: 'inventory', label: 'Inventory', icon: Package },
];

export default function Crafting() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('workshop');
  const [busy, setBusy] = useState(false);

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });

  const { data: playerData, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => { const ps = await base44.entities.Player.filter({ created_by: user.email }); return ps[0]; },
    enabled: !!user,
  });

  // Crafting profile (one per player)
  const { data: profiles } = useQuery({
    queryKey: ['crafting-profile', user?.email],
    queryFn: async () => base44.entities.CraftingProfile.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const profile = profiles?.[0];

  // Recipes (shared catalog)
  const { data: recipes } = useQuery({
    queryKey: ['crafting-recipes'],
    queryFn: () => base44.entities.CraftingRecipe.list('-created_date', 100),
  });

  // Player's crafting inventory (Item records owned by player)
  const { data: rawItems } = useQuery({
    queryKey: ['crafting-inventory', playerData?.id],
    queryFn: async () => base44.entities.Item.filter({ owner_id: playerData.id, owner_type: 'player' }),
    enabled: !!playerData?.id,
  });
  // Only keep items relevant to crafting (materials + crafted outputs)
  const inventory = (rawItems || []).filter((i) => i.item_type === 'material' || CRAFTABLE_ITEM_TYPES.includes(i.item_type));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['crafting-profile', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['crafting-inventory', playerData?.id] });
    queryClient.invalidateQueries({ queryKey: ['player', user?.email] });
  };

  // --- Ensure profile exists ---
  const ensureProfile = async () => {
    if (profile) return profile;
    const created = await base44.entities.CraftingProfile.create({
      player_id: playerData.id,
      username: playerData.username,
      crafting_level: 1,
      crafting_xp: 0,
      total_crafted: 0,
      total_earned: 0,
      specialty: 'generalist',
    });
    queryClient.invalidateQueries({ queryKey: ['crafting-profile', user?.email] });
    return created;
  };

  // --- Add or increment a material/Item in inventory ---
  const addOrIncrementItem = async (name, itemType, qty, value, category, rarity) => {
    const existing = inventory.find((i) => i.name === name && i.item_type === itemType);
    if (existing) {
      await base44.entities.Item.update(existing.id, { quantity: (existing.quantity || 1) + qty });
    } else {
      await base44.entities.Item.create({
        name,
        item_type: itemType,
        category: category || 'materials',
        rarity: rarity || 'common',
        quantity: qty,
        base_value: value,
        current_market_value: value,
        owner_id: playerData.id,
        owner_type: 'player',
        is_tradeable: true,
      });
    }
  };

  const decrementItem = async (name, itemType, qty) => {
    const existing = inventory.find((i) => i.name === name && i.item_type === itemType);
    if (!existing) return;
    const newQty = (existing.quantity || 1) - qty;
    if (newQty <= 0) {
      await base44.entities.Item.delete(existing.id);
    } else {
      await base44.entities.Item.update(existing.id, { quantity: newQty });
    }
  };

  // --- Gather materials ---
  const gather = useMutation({
    mutationFn: async () => {
      const now = Date.now();
      const lastGather = profile?.last_gather_at ? new Date(profile.last_gather_at).getTime() : 0;
      if (now - lastGather < GATHER_COOLDOWN_MS) throw new Error('On cooldown');
      const luck = (profile?.crafting_level || 1) * 0.3;
      const mat = rollGatherMaterials(luck);
      await addOrIncrementItem(mat.name, 'material', 1, mat.price, 'materials', mat.rarity);
      await base44.entities.CraftingProfile.update(profile.id, { last_gather_at: new Date().toISOString() });
      return mat;
    },
    onMutate: () => setBusy(true),
    onSuccess: (mat) => { toast.success(`${getMaterial(mat.name).icon} Found ${mat.name} (${mat.rarity})`); invalidateAll(); },
    onError: (e) => toast.error(e.message === 'On cooldown' ? 'Scavenging cooldown active' : 'Gather failed'),
    onSettled: () => setBusy(false),
  });

  // --- Buy materials ---
  const buyMaterial = useMutation({
    mutationFn: async ({ material, qty }) => {
      const cost = material.price * qty;
      if ((playerData.buy_power || 0) < cost) throw new Error('Not enough cash');
      await base44.entities.Player.update(playerData.id, { buy_power: (playerData.buy_power || 0) - cost });
      await addOrIncrementItem(material.name, 'material', qty, material.price, 'materials', material.rarity);
      return { material, qty, cost };
    },
    onMutate: () => setBusy(true),
    onSuccess: ({ material, qty, cost }) => { toast.success(`Bought ${qty}× ${material.name} for $${cost.toLocaleString()}`); invalidateAll(); },
    onError: (e) => toast.error(e.message === 'Not enough cash' ? 'Not enough cash' : 'Purchase failed'),
    onSettled: () => setBusy(false),
  });

  // --- Craft ---
  const craft = useMutation({
    mutationFn: async (recipe) => {
      const p = await ensureProfile();
      // verify materials
      for (const m of recipe.materials || []) {
        const have = inventory.find((i) => i.name === m.material && i.item_type === 'material')?.quantity || 0;
        if (have < m.quantity) throw new Error(`Not enough ${m.material}`);
      }
      // consume materials
      for (const m of recipe.materials || []) {
        await decrementItem(m.material, 'material', m.quantity);
      }
      // specialty bonus to value
      const bonus = p.specialty === recipe.category ? 1.15 : 1;
      const outValue = Math.round((recipe.output_value || 100) * bonus);
      const outType = recipe.category === 'vehicle_parts' ? 'vehicle_part' : 'equipment';
      await addOrIncrementItem(recipe.name, outType, recipe.output_quantity || 1, outValue, 'materials', recipe.rarity);
      // award XP + level up
      const xpGain = recipe.craft_xp || 50;
      let newXp = (p.crafting_xp || 0) + xpGain;
      let newLevel = p.crafting_level || 1;
      let leveledUp = false;
      while (newXp >= xpToNextCraftingLevel(newLevel)) {
        newXp -= xpToNextCraftingLevel(newLevel);
        newLevel += 1;
        leveledUp = true;
      }
      await base44.entities.CraftingProfile.update(p.id, {
        crafting_xp: newXp,
        crafting_level: newLevel,
        total_crafted: (p.total_crafted || 0) + (recipe.output_quantity || 1),
      });
      return { recipe, leveledUp, newLevel, outValue };
    },
    onMutate: () => setBusy(true),
    onSuccess: ({ recipe, leveledUp, newLevel, outValue }) => {
      toast.success(`🔨 Crafted ${recipe.name} (value $${outValue.toLocaleString()})`);
      if (leveledUp) toast(`⬆️ Crafting level up! Now Lv ${newLevel}`, { duration: 4000 });
      invalidateAll();
    },
    onError: (e) => toast.error(e.message || 'Crafting failed'),
    onSettled: () => setBusy(false),
  });

  // --- Sell crafted good ---
  const sellItem = useMutation({
    mutationFn: async (item) => {
      const val = (item.current_market_value || item.base_value || 0) * (item.quantity || 1);
      await base44.entities.Player.update(playerData.id, { buy_power: (playerData.buy_power || 0) + val });
      await base44.entities.Item.delete(item.id);
      const p = profile;
      if (p) await base44.entities.CraftingProfile.update(p.id, { total_earned: (p.total_earned || 0) + val });
      return val;
    },
    onMutate: () => setBusy(true),
    onSuccess: (val) => { toast.success(`💰 Sold for $${val.toLocaleString()}`); invalidateAll(); },
    onError: () => toast.error('Sale failed'),
    onSettled: () => setBusy(false),
  });

  // --- Discard item ---
  const discardItem = useMutation({
    mutationFn: async (item) => { await base44.entities.Item.delete(item.id); return item.name; },
    onMutate: () => setBusy(true),
    onSuccess: (name) => { toast(`Discarded ${name}`); invalidateAll(); },
    onError: () => toast.error('Discard failed'),
    onSettled: () => setBusy(false),
  });

  if (!playerData) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading workshop…</div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
          <Hammer className="w-8 h-8 text-purple-400" /> Crafting & Workshop
        </h1>
        <p className="text-gray-400 mt-1">Gather raw materials, craft goods from vehicle parts to furniture, level your crafting skill, and sell for profit.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${tab === t.id ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'workshop' && <CraftWorkshop profile={profile} recipes={recipes} inventory={inventory} onCraft={(r) => craft.mutate(r)} busy={busy} />}
      {tab === 'materials' && <MaterialGathering profile={profile} inventory={inventory} onGather={() => gather.mutate()} onBuy={(m, q) => buyMaterial.mutate({ material: m, qty: q })} buyPower={playerData.buy_power} busy={busy} />}
      {tab === 'inventory' && <CraftingInventory items={inventory} onSell={(it) => sellItem.mutate(it)} onDiscard={(it) => discardItem.mutate(it)} busy={busy} />}
    </div>
  );
}