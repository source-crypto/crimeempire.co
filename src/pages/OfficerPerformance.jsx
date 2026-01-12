import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, FolderOpen, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

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
                    resolvedCases: []
                };
            }

            stats[c.assigned_officer].totalCases++;

            if (c.status === 'solved') stats[c.assigned_officer].solved++;
            else if (c.status === 'investigating') stats[c.assigned_officer].investigating++;
            else if (c.status === 'open') stats[c.assigned_officer].open++;
            else if (c.status === 'closed') stats[c.assigned_officer].closed++;

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