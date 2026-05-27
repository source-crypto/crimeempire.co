import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Zap, Shield, DollarSign, AlertTriangle, CheckCircle,
  XCircle, Loader2, BarChart3, Users, Wrench
} from 'lucide-react';
import { toast } from 'sonner';

const EQUIPMENT_CATALOG = [
  { id: 'lockpick_kit',     name: 'Lockpick Kit',        cost: 5000,  icon: '🔓', bonus: { stealth: 10, speed: 5 },   description: '+10 Stealth, +5 Speed' },
  { id: 'emp_device',       name: 'EMP Device',          cost: 15000, icon: '⚡', bonus: { hack: 20, stealth: 5 },     description: '+20 Hack, disable alarms' },
  { id: 'body_armor',       name: 'Body Armor (x4)',      cost: 12000, icon: '🛡️', bonus: { defense: 25 },              description: '+25 Defense, reduce casualties' },
  { id: 'getaway_driver',   name: 'Pro Getaway Driver',  cost: 20000, icon: '🏎️', bonus: { escape: 30, speed: 15 },    description: '+30 Escape, +15 Speed' },
  { id: 'hacking_rig',      name: 'Hacking Rig',         cost: 18000, icon: '💻', bonus: { hack: 30, stealth: 10 },    description: '+30 Hack, bypass systems' },
  { id: 'silenced_weapons', name: 'Silenced Weapons',    cost: 10000, icon: '🔫', bonus: { stealth: 20, defense: 5 },  description: '+20 Stealth, silent takedowns' },
  { id: 'decoy_van',        name: 'Decoy Van',           cost: 8000,  icon: '🚐', bonus: { escape: 20, stealth: 15 },  description: '+20 Escape, confuse pursuit' },
  { id: 'thermal_scanner',  name: 'Thermal Scanner',     cost: 6000,  icon: '🌡️', bonus: { intel: 25 },                description: '+25 Intel, see guard positions' },
];

