import React, { useState, useEffect } from 'react';
import { Star, Shield } from 'lucide-react';

function getWantedLevel() {
  try { return JSON.parse(localStorage.getItem('wanted_state') || '{}').level || 0; } catch { return 0; }
}

const LEVEL_STYLES = {
  0: 'text-green-400  bg-green-900/20  border-green-500/30',
  1: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  2: 'text-orange-400 bg-orange-900/20 border-orange-500/30',
  3: 'text-red-400    bg-red-900/20    border-red-500/40',
  4: 'text-red-500    bg-red-900/30    border-red-600/60',
  5: 'text-red-600    bg-red-950/50    border-red-700/80',
};

const LEVEL_LABELS = ['Clean', 'Known', 'Hunted', 'Notorious', 'Most Wanted', '⚠️ KINGPIN'];

export default function WantedHUD({ compact = false }) {
  const [level, setLevel] = useState(getWantedLevel);

  useEffect(() => {
    const interval = setInterval(() => {
      setLevel(getWantedLevel());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const style = LEVEL_STYLES[level] || LEVEL_STYLES[0];

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${style}`}>
        <Shield className="w-3.5 h-3.5" />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={`w-3 h-3 ${i <= level ? 'fill-current' : 'opacity-20'}`} />
          ))}
        </div>
        {level > 0 && <span className="hidden sm:inline ml-1">{LEVEL_LABELS[level]}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${style}`}>
      <Shield className="w-4 h-4" />
      <div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className={`w-3.5 h-3.5 ${i <= level ? 'fill-current drop-shadow-[0_0_4px_currentColor]' : 'opacity-20'}`} />
          ))}
        </div>
        <p className="text-[10px] font-semibold leading-none mt-0.5">{LEVEL_LABELS[level]}</p>
      </div>
      {level >= 3 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
    </div>
  );
}