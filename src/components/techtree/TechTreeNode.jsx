import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, Clock, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryColors = {
  infiltration: 'border-purple-500/50 bg-purple-900/20',
  transport:    'border-cyan-500/50 bg-cyan-900/20',
  legal:        'border-green-500/50 bg-green-900/20',
  combat:       'border-red-500/50 bg-red-900/20',
  intelligence: 'border-yellow-500/50 bg-yellow-900/20',
  economy:      'border-emerald-500/50 bg-emerald-900/20',
};

const categoryBadge = {
  infiltration: 'bg-purple-600',
  transport:    'bg-cyan-600',
  legal:        'bg-green-600',
  combat:       'bg-red-600',
  intelligence: 'bg-yellow-600',
  economy:      'bg-emerald-600',
};

export default function TechTreeNode({ node, onUpgrade, isPending }) {
  const isMaxed = node.level >= node.max_level;
  const isLocked = node.status === 'locked';
  const isAvailable = node.status === 'available' || node.status === 'unlocked';

  const statusIcon = isLocked ? (
    <Lock className="w-4 h-4 text-gray-500" />
  ) : isMaxed ? (
    <CheckCircle className="w-4 h-4 text-green-400" />
  ) : (
    <ChevronUp className="w-4 h-4 text-cyan-400" />
  );

  return (
    <div className={cn(
      'p-4 rounded-xl border transition-all',
      categoryColors[node.category],
      isLocked && 'opacity-50 grayscale',
      !isLocked && 'hover:scale-[1.02]'
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{node.icon}</span>
          <div>
            <h4 className="font-bold text-white text-sm">{node.node_name}</h4>
            <Badge className={cn('text-xs', categoryBadge[node.category])}>
              {node.category}
            </Badge>
          </div>
        </div>
        {statusIcon}
      </div>

      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{node.description}</p>

      {/* Level Pips */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: node.max_level }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full',
              i < node.level ? categoryBadge[node.category].replace('bg-', 'bg-') : 'bg-gray-700'
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
        <span>Level {node.level} / {node.max_level}</span>
        <span className="text-cyan-400 font-semibold">
          {isMaxed ? 'MAXED' : `$${(node.cost_per_level * node.level).toLocaleString()}`}
        </span>
      </div>

      {!isLocked && !isMaxed && (
        <Button
          size="sm"
          className={cn('w-full text-xs', categoryBadge[node.category])}
          onClick={() => onUpgrade(node)}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ChevronUp className="w-3 h-3 mr-1" />}
          Upgrade — ${(node.cost_per_level * node.level).toLocaleString()}
        </Button>
      )}

      {isLocked && (
        <div className="text-xs text-gray-500 text-center">
          Requires: {node.prerequisites?.join(', ')}
        </div>
      )}
    </div>
  );
}