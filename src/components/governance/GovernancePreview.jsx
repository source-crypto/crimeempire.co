import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Building, Shield, Lock, Star } from 'lucide-react';

export default function GovernancePreview() {
  const features = [
    {
      icon: Crown,
      title: 'President of the Underworld',
      description: 'Rise to become the supreme ruler controlling multiple factions and territories',
      benefits: [
        'Control city-wide policies',
        'Tax territories under your rule',
        'Command multiple syndicates',
        'Shape the criminal economy'
      ],
      requirements: {
        power: 10000,
        territories: 10,
        reputation: 5000
      },
      color: 'yellow'
    },
    {
      icon: Building,
      title: 'Territory Mayor',
      description: 'Govern individual territories with local authority and taxation powers',
      benefits: [
        'Set local tax rates',
        'Manage territory development',
        'Control law enforcement presence',
        'Allocate resources efficiently'
      ],
      requirements: {
        power: 2000,
        territories: 3,
        reputation: 1000
      },
      color: 'cyan'
    },
    {
      icon: Shield,
      title: 'Policy & Legislation',
      description: 'Enact laws that shape gameplay mechanics across your domain',
      benefits: [
        'Trade regulation policies',
        'Crime enforcement levels',
        'Enterprise taxation',
        'Territory development bonuses'
      ],
      requirements: {
        position: 'Mayor or President'
      },
      color: 'purple'
    }
  ];

  const policies = [
    {
      name: 'Low Enforcement Zone',
      effect: '-30% Heat, +20% Crime Rate',
      cost: '$25,000/week'
    },
    {
      name: 'Trade Protectionism',
      effect: '+15% Market Prices, -10% Imports',
      cost: '$15,000/week'
    },
    {
      name: 'Enterprise Subsidy',
      effect: '+25% Production, -20% Costs',
      cost: '$50,000/week'
    },
    {
      name: 'Fortification Act',
      effect: '+40% Territory Defense',
      cost: '$30,000/week'
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-yellow-500/30 bg-gradient-to-br from-yellow-900/10 to-purple-900/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Governance System Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-300 leading-relaxed">
            Unlock powerful governance roles to expand your influence beyond individual operations. 
            As President or Mayor, shape entire territories through policy, taxation, and strategic control.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              const colorClasses = {
                yellow: 'border-yellow-500/40 bg-yellow-900/10',
                cyan: 'border-cyan-500/40 bg-cyan-900/10',
                purple: 'border-purple-500/40 bg-purple-900/10'
              };

              return (
                <Card key={idx} className={`glass-panel ${colorClasses[feature.color]}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                      <Icon className={`w-5 h-5 text-${feature.color}-400`} />
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-300">{feature.description}</p>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-2">Benefits:</p>
                      <ul className="space-y-1">
                        {feature.benefits.map((benefit, bidx) => (
                          <li key={bidx} className="text-xs text-gray-300 flex items-start gap-2">
                            <span className={`text-${feature.color}-400 mt-1`}>•</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {feature.requirements && (
                      <div className="pt-3 border-t border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 mb-2">Requirements:</p>
                        <div className="space-y-1 text-xs text-gray-400">
                          {feature.requirements.power && (
                            <div>Power: {feature.requirements.power.toLocaleString()}</div>
                          )}
                          {feature.requirements.territories && (
                            <div>Territories: {feature.requirements.territories}</div>
                          )}
                          {feature.requirements.reputation && (
                            <div>Reputation: {feature.requirements.reputation.toLocaleString()}</div>
                          )}
                          {feature.requirements.position && (
                            <div>{feature.requirements.position}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="glass-panel border-purple-500/30">
            <CardHeader className="border-b border-purple-500/20">
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Policy Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-300 mb-4">
                As a governor, you can enact policies that directly impact gameplay mechanics
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {policies.map((policy, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white text-sm">{policy.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    </div>
                    <p className="text-xs text-cyan-400 mb-1">{policy.effect}</p>
                    <p className="text-xs text-gray-400">{policy.cost}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30">
            <h4 className="text-white font-semibold mb-2">How to Unlock</h4>
            <p className="text-sm text-gray-300">
              Build your power, control territories, and establish your crew's dominance. 
              Once you meet the requirements, governance positions will become available through elections or conquest.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}