import React from 'react';
import { Flame } from 'lucide-react';

export default function CrimeHeatLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] glass-panel border border-red-500/30 rounded-lg p-2 text-xs pointer-events-none max-w-[180px]">
      <p className="text-gray-300 font-semibold mb-1 flex items-center gap-1"><Flame className="w-3 h-3 text-red-400" /> Crime Intensity</p>
      <div className="flex items-center gap-0.5">
        <span className="w-6 h-3 rounded-l bg-yellow-400" />
        <span className="w-6 h-3 bg-orange-500" />
        <span className="w-6 h-3 rounded-r bg-red-500" />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>Low</span><span>High</span></div>
      <p className="text-[10px] text-gray-500 mt-1">🔥 Hotspot = intensity above 70</p>
    </div>
  );
}