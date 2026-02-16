import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import AIStoryGenerator from '../components/narrative/AIStoryGenerator';
import StoryArcDisplay from '../components/narrative/StoryArcDisplay';

export default function StoryArcs() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="glass-panel border-purple-500/20 p-6">
          <p className="text-white">Loading your story...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-purple-500/30 bg-gradient-to-r from-slate-900/50 via-purple-900/20 to-slate-900/50 p-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-3xl font-bold text-purple-400">Personal Story Arcs</h1>
            <p className="text-gray-400">AI-generated narratives tailored to your journey</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AIStoryGenerator playerData={playerData} />
        </div>
        <div className="lg:col-span-2">
          <StoryArcDisplay playerData={playerData} />
        </div>
      </div>
    </div>
  );
}