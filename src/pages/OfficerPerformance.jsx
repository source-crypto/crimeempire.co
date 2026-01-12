import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trophy, Target, Clock, CheckCircle, TrendingUp, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function OfficerPerformance() {
    const { data: cases = [], isLoading } = useQuery({
        queryKey: ['cases-analytics'],
        queryFn: () => base44.entities.Case.list(),
    });

    const analytics = useMemo(() => {
        const officers = {};
        
        cases.forEach(caseItem => {
            if (!caseItem.assigned_officer) return;
            
            if (!officers[caseItem.assigned_officer]) {
                officers[caseItem.assigned_officer] = {
                    name: caseItem.assigned_officer,
                    total: 0,
                    solved: 0,
                    closed: 0,
                    open: 0,
                    investigating: 0,
                    critical: 0,
                    high: 0,
                    avgDays: 0,
                    totalDays: 0,
                    closedCount: 0
                };
            }
            
            const officer = officers[caseItem.assigned_officer];
            officer.total++;
            
            if (caseItem.status === 'solved') officer.solved++;
            if (caseItem.status === 'closed') officer.closed++;
            if (caseItem.status === 'open') officer.open++;
            if (caseItem.status === 'investigating') officer.investigating++;
            
            if (caseItem.priority === 'critical') officer.critical++;
            if (caseItem.priority === 'high') officer.high++;
            
            if (caseItem.date_opened && caseItem.date_closed) {
                const days = Math.floor((new Date(caseItem.date_closed) - new Date(caseItem.date_opened)) / (1000 * 60 * 60 * 24));
                officer.totalDays += days;
                officer.closedCount++;
            }
        });
        
        Object.values(officers).forEach(officer => {
            if (officer.closedCount > 0) {
                officer.avgDays = Math.round(officer.totalDays / officer.closedCount);
            }
        });
        
        return Object.values(officers).sort((a, b) => b.total - a.total);
    }, [cases]);

    const statusDistribution = useMemo(() => {
        const statuses = { open: 0, investigating: 0, solved: 0, cold_case: 0, closed: 0 };
        cases.forEach(c => statuses[c.status]++);
        return Object.entries(statuses).map(([name, value]) => ({ name, value }));
    }, [cases]);

    const priorityDistribution = useMemo(() => {
        const priorities = { low: 0, medium: 0, high: 0, critical: 0 };
        cases.forEach(c => priorities[c.priority]++);
        return Object.entries(priorities).map(([name, value]) => ({ name, value }));
    }, [cases]);

    const monthlyTrend = useMemo(() => {
        const months = {};
        cases.forEach(c => {
            const month = new Date(c.date_opened).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (!months[month]) months[month] = { month, opened: 0, solved: 0 };
            months[month].opened++;
            if (c.status === 'solved' || c.status === 'closed') months[month].solved++;
        });
        return Object.values(months).slice(-6);
    }, [cases]);

    const locationData = useMemo(() => {
        const locations = {};
        cases.forEach(c => {
            if (c.location) {
                locations[c.location] = (locations[c.location] || 0) + 1;
            }
        });
        return Object.entries(locations)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [cases]);

    const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold text-slate-100 mb-2">Officer Performance Analytics</h1>
                    <p className="text-slate-400">Comprehensive insights and statistics</p>
                </motion.div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm">Total Cases</p>
                                    <p className="text-3xl font-bold text-slate-100 mt-1">{cases.length}</p>
                                </div>
                                <Target className="w-10 h-10 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm">Solved Cases</p>
                                    <p className="text-3xl font-bold text-green-400 mt-1">
                                        {cases.filter(c => c.status === 'solved').length}
                                    </p>
                                </div>
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm">Active Officers</p>
                                    <p className="text-3xl font-bold text-blue-400 mt-1">{analytics.length}</p>
                                </div>
                                <Trophy className="w-10 h-10 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm">Avg Resolution</p>
                                    <p className="text-3xl font-bold text-purple-400 mt-1">
                                        {Math.round(analytics.reduce((acc, o) => acc + o.avgDays, 0) / analytics.length) || 0}d
                                    </p>
                                </div>
                                <Clock className="w-10 h-10 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-slate-100 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                                Monthly Case Trends
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={monthlyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="month" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                                        labelStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="opened" stroke="#f59e0b" strokeWidth={2} name="Opened" />
                                    <Line type="monotone" dataKey="solved" stroke="#10b981" strokeWidth={2} name="Solved" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-slate-100">Officer Case Load</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.slice(0, 5)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                                        labelStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="total" fill="#f59e0b" name="Total Cases" />
                                    <Bar dataKey="solved" fill="#10b981" name="Solved" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-slate-100 text-lg">Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => entry.name}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-slate-100 text-lg">Priority Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={priorityDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => entry.name}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {priorityDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-amber-500" />
                                Location Heatmap
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                {locationData.map((loc, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-400 mb-1">{loc.location}</div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-500"
                                                    style={{ width: `${(loc.count / locationData[0].count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-amber-500">{loc.count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Officer Details Table */}
                <Card className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader>
                        <CardTitle className="text-slate-100">Detailed Officer Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Officer</th>
                                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Total</th>
                                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Solved</th>
                                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Active</th>
                                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Critical</th>
                                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Avg Days</th>
                                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Success Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.map((officer, idx) => (
                                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="py-3 px-4 text-slate-100">{officer.name}</td>
                                            <td className="py-3 px-4 text-center text-slate-300">{officer.total}</td>
                                            <td className="py-3 px-4 text-center text-green-400">{officer.solved}</td>
                                            <td className="py-3 px-4 text-center text-blue-400">{officer.investigating}</td>
                                            <td className="py-3 px-4 text-center text-red-400">{officer.critical}</td>
                                            <td className="py-3 px-4 text-center text-purple-400">{officer.avgDays || 'N/A'}</td>
                                            <td className="py-3 px-4 text-center text-amber-400">
                                                {officer.total > 0 ? Math.round((officer.solved / officer.total) * 100) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}