import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_META, RARITY_META, getMaterial, xpToNextCraftingLevel } from './craftingData';
import { Hammer, Lock, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function CraftWorkshop({ profile, recipes, inventory, onCraft, busy }) {
  const [filter, setFilter] = useState('all');
  const cats = ['all', ...Object.keys(CATEGORY_META)];

  const getQty = (name) => inventory.find((i) => i.name === name)?.quantity || 0;
  const visible = (recipes || []).filter((r) => filter === 'all' || r.category === filter);

  const canCraft = (recipe) => {
    if ((profile?.crafting_level || 1) < (recipe.required_level || 1)) return { ok: false, reason: `Requires level ${recipe.required_level}` };
    for (const m of recipe.materials || []) {
      if (getQty(m.material) < m.quantity) return { ok: false, reason: `Need ${m.quantity}× ${m.material} (have ${getQty(m.material)})` };
    }
    return { ok: true };
  };

  const specialtyBonus = (recipe) => (profile?.specialty === recipe.category ? '+15%' : null);

  return (
    <div className="space-y-4">
      {/* Profile summary */}
      <Card className="glass-panel border border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Hammer className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-xs text-gray-400">Crafting Level</p>
                <p className="text-2xl font-bold text-white">Lv {profile?.crafting_level || 1}</p>
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>XP to next level</span><span>{profile?.crafting_xp || 0}/{xpToNextCraftingLevel(profile?.crafting_level || 1)}</span></div>
              <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, ((profile?.crafting_xp || 0) / xpToNextCraftingLevel(profile?.crafting_level || 1)) * 100)}%` }} />
              </div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Items Crafted: <span className="text-white font-semibold">{profile?.total_crafted || 0}</span></p>
              <p>Career Earned: <span className="text-green-400 font-semibold">${(profile?.total_earned || 0).toLocaleString()}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => {
          const meta = CATEGORY_META[c];
          return (
            <button key={c} onClick={() => setFilter(c)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === c ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
              {c === 'all' ? '🏭 All' : <>{meta.icon} {meta.label}</>}
            </button>
          );
        })}
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((recipe) => {
          const catMeta = CATEGORY_META[recipe.category];
          const rarMeta = RARITY_META[recipe.rarity] || RARITY_META.common;
          const check = canCraft(recipe);
          const bonus = specialtyBonus(recipe);
          return (
            <Card key={recipe.id} className={`glass-panel border ${rarMeta.border}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{recipe.icon || catMeta.icon}</span>
                    <div>
                      <CardTitle className="text-white text-base">{recipe.name}</CardTitle>
                      <p className={`text-xs ${catMeta.color}`}>{catMeta.label}</p>
                    </div>
                  </div>
                  <Badge className={`bg-slate-700 ${rarMeta.color} capitalize`}>{recipe.rarity}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                <p className="text-xs text-gray-400">{recipe.description}</p>

                <div className="bg-slate-900/50 rounded p-2 border border-gray-700 space-y-1">
                  <p className="text-xs text-gray-300 font-semibold">Required Materials</p>
                  {(recipe.materials || []).map((m, i) => {
                    const have = getQty(m.material);
                    const enough = have >= m.quantity;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className={enough ? 'text-gray-300' : 'text-red-400'}>{getMaterial(m.material)?.icon || '📦'} {m.material} ×{m.quantity}</span>
                        <span className={enough ? 'text-green-400' : 'text-red-400'}>{have}/{m.quantity}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Output value: <span className="text-green-400 font-semibold">${recipe.output_value.toLocaleString()}</span></span>
                  <span className="text-gray-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />+{recipe.craft_xp} XP {bonus && <span className="text-purple-300">{bonus}</span>}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Requires Level {recipe.required_level}</span>
                </div>

                <Button onClick={() => onCraft(recipe)} disabled={!check.ok || busy} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40">
                  {check.ok ? <><Hammer className="w-4 h-4" /> Craft {recipe.output_quantity > 1 ? `×${recipe.output_quantity}` : ''}</> : <><Lock className="w-4 h-4" /> {check.reason}</>}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}