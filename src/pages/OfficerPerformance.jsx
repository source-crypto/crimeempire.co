import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, FolderOpen, CheckCircle2, Clock, MapPin, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function OfficerPerformance() {
    const { data: cases = [], isLoading } = useQuery({
        queryKey: ['all-cases'],
        queryFn: () => base44.entities.Case.list(),
    });

    const calculateOfficerStats = () => {
        const stats = {};

        cases.forEach(c => {
            if (!c.assigned_officer) return;

            if (!stats[c.assigned_officer]) {
                stats[c.assigned_officer] = {
                    totalCases: 0,
                    solved: 0,
                    investigating: 0,
                    open: 0,
                    closed: 0,
                    avgResolutionDays: 0,
                    resolvedCases: [],
                    locations: []
                };
            }

            stats[c.assigned_officer].totalCases++;

            if (c.status === 'solved') stats[c.assigned_officer].solved++;
            else if (c.status === 'investigating') stats[c.assigned_officer].investigating++;
            else if (c.status === 'open') stats[c.assigned_officer].open++;
            else if (c.status === 'closed') stats[c.assigned_officer].closed++;

            if (c.location) {
                stats[c.assigned_officer].locations.push(c.location);
            }

            if ((c.status === 'solved' || c.status === 'closed') && c.date_opened && c.date_closed) {
                const opened = new Date(c.date_opened);
                const closed = new Date(c.date_closed);
                const days = Math.ceil((closed - opened) / (1000 * 60 * 60 * 24));
                stats[c.assigned_officer].resolvedCases.push(days);
            }
        });

        Object.keys(stats).forEach(officer => {
            if (stats[officer].resolvedCases.length > 0) {
                const sum = stats[officer].resolvedCases.reduce((a, b) => a + b, 0);
                stats[officer].avgResolutionDays = Math.round(sum / stats[officer].resolvedCases.length);
            }
        });

        return stats;
    };

    const calculateTrendData = () => {
        const monthlyData = {};
        
        cases.forEach(c => {
            if (!c.date_opened) return;
            const month = new Date(c.date_opened).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            
            if (!monthlyData[month]) {
                monthlyData[month] = { month, opened: 0, solved: 0 };
            }
            
            monthlyData[month].opened++;
            if (c.status === 'solved' && c.date_closed) {
                const closedMonth = new Date(c.date_closed).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                if (monthlyData[closedMonth]) {
                    monthlyData[closedMonth].solved++;
                }
            }
        });
        
        return Object.values(monthlyData).slice(-6);
    };

    const calculateLocationHeatmap = () => {
        const locationCount = {};
        
        cases.forEach(c => {
            if (c.location) {
                locationCount[c.location] = (locationCount[c.location] || 0) + 1;
            }
        });
        
        return Object.entries(locationCount)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    };

    const predictCaseDuration = (priority) => {
        const historicalData = cases.filter(c => 
            c.priority === priority && 
            c.date_opened && 
            c.date_closed &&
            (c.status === 'solved' || c.status === 'closed')
        );
        
        if (historicalData.length === 0) return null;
        
        const durations = historicalData.map(c => {
            const opened = new Date(c.date_opened);
            const closed = new Date(c.date_closed);
            return Math.ceil((closed - opened) / (1000 * 60 * 60 * 24));
        });
        
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        return Math.round(avg);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading performance data...</div>
            </div>
        );
    }

    const officerStats = calculateOfficerStats();
    const officers = Object.keys(officerStats).sort((a, b) => 
        officerStats[b].solved - officerStats[a].solved
    );
    
    const trendData = calculateTrendData();
    const locationData = calculateLocationHeatmap();
    
    const statusDistribution = [
        { name: 'Open', value: cases.filter(c => c.status === 'open').length, color: '#3b82f6' },
        { name: 'Investigating', value: cases.filter(c => c.status === 'investigating').length, color: '#f59e0b' },
        { name: 'Solved', value: cases.filter(c => c.status === 'solved').length, color: '#10b981' },
        { name: 'Cold Case', value: cases.filter(c => c.status === 'cold_case').length, color: '#64748b' },
        { name: 'Closed', value: cases.filter(c => c.status === 'closed').length, color: '#6b7280' }
    ].filter(item => item.value > 0);

    const predictedDurations = [
        { priority: 'Critical', days: predictCaseDuration('critical') || 0 },
        { priority: 'High', days: predictCaseDuration('high') || 0 },
        { priority: 'Medium', days: predictCaseDuration('medium') || 0 },
        { priority: 'Low', days: predictCaseDuration('low') || 0 }
    ].filter(item => item.days > 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-8 h-8 text-amber-500" />
                        <h1 className="text-4xl font-bold text-slate-100">Officer Performance</h1>
                    </div>
                    <p className="text-slate-400">Track and analyze officer case statistics and resolution rates</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-amber-500" />
                                Case Resolution Trends
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                        <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            labelStyle={{ color: '#f1f5f9' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Line type="monotone" dataKey="opened" stroke="#f59e0b" strokeWidth={2} name="Opened" />
                                        <Line type="monotone" dataKey="solved" stroke="#10b981" strokeWidth={2} name="Solved" />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-12 text-slate-500">No trend data available</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-amber-500" />
                                Location Heatmap
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {locationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={locationData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                        <YAxis dataKey="location" type="category" stroke="#94a3b8" style={{ fontSize: '10px' }} width={120} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            labelStyle={{ color: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="count" fill="#f59e0b" name="Cases" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-12 text-slate-500">No location data available</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                                Case Status Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {statusDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-12 text-slate-500">No status data available</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                Predicted Case Duration (by Priority)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {predictedDurations.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={predictedDurations}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="priority" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                        <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            labelStyle={{ color: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="days" fill="#8b5cf6" name="Avg Days" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-12 text-slate-500">Insufficient historical data for predictions</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {officers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <Award className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-400 mb-2">No officer data available</h3>
                        <p className="text-slate-500">Assign officers to cases to see performance metrics</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {officers.map((officer, index) => {
                            const stats = officerStats[officer];
                            const solveRate = stats.totalCases > 0 
                                ? Math.round((stats.solved / stats.totalCases) * 100) 
                                : 0;

                            return (
                                <motion.div
                                    key={officer}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="bg-slate-900/50 border-slate-700/50 hover:border-amber-500/30 transition-all backdrop-blur-sm">
                                        <CardHeader className="border-b border-slate-700">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-xl text-slate-100 mb-2">
                                                        {officer}
                                                    </CardTitle>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`${
                                                            solveRate >= 75 ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                                            solveRate >= 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                                            'bg-slate-500/20 text-slate-300 border-slate-500/30'
                                                        }`}
                                                    >
                                                        {solveRate}% Solve Rate
                                                    </Badge>
                                                </div>
                                                {index === 0 && stats.solved > 0 && (
                                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                                                        <Award className="w-3 h-3 mr-1" />
                                                        Top Performer
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FolderOpen className="w-4 h-4 text-blue-400" />
                                                        <span className="text-sm text-slate-400">Total Cases</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-slate-100">
                                                        {stats.totalCases}
                                                    </div>
                                                </div>

                                                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                        <span className="text-sm text-slate-400">Solved</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-green-400">
                                                        {stats.solved}
                                                    </div>
                                                </div>

                                                {stats.avgResolutionDays > 0 && (
                                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 col-span-2">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Clock className="w-4 h-4 text-amber-400" />
                                                            <span className="text-sm text-slate-400">Avg Resolution Time</span>
                                                        </div>
                                                        <div className="text-2xl font-bold text-amber-400">
                                                            {stats.avgResolutionDays} days
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-sm text-slate-500 mb-3">Case Status Breakdown</div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div className="text-center">
                                                        <div className="text-lg font-semibold text-blue-400">{stats.open}</div>
                                                        <div className="text-xs text-slate-500">Open</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-semibold text-amber-400">{stats.investigating}</div>
                                                        <div className="text-xs text-slate-500">Investigating</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-semibold text-green-400">{stats.solved}</div>
                                                        <div className="text-xs text-slate-500">Solved</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-semibold text-slate-400">{stats.closed}</div>
                                                        <div className="text-xs text-slate-500">Closed</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}