import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_META } from './craftingData';
import { Package, DollarSign, Trash2 } from 'lucide-react';

// Inventory shows crafted goods + materials owned by the player (Item records).
export default function CraftingInventory({ items, onSell, onDiscard, busy }) {
  const crafted = items.filter((i) => i.item_type !== 'material');
  const materials = items.filter((i) => i.item_type === 'material');
  const totalValue = items.reduce((s, i) => s + (i.current_market_value || i.base_value || 0) * (i.quantity || 1), 0);

  return (
    <div className="space-y-4">
      <Card className="glass-panel border border-green-500/20">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2"><Package className="w-6 h-6 text-green-400" /><div><p className="text-xs text-gray-400">Inventory Value</p><p className="text-xl font-bold text-green-400">${totalValue.toLocaleString()}</p></div></div>
          <div className="text-xs text-gray-400 text-right"><p>Materials: <span className="text-white">{materials.length}</span> · Crafted goods: <span className="text-white">{crafted.length}</span></p></div>
        </CardContent>
      </Card>

      <Section title="Crafted Goods" icon={<Package className="w-4 h-4" />} items={crafted} onSell={onSell} onDiscard={onDiscard} busy={busy} />
      <Section title="Raw Materials" icon={<span className="text-base">📦</span>} items={materials} onDiscard={onDiscard} busy={busy} />
    </div>
  );
}

function Section({ title, icon, items, onSell, onDiscard, busy }) {
  return (
    <Card className="glass-panel border border-gray-700">
      <CardHeader className="border-b border-gray-700"><CardTitle className="text-white text-sm flex items-center gap-2">{icon}{title} ({items.length})</CardTitle></CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">Nothing here yet. Gather or craft to fill your inventory.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map((it) => {
              const val = (it.current_market_value || it.base_value || 0) * (it.quantity || 1);
              return (
                <div key={it.id} className="p-3 rounded-lg bg-slate-900/50 border border-gray-700 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{it.name} <span className="text-gray-500">×{it.quantity || 1}</span></p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs text-gray-400 capitalize">{it.item_type}</Badge>
                      <span className="text-xs text-green-400 flex items-center gap-0.5"><DollarSign className="w-3 h-3" />{val.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {onSell && it.item_type !== 'material' && (
                      <Button size="sm" onClick={() => onSell(it)} disabled={busy} className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700">Sell</Button>
                    )}
                    {onDiscard && (
                      <Button size="sm" variant="ghost" onClick={() => onDiscard(it)} disabled={busy} className="h-7 px-2 text-xs text-red-400 hover:bg-red-900/20"><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}