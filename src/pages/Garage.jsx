import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Zap, Gauge } from 'lucide-react';

export default function Garage() {
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
    enabled: !!currentUser,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', playerData?.id],
    queryFn: () => base44.entities.Vehicle.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Garage</h1>
        <p className="text-gray-400">Manage your vehicle collection</p>
      </div>

      {vehicles.length === 0 ? (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-12 text-center">
            <Car className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-white mb-2">No Vehicles</h3>
            <p className="text-gray-400">You don't own any vehicles yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="glass-panel border-purple-500/20">
              <CardHeader className="border-b border-purple-500/20">
                <CardTitle className="text-white flex items-center justify-between">
                  {vehicle.name}
                  <Badge className="capitalize">{vehicle.type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Horsepower</span>
                    <span className="text-white font-semibold">{vehicle.horsepower} HP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Top Speed</span>
                    <span className="text-white font-semibold">{vehicle.top_speed} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Condition</span>
                    <span className="text-green-400 font-semibold">{vehicle.durability}%</span>
                  </div>
                  {vehicle.is_stolen && (
                    <Badge className="w-full justify-center bg-red-600">Stolen</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}