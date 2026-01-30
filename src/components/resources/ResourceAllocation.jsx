import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Shield, Activity, AlertTriangle } from "lucide-react";

export default function ResourceAllocation({ resources, tasks, investigations }) {
  // Calculate department distribution
  const getDepartmentStats = () => {
    const stats = {};
    resources.forEach(r => {
      if (!stats[r.department]) {
        stats[r.department] = { total: 0, available: 0, on_duty: 0, assigned: 0 };
      }
      stats[r.department].total++;
      if (r.status === 'available') stats[r.department].available++;
      if (r.status === 'on_duty') stats[r.department].on_duty++;
      if (r.status === 'assigned') stats[r.department].assigned++;
    });
    return stats;
  };

  // Calculate workload
  const getWorkloadStats = () => {
    const overloaded = resources.filter(r => (r.active_cases || 0) > 4).length;
    const optimal = resources.filter(r => {
      const cases = r.active_cases || 0;
      return cases >= 2 && cases <= 4;
    }).length;
    const underutilized = resources.filter(r => (r.active_cases || 0) < 2).length;

    return { overloaded, optimal, underutilized };
  };

  const departmentStats = getDepartmentStats();
  const workloadStats = getWorkloadStats();
  const totalResources = resources.length;
  const availableResources = resources.filter(r => r.status === 'available').length;
  const utilizationRate = totalResources > 0 
    ? Math.round(((totalResources - availableResources) / totalResources) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Resource Allocation Overview</h3>
        
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-medium">Total Personnel</p>
                  <p className="text-3xl font-bold text-blue-900">{totalResources}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-900" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-800 font-medium">Available</p>
                  <p className="text-3xl font-bold text-emerald-900">{availableResources}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-900" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-800 font-medium">Utilization Rate</p>
                  <p className="text-3xl font-bold text-amber-900">{utilizationRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-amber-900" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Breakdown */}
        <Card className="bg-white border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(departmentStats).map(([dept, stats]) => (
              <div key={dept} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-900 capitalize">
                    {dept.replace('_', ' ')}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {stats.total} total
                    </Badge>
                    <Badge className="bg-emerald-500 text-white text-xs">
                      {stats.available} available
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={(stats.available / stats.total) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workload Analysis */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Overloaded (5+ cases)</span>
              </div>
              <span className="text-lg font-bold text-red-900">{workloadStats.overloaded}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">Optimal (2-4 cases)</span>
              </div>
              <span className="text-lg font-bold text-emerald-900">{workloadStats.optimal}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Underutilized (&lt;2 cases)</span>
              </div>
              <span className="text-lg font-bold text-blue-900">{workloadStats.underutilized}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}