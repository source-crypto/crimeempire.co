import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Calendar, User, FileText, SortAsc, SortDesc } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EvidenceSearch() {
    const [filters, setFilters] = useState({
        keyword: "",
        type: "all",
        collectedBy: "",
        dateFrom: "",
        dateTo: ""
    });
    const [sortBy, setSortBy] = useState("date_desc");

    const { data: allEvidence = [], isLoading: evidenceLoading } = useQuery({
        queryKey: ['all-evidence'],
        queryFn: () => base44.entities.Evidence.list('-created_date'),
    });

    const { data: allCases = [] } = useQuery({
        queryKey: ['all-cases-map'],
        queryFn: () => base44.entities.Case.list(),
    });

    const casesMap = allCases.reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
    }, {});

    const filteredEvidence = allEvidence.filter(evidence => {
        const keywordMatch = !filters.keyword || 
            evidence.description?.toLowerCase().includes(filters.keyword.toLowerCase()) ||
            evidence.evidence_number?.toLowerCase().includes(filters.keyword.toLowerCase());
        
        const typeMatch = filters.type === "all" || evidence.type === filters.type;
        
        const collectedByMatch = !filters.collectedBy || 
            evidence.collected_by?.toLowerCase().includes(filters.collectedBy.toLowerCase());
        
        let dateMatch = true;
        if (filters.dateFrom && evidence.collection_date) {
            dateMatch = dateMatch && new Date(evidence.collection_date) >= new Date(filters.dateFrom);
        }
        if (filters.dateTo && evidence.collection_date) {
            dateMatch = dateMatch && new Date(evidence.collection_date) <= new Date(filters.dateTo);
        }
        
        return keywordMatch && typeMatch && collectedByMatch && dateMatch;
    });

    const sortedEvidence = [...filteredEvidence].sort((a, b) => {
        switch (sortBy) {
            case "date_asc":
                return new Date(a.collection_date || 0) - new Date(b.collection_date || 0);
            case "date_desc":
                return new Date(b.collection_date || 0) - new Date(a.collection_date || 0);
            case "type":
                return (a.type || "").localeCompare(b.type || "");
            case "number":
                return (a.evidence_number || "").localeCompare(b.evidence_number || "");
            default:
                return 0;
        }
    });

    const typeColors = {
        physical: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        digital: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        document: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        testimony: "bg-green-500/20 text-green-300 border-green-500/30",
        photo: "bg-pink-500/20 text-pink-300 border-pink-500/30",
        video: "bg-red-500/20 text-red-300 border-red-500/30",
        forensic: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    };

    const resetFilters = () => {
        setFilters({
            keyword: "",
            type: "all",
            collectedBy: "",
            dateFrom: "",
            dateTo: ""
        });
    };

    if (evidenceLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading evidence database...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Search className="w-8 h-8 text-amber-500" />
                        <h1 className="text-4xl font-bold text-slate-100">Evidence Search</h1>
                    </div>
                    <p className="text-slate-400">Search and filter evidence across all cases</p>
                </motion.div>

                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-amber-500" />
                                <CardTitle className="text-xl text-slate-100">Filters</CardTitle>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={resetFilters}
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                Reset
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Keyword Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        value={filters.keyword}
                                        onChange={(e) => setFilters({...filters, keyword: e.target.value})}
                                        placeholder="Search description, number..."
                                        className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Evidence Type</label>
                                <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="physical">Physical</SelectItem>
                                        <SelectItem value="digital">Digital</SelectItem>
                                        <SelectItem value="document">Document</SelectItem>
                                        <SelectItem value="testimony">Testimony</SelectItem>
                                        <SelectItem value="photo">Photo</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="forensic">Forensic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Collected By</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        value={filters.collectedBy}
                                        onChange={(e) => setFilters({...filters, collectedBy: e.target.value})}
                                        placeholder="Officer name..."
                                        className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Date From</label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Date To</label>
                                <Input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                                    className="bg-slate-800 border-slate-700 text-slate-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sort By</label>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                                        <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                                        <SelectItem value="type">Type</SelectItem>
                                        <SelectItem value="number">Evidence Number</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-400">
                        Found <span className="text-amber-500 font-semibold">{sortedEvidence.length}</span> evidence items
                    </div>
                </div>

                {sortedEvidence.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <FileText className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-400 mb-2">No evidence found</h3>
                        <p className="text-slate-500">Try adjusting your search filters</p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence>
                            {sortedEvidence.map((evidence, index) => {
                                const relatedCase = casesMap[evidence.case_id];
                                return (
                                    <motion.div
                                        key={evidence.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <Card className="bg-slate-900/50 border-slate-700/50 hover:border-amber-500/30 transition-all backdrop-blur-sm">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                            <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600 font-mono">
                                                                {evidence.evidence_number}
                                                            </Badge>
                                                            <Badge variant="outline" className={typeColors[evidence.type]}>
                                                                {evidence.type}
                                                            </Badge>
                                                            {relatedCase && (
                                                                <Link to={createPageUrl(`CaseDetail?id=${relatedCase.id}`)}>
                                                                    <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 cursor-pointer hover:bg-amber-500/30">
                                                                        Case #{relatedCase.case_number}
                                                                    </Badge>
                                                                </Link>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-300 mb-3">{evidence.description}</p>
                                                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                                            {evidence.collected_by && (
                                                                <div className="flex items-center gap-1">
                                                                    <User className="w-4 h-4" />
                                                                    {evidence.collected_by}
                                                                </div>
                                                            )}
                                                            {evidence.collection_date && (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="w-4 h-4" />
                                                                    {format(new Date(evidence.collection_date), 'MMM d, yyyy')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {relatedCase && (
                                                        <div className="flex items-center">
                                                            <Link to={createPageUrl(`CaseDetail?id=${relatedCase.id}`)}>
                                                                <Button className="bg-amber-600 hover:bg-amber-700">
                                                                    View Case
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}