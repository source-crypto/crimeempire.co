import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Shield } from "lucide-react";

export default function EconomyMap({ playerData }) {
  const [selectedZone, setSelectedZone] = useState(null);

  const { data: economyZones = [] } = useQuery({
    queryKey: ['economyZones'],
    queryFn: async () => {
      let zones = await base44.entities.EconomyZone.list('-economic_activity', 20);
      
      // Create initial zones if none exist
      if (zones.length === 0) {
        const defaultZones = [
          {
            name: "Financial District",
            zone_type: "financial_district",
            coordinates: { lat: 40.7589, lng: -73.9851 },
            economic_activity: 95,
            average_prices: { weapons: 15000, vehicles: 80000, materials: 500, contraband: 10000 },
            trade_volume: 500000,
            crime_rate: 30,
            law_enforcement_presence: 80
          },
          {
            name: "Industrial Quarter",
            zone_type: "industrial",
            coordinates: { lat: 40.7128, lng: -74.0060 },
            economic_activity: 75,
            average_prices: { weapons: 8000, vehicles: 40000, materials: 200, contraband: 5000 },
            trade_volume: 250000,
            crime_rate: 60,
            law_enforcement_presence: 40
          },
          {
            name: "Black Market Alley",
            zone_type: "black_market",
            coordinates: { lat: 40.7489, lng: -73.9680 },
            economic_activity: 85,
            average_prices: { weapons: 12000, vehicles: 60000, materials: 800, contraband: 15000 },
            trade_volume: 400000,
            crime_rate: 90,
            law_enforcement_presence: 20
          },
          {
            name: "Luxury Heights",
            zone_type: "luxury",
            coordinates: { lat: 40.7614, lng: -73.9776 },
            economic_activity: 70,
            average_prices: { weapons: 20000, vehicles: 150000, materials: 1000, contraband: 25000 },
            trade_volume: 300000,
            crime_rate: 20,
            law_enforcement_presence: 90
          },
          {
            name: "Downtown Core",
            zone_type: "residential",
            coordinates: { lat: 40.7306, lng: -73.9352 },
            economic_activity: 60,
            average_prices: { weapons: 10000, vehicles: 50000, materials: 400, contraband: 8000 },
            trade_volume: 150000,
            crime_rate: 50,
            law_enforcement_presence: 60
          }
        ];

        await base44.entities.EconomyZone.bulkCreate(defaultZones);
        zones = await base44.entities.EconomyZone.list();
      }

      return zones;
    },
    refetchInterval: 30000
  });

  const { data: marketData = [] } = useQuery({
    queryKey: ['marketData'],
    queryFn: () => base44.entities.MarketData.list('-analysis_timestamp', 10),
  });

  const getZoneColor = (zoneType) => {
    const colors = {
      financial_district: 'bg-blue-500',
      industrial: 'bg-orange-500',
      black_market: 'bg-purple-500',
      luxury: 'bg-yellow-500',
      residential: 'bg-green-500'
    };
    return colors[zoneType] || 'bg-slate-500';
  };

  const getTrendIcon = (activity) => {
    return activity > 70 ? TrendingUp : TrendingDown;
  };

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Economy Map - Active Trading Zones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {economyZones.map((zone) => {
              const TrendIcon = getTrendIcon(zone.economic_activity);
              const isSelected = selectedZone?.id === zone.id;

              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(isSelected ? null : zone)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-900/30 border-cyan-500'
                      : 'bg-slate-900/30 border-slate-700 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{zone.name}</h3>
                      <p className="text-xs text-slate-400 capitalize">{zone.zone_type.replace(/_/g, ' ')}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getZoneColor(zone.zone_type)}`} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <TrendIcon className="w-4 h-4" />
                        Activity
                      </span>
                      <span className="text-white font-semibold">{zone.economic_activity}%</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Volume
                      </span>
                      <span className="text-green-400">${(zone.trade_volume / 1000).toFixed(0)}K</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Crime
                      </span>
                      <Badge className={
                        zone.crime_rate > 70 ? 'bg-red-600' :
                        zone.crime_rate > 40 ? 'bg-yellow-600' : 'bg-green-600'
                      }>
                        {zone.crime_rate}%
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        Law Enforcement
                      </span>
                      <span className="text-blue-400">{zone.law_enforcement_presence}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedZone && (
        <Card className="glass-panel border-cyan-500/50">
          <CardHeader>
            <CardTitle className="text-white">{selectedZone.name} - Market Prices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(selectedZone.average_prices || {}).map(([item, price]) => (
                <div key={item} className="p-3 rounded-lg bg-slate-900/50 text-center">
                  <p className="text-xs text-slate-400 capitalize mb-1">{item}</p>
                  <p className="text-lg font-bold text-green-400">${price.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {selectedZone.controlling_syndicate_id && (
              <div className="mt-4 p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                <p className="text-sm text-slate-400">Controlled by syndicate</p>
                <p className="text-white font-semibold">ID: {selectedZone.controlling_syndicate_id}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Market Trends */}
      <Card className="glass-panel border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Live Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {marketData.slice(0, 5).map((market) => (
              <div key={market.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30">
                <div>
                  <p className="text-white font-semibold">{market.item_name}</p>
                  <p className="text-xs text-slate-400">{market.item_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">${market.current_price.toLocaleString()}</p>
                  <Badge className={
                    market.trend === 'rising' ? 'bg-green-600' :
                    market.trend === 'falling' ? 'bg-red-600' : 'bg-slate-600'
                  }>
                    {market.trend}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}