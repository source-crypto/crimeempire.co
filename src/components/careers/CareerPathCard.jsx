import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Rocket, DollarSign } from 'lucide-react';

export default function CareerPathCard({ path, onEmbark, disabled }) {
  const lawful = path.track === 'lawful';
  return (
    <Card className={`glass-panel flex flex-col ${path.accent}`}>
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{path.icon}</span>
            <h4 className="text-white font-bold leading-tight">{path.name}</h4>
          </div>
          <Badge className={lawful ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>{lawful ? 'Lawful' : 'Criminal'}</Badge>
        </div>
        <p className="text-xs text-gray-400 mb-3">{path.description}</p>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Skill Requirements</p>
          <div className="flex flex-wrap gap-1.5">
            {path.skillRequirements.map(r => (
              <span key={r.skill} className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${r.met ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-red-500/40 text-red-300 bg-red-900/20'}`}>
                {r.met ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {r.skill} L{r.level}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Entry-Level Role</p>
          <p className="text-xs text-gray-300">{path.entryDescription}</p>
          <p className="text-[11px] text-cyan-300 mt-1">Starts as: {path.progression[0]}</p>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-1"><DollarSign className="w-3 h-3" /> Payout Structure</p>
          <div className="p-2 rounded bg-slate-900/40 border border-purple-500/10 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-400">Base / cycle</span><span className={`font-bold ${path.payout.currency === 'crypto' ? 'text-purple-400' : 'text-green-400'}`}>{path.payout.currency === 'crypto' ? 'Ξ' : '$'}{path.payout.baseSalary.toLocaleString()}</span></div>
            {path.payout.bonus > 0 && <div className="flex justify-between"><span className="text-gray-400">Bonus</span><span className="text-yellow-400">+{path.payout.bonus.toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-gray-400">Pays into</span><span className="text-gray-300">{path.payout.currency === 'crypto' ? 'Crypto (dirty)' : 'Buy Power (clean)'}</span></div>
            <p className="text-[10px] text-gray-500 pt-1">{path.payout.note}</p>
          </div>
        </div>

        <div className="mt-auto">
          <Button size="sm" className={`w-full ${lawful ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-purple-600'}`} onClick={onEmbark} disabled={disabled || !path.eligible}>
            <Rocket className="w-4 h-4 mr-1" /> {path.eligible ? 'Embark on Career' : (path.blockReason || 'Locked')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}