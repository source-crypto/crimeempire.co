import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PvPArena from "../components/combat/PvPArena";
import EconomyMap from "../components/economy/EconomyMap";
import { Sword, Map, Trophy } from "lucide-react";

export default function CombatPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: playerData } = useQuery({
    queryKey: ['player', user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ created_by: user.email });
      return players[0];
    },
    enabled: !!user
  });

  if (!playerData) {
    return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Combat & Economy</h1>
          <p className="text-slate-400">Engage in PvP battles and monitor the criminal economy</p>
        </div>
        <Button
          onClick={async () => {
            const zone = await base44.entities.EconomyZone.create({
              name: `Zone ${Date.now()}`,
              zone_type: 'black_market',
              coordinates: { lat: 40.7 + Math.random() * 0.1, lng: -73.9 + Math.random() * 0.1 },
              economic_activity: Math.floor(Math.random() * 50) + 50,
              average_prices: { weapons: 10000, vehicles: 50000, materials: 500, contraband: 8000 },
              trade_volume: Math.floor(Math.random() * 300000) + 100000,
              crime_rate: Math.floor(Math.random() * 50) + 40,
              law_enforcement_presence: Math.floor(Math.random() * 40) + 20
            });
          }}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Map className="w-4 h-4 mr-2" />
          Create Economy Zone
        </Button>
      </div>

      <Tabs defaultValue="pvp" className="space-y-4">
        <TabsList className="glass-panel border border-slate-700">
          <TabsTrigger value="pvp">
            <Sword className="w-4 h-4 mr-2" />
            PvP Arena
          </TabsTrigger>
          <TabsTrigger value="economy">
            <Map className="w-4 h-4 mr-2" />
            Economy Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pvp">
          <PvPArena playerData={playerData} />
        </TabsContent>

        <TabsContent value="economy">
          <EconomyMap playerData={playerData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}