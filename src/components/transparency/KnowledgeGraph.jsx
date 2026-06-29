import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Static knowledge graph: every object is connected.
const NODES = [
  { id: 'world', label: 'World', x: 50, y: 10, color: '#06B6D4' },
  { id: 'economy', label: 'Economy', x: 80, y: 28, color: '#9333EA' },
  { id: 'region', label: 'Region', x: 20, y: 28, color: '#22C55E' },
  { id: 'org', label: 'Organization', x: 50, y: 40, color: '#F59E0B' },
  { id: 'business', label: 'Business', x: 75, y: 55, color: '#EC4899' },
  { id: 'player', label: 'Player', x: 25, y: 55, color: '#3B82F6' },
  { id: 'employee', label: 'Employees', x: 50, y: 70, color: '#A78BFA' },
  { id: 'skill', label: 'Skills', x: 25, y: 85, color: '#F472B6' },
  { id: 'supplychain', label: 'Supply Chain', x: 80, y: 75, color: '#14B8A6' },
  { id: 'transport', label: 'Transportation', x: 60, y: 88, color: '#FB923C' },
  { id: 'infrastructure', label: 'Infrastructure', x: 90, y: 92, color: '#EAB308' },
];

const EDGES = [
  ['world', 'economy'], ['world', 'region'], ['economy', 'region'],
  ['economy', 'org'], ['org', 'business'], ['org', 'employee'],
  ['business', 'employee'], ['employee', 'skill'], ['business', 'supplychain'],
  ['supplychain', 'transport'], ['transport', 'infrastructure'], ['region', 'infrastructure'],
  ['player', 'org'], ['player', 'employee'],
];

export default function KnowledgeGraph() {
  const [hover, setHover] = useState(null);

  const activeEdges = hover ? EDGES.filter((e) => e.includes(hover)) : EDGES;
  let activeNodes = null;
  if (hover) {
    const connected = [];
    EDGES.forEach((e) => { if (e.includes(hover)) { connected.push(e[0]); connected.push(e[1]); } });
    activeNodes = new Set(connected);
  }

  return (
    <Card className="glass-panel border border-gray-700">
      <CardHeader className="border-b border-gray-700">
        <CardTitle className="text-white text-sm">Knowledge Graph</CardTitle>
        <p className="text-xs text-gray-400">Every object is connected. Hover a node to trace relationships — this enables the platform to explain the downstream impact of any decision.</p>
      </CardHeader>
      <CardContent className="p-4">
        <svg viewBox="0 0 100 100" className="w-full h-[420px]">
          {EDGES.map((edge, i) => {
            const a = edge[0], b = edge[1];
            const na = NODES.find((n) => n.id === a), nb = NODES.find((n) => n.id === b);
            const active = !hover || activeEdges.indexOf(edge) !== -1;
            return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={active ? '#9333EA' : '#1e293b'} strokeWidth={active ? 0.6 : 0.3} opacity={active ? 0.8 : 0.4} />;
          })}
          {NODES.map((n) => {
            const dim = hover && !activeNodes.has(n.id);
            return (
              <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
                <circle cx={n.x} cy={n.y} r={hover === n.id ? 4.5 : 3.5} fill={n.color} opacity={dim ? 0.25 : 1} stroke="#0f172a" strokeWidth={0.5} />
                <text x={n.x} y={n.y - 5} textAnchor="middle" fill="#e2e8f0" fontSize="3" opacity={dim ? 0.3 : 1} className="font-medium">{n.label}</text>
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="mt-2 p-3 rounded-lg bg-slate-900/60 border border-gray-700 text-xs">
            <span className="text-white font-semibold capitalize">{hover}</span>
            <span className="text-gray-400"> connects to: </span>
            {EDGES.filter((e) => e.includes(hover)).map((e) => e.find((x) => x !== hover)).map((c, i) => {
              const matches = EDGES.filter((e) => e.includes(hover));
              return <span key={i} className="text-purple-300 capitalize">{c}{i < matches.length - 1 ? ', ' : ''}</span>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}