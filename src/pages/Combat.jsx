import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
      <div>
        <h1 className="text-3xl font-bold text-white">Combat & Economy</h1>
        <p className="text-slate-400">Engage in PvP battles and monitor the criminal economy</p>
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