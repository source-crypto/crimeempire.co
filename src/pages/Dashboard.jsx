import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import TrendChart from "../components/charts/TrendChart";
import CrimeMap from "../components/maps/CrimeMap";
import ReportCard from "../components/reports/ReportCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";

export default function Dashboard() {
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['crimeReports'],
    queryFn: () => base44.entities.CrimeReport.list('-created_date', 100),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
  });

  const { data: investigations = [] } = useQuery({
    queryKey: ['investigations'],
    queryFn: () => base44.entities.Investigation.list(),
  });

  // Calculate stats
  const activeReports = reports.filter(r => r.status !== 'closed' && r.status !== 'resolved').length;
  const criticalReports = reports.filter(r => r.severity === 'critical').length;
  const availableResources = resources.filter(r => r.status === 'available').length;
  const activeInvestigations = investigations.filter(i => i.status === 'active').length;

  // Trend data - group reports by date
  const getTrendData = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = reports.filter(r => {
        const reportDate = new Date(r.created_date).toISOString().split('T')[0];
        return reportDate === dateStr;
      }).length;
      
      last7Days.push({
        name: date.toLocaleDateString('en', { weekday: 'short' }),
        value: count
      });
    }
    
    return last7Days;
  };

  // Category distribution
  const getCategoryData = () => {
    const categories = {};
    reports.forEach(r => {
      const cat = r.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    return Object.entries(categories).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value
    }));
  };

  const recentReports = reports.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Command Center</h1>
            <p className="text-slate-600">Real-time crime management overview</p>
          </div>
          <Link to={createPageUrl("Reports")}>
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              <AlertCircle className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Active Reports" 
            value={activeReports} 
            change={12}
            icon={AlertCircle}
            color="amber"
          />
          <StatCard 
            title="Critical Cases" 
            value={criticalReports}
            change={-8}
            icon={TrendingUp}
            color="red"
          />
          <StatCard 
            title="Available Units" 
            value={availableResources}
            icon={Users}
            color="emerald"
          />
          <StatCard 
            title="Active Investigations" 
            value={activeInvestigations}
            change={5}
            icon={Clock}
            color="blue"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart 
            data={getTrendData()}
            title="Crime Reports - Last 7 Days"
            type="area"
            dataKey="value"
          />
          <TrendChart 
            data={getCategoryData()}
            title="Reports by Category"
            type="bar"
            dataKey="value"
          />
        </div>

        {/* Map Section */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Crime Hotspot Map</h2>
          <CrimeMap reports={reports} height="500px" />
        </div>

        {/* Recent Reports */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Recent Reports</h2>
            <Link to={createPageUrl("Reports")}>
              <Button variant="outline" className="text-slate-700">
                View All
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentReports.map(report => (
              <ReportCard 
                key={report.id} 
                report={report}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}