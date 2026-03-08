import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';

export default function AILimitBanner() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-500/40 bg-yellow-900/20 text-sm">
      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
      <div>
        <span className="text-yellow-300 font-semibold">AI Credits Exhausted</span>
        <span className="text-yellow-200/70 ml-2">— AI generation is unavailable this month. Pre-built content is being used instead.</span>
      </div>
    </div>
  );
}

export function isAILimitError(error) {
  return error?.message?.includes('limit') || 
    error?.message?.includes('402') || 
    error?.message?.includes('upgrade') ||
    String(error).includes('integration_credits_limit_reached');
}