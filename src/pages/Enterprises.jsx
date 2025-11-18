import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, AlertTriangle, Plus, Settings } from 'lucide-react';
import EnterpriseUpgradePanel from '../components/enterprises/EnterpriseUpgradePanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Enterprises() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEnterprise, setSelectedEnterprise] = useState(null);

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

  const { data: enterprises = [], refetch: refetchEnterprises } = useQuery({
    queryKey: ['enterprises', playerData?.id],
    queryFn: () => base44.entities.CriminalEnterprise.filter({ owner_id: playerData.id }),
    enabled: !!playerData?.id,
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel border border-purple-500/20 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Criminal Enterprises</h1>
            <p className="text-gray-400">Manage your illegal businesses</p>
          </div>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            New Enterprise
          </Button>
        </div>
      </div>

      {enterprises.length === 0 ? (
        <Card className="glass-panel border-purple-500/20">
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold text-white mb-2">No Enterprises</h3>
            <p className="text-gray-400">Start your criminal empire by establishing your first operation</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {enterprises.map((enterprise) => (
              <Card 
                key={enterprise.id} 
                className="glass-panel border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
                onClick={() => setSelectedEnterprise(enterprise)}
              >
                <CardHeader className="border-b border-purple-500/20">
                  <CardTitle className="text-white flex items-center justify-between">
                    {enterprise.name}
                    <Badge className={enterprise.is_active ? 'bg-green-600' : 'bg-red-600'}>
                      {enterprise.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white capitalize">{enterprise.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Level</span>
                    <span className="text-purple-400 font-semibold">Level {enterprise.level}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Production</span>
                    <span className="text-cyan-400">{enterprise.production_rate}/hr</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className={`w-4 h-4 ${enterprise.heat_level > 50 ? 'text-red-400' : 'text-yellow-400'}`} />
                    <span className="text-gray-400">Heat: {enterprise.heat_level}%</span>
                  </div>
                  <div className="pt-2 border-t border-purple-500/20">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Total Revenue</span>
                      <span className="text-green-400 font-semibold">
                        ${(enterprise.total_revenue || 0).toLocaleString()}
                      </span>
                    </div>
                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedEnterprise && playerData && (
            <div className="lg:col-span-1">
              <EnterpriseUpgradePanel
                enterprise={selectedEnterprise}
                playerData={playerData}
                onUpdate={refetchEnterprises}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}