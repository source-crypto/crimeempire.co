import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import EvidenceCard from "../components/evidence/EvidenceCard";

export default function EvidenceSearch() {
    const [filters, setFilters] = useState({
        search: "",
        type: "all",
        collectedBy: "",
        dateFrom: "",
        dateTo: ""
    });
    const [showAdvanced, setShowAdvanced] = useState(false);

    const { data: allEvidence = [], isLoading } = useQuery({
        queryKey: ['all-evidence'],
        queryFn: () => base44.entities.Evidence.list('-created_date'),
    });

    const { data: cases = [] } = useQuery({
        queryKey: ['cases-for-evidence'],
        queryFn: () => base44.entities.Case.list(),
    });

    const filteredEvidence = allEvidence.filter(evidence => {
        const searchMatch = !filters.search || 
            evidence.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
            evidence.evidence_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
            evidence.type?.toLowerCase().includes(filters.search.toLowerCase());
        
        const typeMatch = filters.type === "all" || evidence.type === filters.type;
        
        const collectorMatch = !filters.collectedBy || 
            evidence.collected_by?.toLowerCase().includes(filters.collectedBy.toLowerCase());
        
        const dateFromMatch = !filters.dateFrom || 
            new Date(evidence.collection_date) >= new Date(filters.dateFrom);
        
        const dateToMatch = !filters.dateTo || 
            new Date(evidence.collection_date) <= new Date(filters.dateTo);
        
        return searchMatch && typeMatch && collectorMatch && dateFromMatch && dateToMatch;
    });

    const evidenceWithCases = filteredEvidence.map(evidence => ({
        ...evidence,
        case: cases.find(c => c.id === evidence.case_id)
    }));

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading evidence...</div>
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
                    <h1 className="text-4xl font-bold text-slate-100 mb-2">Evidence Search</h1>
                    <p className="text-slate-400">Search and filter evidence across all cases</p>
                </motion.div>

                <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm mb-6">
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <Input
                                    placeholder="Search evidence by description, number, or type..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                                    className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="border-slate-700 text-slate-300"
                            >
                                <SlidersHorizontal className="w-4 h-4 mr-2" />
                                Filters
                            </Button>
                        </div>

                        {showAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700"
                            >
                                <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
                                        <SelectValue placeholder="Type" />
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

                                <Input
                                    placeholder="Collected by..."
                                    value={filters.collectedBy}
                                    onChange={(e) => setFilters({...filters, collectedBy: e.target.value})}
                                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                                />

                                <Input
                                    type="date"
                                    placeholder="From date"
                                    value={filters.dateFrom}
                                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                                />

                                <Input
                                    type="date"
                                    placeholder="To date"
                                    value={filters.dateTo}
                                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                                />
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-slate-400">
                        Found <span className="text-amber-500 font-semibold">{filteredEvidence.length}</span> evidence items
                    </p>
                </div>

                {filteredEvidence.length === 0 ? (
                    <div className="text-center py-20">
                        <Filter className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-400 mb-2">No evidence found</h3>
                        <p className="text-slate-500">Try adjusting your search filters</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {evidenceWithCases.map((evidence) => (
                            <div key={evidence.id}>
                                {evidence.case && (
                                    <div className="text-xs text-slate-500 mb-1 ml-1">
                                        Case: <span className="text-amber-500">#{evidence.case.case_number}</span> - {evidence.case.title}
                                    </div>
                                )}
                                <EvidenceCard evidence={evidence} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}