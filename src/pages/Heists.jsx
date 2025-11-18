import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Clock, DollarSign, Users, Zap, ArrowLeft } from 'lucide-react';
import HeistScout from '../components/heist/HeistScout';
import HeistPlanner from '../components/heist/HeistPlanner';
import HeistExecution from '../components/heist/HeistExecution';
import { format } from 'date-fns';

export default function Heists() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [planningMode, setPlanningMode] = useState(false);
  const [executingHeist, setExecutingHeist] = useState(null);
  const [heistAnalysis, setHeistAnalysis] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', currentUser?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: currentUser.email });
      return players[0] || null;
    },
    enabled: !!currentUser,
  });

  const { data: heists = [] } = useQuery({
    queryKey: ['heists', playerData?.crew_id],
    queryFn: () => base44.entities.Heist.filter({ crew_id: playerData.crew_id }, '-created_date', 20),
    enabled: !!playerData?.crew_id,
  });

  const handleSelectTarget = (target) => {
    setSelectedTarget(target);
    setPlanningMode(true);
  };

  const handleBack = () => {
    setSelectedTarget(null);
    setPlanningMode(false);
    setExecutingHeist(null);
    setHeistAnalysis(null);
  };

  const handleExecuteHeist = (heist) => {
    setExecutingHeist(heist);
    setPlanningMode(false);
  };

  const handleHeistComplete = (analysis) => {
    setHeistAnalysis(analysis);
    setExecutingHeist(null);
  };

  if (!playerData) {
    return (
      <div className="text-center py-12">
        <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
      </div>
    );
  }

  if (executingHeist) {
    return (
      <div className="space-y-6">
        <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                <Zap className="inline w-8 h-8 mr-2 text-red-400" />
                {executingHeist.heist_name}
              </h1>
              <p className="text-gray-400">AI-driven heist execution in progress</p>
            </div>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Heists
            </Button>
          </div>
        </div>
        <HeistExecution heist={executingHeist} onComplete={handleHeistComplete} />
      </div>
    );
  }

  if (heistAnalysis) {
    return (
      <div className="space-y-6">
        <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Heist Complete!</h1>
              <p className="text-gray-400">AI Performance Analysis</p>
            </div>
            <Button onClick={handleBack} className="bg-gradient-to-r from-purple-600 to-cyan-600">
              Back to Heists
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="text-white">Performance Rating</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <div className="text-6xl font-bold text-purple-400 mb-2">
                {heistAnalysis.performance_rating}/10
              </div>
              <p className="text-gray-400">Overall Performance</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-green-500/20">
            <CardHeader className="border-b border-green-500/20">
              <CardTitle className="text-white">What Went Well</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {heistAnalysis.what_went_well?.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-300">✓ {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-panel border-red-500/20">
            <CardHeader className="border-b border-red-500/20">
              <CardTitle className="text-white">What Went Wrong</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {heistAnalysis.what_went_wrong?.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-300">→ {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-panel border-cyan-500/20">
            <CardHeader className="border-b border-cyan-500/20">
              <CardTitle className="text-white">Future Tips</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {heistAnalysis.future_tips?.map((tip, idx) => (
                  <li key={idx} className="text-sm text-gray-300">💡 {tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="border-b border-purple-500/20">
            <CardTitle className="text-white">Skill Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {heistAnalysis.skill_recommendations?.map((rec, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10">
                  <p className="text-sm text-gray-300">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (planningMode && selectedTarget) {
    return (
      <HeistPlanner
        selectedTarget={selectedTarget}
        playerData={playerData}
        crewId={playerData.crew_id}
        onBack={handleBack}
      />
    );
  }

  const statusColors = {
    planning: 'bg-yellow-600',
    in_progress: 'bg-blue-600',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
    busted: 'bg-red-600'
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Heist Planning</h1>
        <p className="text-gray-400">Use AI to scout targets and plan the perfect heist</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scout Targets */}
        <div className="lg:col-span-2">
          <HeistScout playerData={playerData} onSelectTarget={handleSelectTarget} />
        </div>

        {/* Recent Heists */}
        <div>
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-purple-400" />
                Recent Heists
                <Badge className="ml-auto bg-purple-600">{heists.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {heists.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No heists yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heists.map((heist) => (
                    <div
                      key={heist.id}
                      className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10 hover:border-purple-500/30 transition-all cursor-pointer"
                      onClick={() => {
                        if (heist.status === 'planning') {
                          setExecutingHeist(heist);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white text-sm">
                            {heist.heist_name}
                          </h4>
                          <p className="text-xs text-gray-400">
                            {format(new Date(heist.created_date), 'MMM d, HH:mm')}
                          </p>
                        </div>
                        <Badge className={statusColors[heist.status]}>
                          {heist.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="flex items-center gap-1 text-gray-400">
                          <DollarSign className="w-3 h-3" />
                          <span>${(heist.estimated_payout || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Users className="w-3 h-3" />
                          <span>{heist.participants?.length || 0} crew</span>
                        </div>
                      </div>
                      
                      {heist.status === 'planning' && (
                        <Button size="sm" className="w-full bg-gradient-to-r from-red-600 to-orange-600">
                          <Zap className="w-3 h-3 mr-1" />
                          Execute
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}