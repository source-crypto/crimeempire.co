import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Layers, MapPin, Package, Shield, Target, 
  Truck, Users, Car, ChevronDown 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MapControls({ layers, onToggleLayer }) {
  const layerOptions = [
    { key: 'territories', icon: MapPin, label: 'Territories' },
    { key: 'smugglingRoutes', icon: Truck, label: 'Smuggling Routes' },
    { key: 'supplyLines', icon: Truck, label: 'Supply Lines' },
    { key: 'contraband', icon: Package, label: 'Contraband' },
    { key: 'materials', icon: Target, label: 'Materials' },
    { key: 'lawEnforcement', icon: Shield, label: 'Law Enforcement' },
    { key: 'players', icon: Users, label: 'Players' },
    { key: 'vehicles', icon: Car, label: 'Vehicles' }
  ];

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="glass-panel border-purple-500/30">
          <Layers className="w-4 h-4 mr-2" />
          Map Layers ({activeCount})
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 glass-panel border-purple-500/30">
        {layerOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuCheckboxItem
              key={option.key}
              checked={layers[option.key]}
              onCheckedChange={() => onToggleLayer(option.key)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}