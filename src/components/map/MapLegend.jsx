import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Shield, Target, Truck, Users, Car } from 'lucide-react';

export default function MapLegend({ layers }) {
  const legendItems = [
    { 
      key: 'territories', 
      icon: MapPin, 
      label: 'Territories', 
      color: 'bg-purple-500',
      description: 'Controlled zones with resources'
    },
    { 
      key: 'smugglingRoutes', 
      icon: Truck, 
      label: 'Smuggling Routes', 
      color: 'bg-orange-500',
      description: 'High-risk transport paths'
    },
    { 
      key: 'supplyLines', 
      icon: Truck, 
      label: 'Supply Lines', 
      color: 'bg-green-500',
      description: 'Resource transport routes'
    },
    { 
      key: 'contraband', 
      icon: Package, 
      label: 'Contraband Caches', 
      color: 'bg-yellow-500',
      description: 'Claimable illegal goods'
    },
    { 
      key: 'materials', 
      icon: Target, 
      label: 'Material Deposits', 
      color: 'bg-green-500',
      description: 'Extractable resources'
    },
    { 
      key: 'lawEnforcement', 
      icon: Shield, 
      label: 'Law Enforcement', 
      color: 'bg-red-500',
      description: 'Police patrol zones'
    },
    { 
      key: 'players', 
      icon: Users, 
      label: 'Players', 
      color: 'bg-blue-500',
      description: 'Online criminals'
    },
    { 
      key: 'vehicles', 
      icon: Car, 
      label: 'Vehicles', 
      color: 'bg-purple-500',
      description: 'Available vehicles'
    }
  ];

  return (
    <Card className="glass-panel border-purple-500/30">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white text-sm">Map Legend</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {legendItems.map((item) => {
            const Icon = item.icon;
            const isActive = layers[item.key];
            
            return (
              <div
                key={item.key}
                className={`flex items-start gap-2 p-2 rounded-lg transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div className={`${item.color} rounded-full p-1.5 mt-0.5`}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}