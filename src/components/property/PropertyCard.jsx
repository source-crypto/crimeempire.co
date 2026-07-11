import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Wrench, Home } from 'lucide-react';

const LEGIT_META = {
  legitimate: { label: 'Legitimate', cls: 'bg-green-600' },
  front: { label: 'Criminal Front', cls: 'bg-purple-600' },
  illicit: { label: 'Illicit', cls: 'bg-red-600' },
};

export default function PropertyCard({ property, mode, accrued, onBuy, onCollect, onRepair, onSell, disabled }) {
  const legit = LEGIT_META[property.legitimacy] || LEGIT_META.legitimate;
  const priceLabel = mode === 'owned' ? property.market_value : property.purchase_price;
  return (
    <Card className="glass-panel border-purple-500/20 flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{property.emoji || '🏢'}</span>
            <div>
              <h4 className="text-white font-bold leading-tight">{property.name}</h4>
              <p className="text-xs text-gray-400 capitalize">{(property.property_type||'').replace('_',' ')} · {property.district}</p>
            </div>
          </div>
          <Badge className={`${legit.cls} text-white`}>{legit.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
          <div className="flex justify-between"><span className="text-gray-400">💰 Income/hr</span><span className="text-green-400">${(property.income_per_hour||0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">🔧 Upkeep/hr</span><span className="text-orange-400">${(property.upkeep_per_hour||0).toLocaleString()}</span></div>
          {mode === 'owned' ? (
            <>
              <div className="flex justify-between"><span className="text-gray-400">📊 Condition</span><span className={(property.condition||100) < 40 ? 'text-red-400' : 'text-cyan-400'}>{Math.round(property.condition||100)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">👥 Staff</span><span className="text-purple-400">{property.staff_count||0}</span></div>
            </>
          ) : (
            <div className="flex justify-between col-span-2"><span className="text-gray-400">👥 Staff needed</span><span className="text-purple-400">{property.staff_count||0}</span></div>
          )}
        </div>

        {mode === 'owned' && accrued != null && (
          <div className="mb-3 p-2 rounded-lg bg-green-950/40 border border-green-500/30 flex items-center justify-between">
            <span className="text-xs text-gray-300">Ready to collect</span>
            <span className="text-sm font-bold text-green-400">${accrued.toLocaleString()}</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 mt-auto">
          <span className="text-xs text-gray-400">{mode === 'owned' ? 'Market value' : 'Price'}</span>
          <span className="text-lg font-bold text-cyan-400">${(priceLabel||0).toLocaleString()}</span>
        </div>

        <div className="flex gap-2">
          {mode === 'catalog' && (
            <Button size="sm" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600" onClick={onBuy} disabled={disabled}>
              <Home className="w-4 h-4 mr-1" /> Purchase
            </Button>
          )}
          {mode === 'owned' && (
            <>
              <Button size="sm" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600" onClick={onCollect} disabled={disabled || !accrued}>
                <DollarSign className="w-3 h-3 mr-1" /> Collect
              </Button>
              <Button size="sm" variant="outline" className="border-purple-500/40 text-purple-300 px-2" onClick={onRepair} disabled={disabled}>
                <Wrench className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/40 text-red-300" onClick={onSell} disabled={disabled}>
                Sell
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}