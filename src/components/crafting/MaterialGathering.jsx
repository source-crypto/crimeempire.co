import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MATERIAL_CATALOG, RARITY_META } from './craftingData';
import { Pickaxe, ShoppingBag, Clock, Coins } from 'lucide-react';
import { toast } from 'sonner';

const GATHER_COOLDOWN_MS = 20 * 1000; // 20 seconds between gathers (demo-friendly)

export default function MaterialGathering({ profile, inventory, onGather, onBuy, buyPower, busy }) {
  const [qty, setQty] = useState(1);

  const now = Date.now();
  const lastGather = profile?.last_gather_at ? new Date(profile.last_gather_at).getTime() : 0;
  const cooldownLeft = Math.max(0, GATHER_COOLDOWN_MS - (now - lastGather));
  const canGather = cooldownLeft === 0;

  const getQty = (name) => inventory.find((i) => i.name === name)?.quantity || 0;

  return (
    <div className="space-y-4">
      {/* Gather action */}
      <Card className="glass-panel border border-amber-500/20">
        <CardHeader className="border-b border-amber-500/20">
          <CardTitle className="text-amber-400 flex items-center gap-2"><Pickaxe className="w-5 h-5" />Scavenge for Materials</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-gray-400">Scour the city's districts for raw materials. Higher rarity materials are harder to find. Your crafting level slightly improves finds.</p>
          <div className="flex items-center gap-3">
            <Button onClick={onGather} disabled={!canGather || busy} className="bg-amber-600 hover:bg-amber-700">
              <Pickaxe className="w-4 h-4" /> {busy ? 'Scavenging…' : '🧤 Scavenge District'}
            </Button>
            {!canGather && (
              <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />Cooldown: {Math.ceil(cooldownLeft / 1000)}s</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buy materials */}
      <Card className="glass-panel border border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-purple-400 flex items-center gap-2"><ShoppingBag className="w-5 h-5" />Buy Materials</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-gray-400">Skip the scavenging — buy raw materials directly with cash. Cash available: <span className="text-green-400 font-semibold">${(buyPower || 0).toLocaleString()}</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {MATERIAL_CATALOG.map((m) => {
              const meta = RARITY_META[m.rarity];
              const cost = m.price * qty;
              const affordable = (buyPower || 0) >= cost;
              return (
                <div key={m.name} className={`p-3 rounded-lg border ${meta.border} ${meta.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${meta.color}`}>{m.name}</p>
                        <p className="text-xs text-gray-500">{m.source}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${meta.color}`}>{m.rarity}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">Owned: <span className="text-white">{getQty(m.name)}</span></span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Coins className="w-3 h-3" />${cost.toLocaleString()}</span>
                      <Button size="sm" onClick={() => onBuy(m, qty)} disabled={!affordable || busy} className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700">
                        Buy ×{qty}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-400">Buy quantity:</span>
            {[1, 5, 10].map((n) => (
              <button key={n} onClick={() => setQty(n)} className={`px-2 py-1 rounded text-xs ${qty === n ? 'bg-purple-700 text-white' : 'bg-slate-800 text-gray-400'}`}>×{n}</button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}