export default function HeistSimulation({ target, selectedMembers, crewMembers, playerData, onSimulationDone }) {
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [simulation, setSimulation] = useState(null);

  const totalEquipmentCost = selectedEquipment.reduce((s, id) => {
    const eq = EQUIPMENT_CATALOG.find(e => e.id === id);
    return s + (eq?.cost || 0);
  }, 0);

  const toggleEquipment = (id) => {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const members = crewMembers.filter(m => selectedMembers.includes(m.id));
      const equipment = EQUIPMENT_CATALOG.filter(e => selectedEquipment.includes(e.id));

      const prompt = `You are simulating a heist for a crime game. Run a detailed probabilistic simulation.

TARGET: ${target.target_name} (${target.target_type})
DIFFICULTY: ${target.difficulty}
BASE PAYOUT: $${target.estimated_payout.toLocaleString()}
CHALLENGES: ${(target.challenges || []).join(', ')}

CREW (${members.length} members):
${members.map(m => `- ${m.username}: Level ${m.level || 1}, Strength ${m.strength_score || 10}, Role: ${m.crew_role || 'associate'}, Skills: ${JSON.stringify(m.skills || {})}`).join('\n')}

EQUIPMENT CHOSEN:
${equipment.length ? equipment.map(e => `- ${e.name}: ${e.description}`).join('\n') : 'None'}

SIMULATION REQUIREMENTS:
1. Calculate overall success probability (0-100) factoring crew skills + equipment + target difficulty
2. Identify the 3 most likely failure points
3. Generate phase-by-phase breakdown (infiltration, execution, extraction)
4. Estimate actual loot range (min/max based on outcome)
5. Calculate heat generated (wanted level impact)
6. Provide recommended role for each crew member based on their skills
7. Give an overall crew rating for this specific target

Return JSON only.`;

      return await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            success_probability: { type: 'number' },
            crew_rating: { type: 'string' },
            overall_assessment: { type: 'string' },
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phase: { type: 'string' },
                  success_chance: { type: 'number' },
                  key_risk: { type: 'string' },
                  assigned_members: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            failure_points: { type: 'array', items: { type: 'string' } },
            loot_min: { type: 'number' },
            loot_max: { type: 'number' },
            heat_generated: { type: 'number' },
            member_roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  recommended_role: { type: 'string' },
                  effectiveness: { type: 'number' }
                }
              }
            },
            tips: { type: 'array', items: { type: 'string' } }
          }
        }
      });
    },
    onSuccess: (data) => {
      setSimulation(data);
      toast.success('Simulation complete!');
    },
    onError: () => toast.error('Simulation failed'),
  });

  const canSimulate = selectedMembers.length >= (target.required_crew_size || 1);
  const hasEnoughBalance = playerData.crypto_balance >= totalEquipmentCost;

  return (
    <div className="space-y-4">
      {/* Equipment Selection */}
      <Card className="glass-panel border-yellow-500/20">
        <CardHeader className="border-b border-yellow-500/20">
          <CardTitle className="text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-yellow-400" />
            Equipment Selection
            {totalEquipmentCost > 0 && (
              <Badge className={hasEnoughBalance ? 'bg-green-700 ml-auto' : 'bg-red-700 ml-auto'}>
                ${totalEquipmentCost.toLocaleString()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EQUIPMENT_CATALOG.map(eq => {
              const selected = selectedEquipment.includes(eq.id);
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selected
                      ? 'bg-yellow-900/30 border-yellow-500/50'
                      : 'bg-slate-900/30 border-gray-700/30 hover:border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{eq.icon}</span>
                    <span className="text-white text-sm font-semibold">{eq.name}</span>
                    {selected && <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />}
                  </div>
                  <p className="text-xs text-gray-400">{eq.description}</p>
                  <p className="text-xs text-yellow-400 mt-1">${eq.cost.toLocaleString()}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Run Simulation */}
      <div className="text-center">
        <Button
          className="bg-gradient-to-r from-red-600 to-orange-600 px-8 py-3 text-base"
          onClick={() => simulateMutation.mutate()}
          disabled={simulateMutation.isPending || !canSimulate}
        >
          {simulateMutation.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Running Simulation...</>
          ) : (
            <><BarChart3 className="w-5 h-5 mr-2" />Run Heist Simulation</>
          )}
        </Button>
        {!canSimulate && (
          <p className="text-xs text-gray-400 mt-2">
            Need {target.required_crew_size} crew members (have {selectedMembers.length})
          </p>
        )}
      </div>

      {/* Simulation Results */}
      {simulation && (
        <div className="space-y-4">
          {/* Big success probability */}
          <Card className={`glass-panel border-2 ${
            simulation.success_probability >= 70 ? 'border-green-500/50' :
            simulation.success_probability >= 40 ? 'border-yellow-500/50' : 'border-red-500/50'
          }`}>
            <CardContent className="p-6 text-center">
              <div className={`text-6xl font-bold mb-2 ${
                simulation.success_probability >= 70 ? 'text-green-400' :
                simulation.success_probability >= 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {simulation.success_probability}%
              </div>
              <p className="text-gray-400 mb-1">Success Probability</p>
              <Badge className="bg-purple-700">{simulation.crew_rating}</Badge>
              <div className="relative h-3 mt-3 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    simulation.success_probability >= 70 ? 'bg-green-500' :
                    simulation.success_probability >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${simulation.success_probability}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loot + Heat */}
            <Card className="glass-panel border-green-500/20">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />Potential Loot
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Minimum</span>
                  <span className="text-green-400 font-bold">${simulation.loot_min?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Maximum</span>
                  <span className="text-green-400 font-bold">${simulation.loot_max?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-red-400" />Heat Generated
                  </span>
                  <span className="text-red-400 font-bold">+{simulation.heat_generated}</span>
                </div>
              </CardContent>
            </Card>

            {/* Failure Points */}
            <Card className="glass-panel border-red-500/20">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />Key Risks
                </h4>
                <ul className="space-y-1">
                  {simulation.failure_points?.map((fp, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                      <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                      {fp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Phase Breakdown */}
          {simulation.phases && (
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />Phase Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {simulation.phases.map((phase, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900/40 border border-purple-500/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-semibold">{phase.phase}</span>
                      <Badge className={phase.success_chance >= 70 ? 'bg-green-700' : phase.success_chance >= 50 ? 'bg-yellow-700' : 'bg-red-700'}>
                        {phase.success_chance}%
                      </Badge>
                    </div>
                    <div className="relative h-1.5 mb-1 rounded-full bg-gray-700 overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all" style={{ width: `${phase.success_chance}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">⚠ {phase.key_risk}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Member Roles */}
          {simulation.member_roles && (
            <Card className="glass-panel border-cyan-500/20">
              <CardHeader className="border-b border-cyan-500/20">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />Crew Role Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {simulation.member_roles.map((mr, i) => (
                    <div key={i} className="p-2 rounded-lg bg-slate-900/40 border border-cyan-500/10 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-semibold">{mr.username}</p>
                        <p className="text-xs text-cyan-400">{mr.recommended_role}</p>
                      </div>
                      <Badge className={mr.effectiveness >= 70 ? 'bg-green-700' : mr.effectiveness >= 40 ? 'bg-yellow-700' : 'bg-red-700'}>
                        {mr.effectiveness}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {simulation.tips?.length > 0 && (
            <Card className="glass-panel border-yellow-500/20">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-yellow-400" />Pro Tips
                </h4>
                <ul className="space-y-1">
                  {simulation.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-400">💡</span>{tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
            onClick={() => onSimulationDone(simulation, selectedEquipment)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Plan & Execute
          </Button>
        </div>
      )}
    </div>
  );
}