import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import CaseCard from "../components/cases/CaseCard";
import CaseFormWithNotifications from "../components/cases/CaseFormWithNotifications";
import CaseFilters from "../components/cases/CaseFilters";

export default function Cases() {
    const [showForm, setShowForm] = useState(false);
    const [editingCase, setEditingCase] = useState(null);
    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        priority: "all"
    });

    const queryClient = useQueryClient();

    const { data: cases = [], isLoading } = useQuery({
        queryKey: ['cases'],
        queryFn: () => base44.entities.Case.list('-created_date'),
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Case.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            setShowForm(false);
            setEditingCase(null);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Case.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            setShowForm(false);
            setEditingCase(null);
        },
    });

    const handleSubmit = (data) => {
        if (editingCase) {
            updateMutation.mutate({ id: editingCase.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (caseItem) => {
        setEditingCase(caseItem);
        setShowForm(true);
    };

    const filteredCases = cases.filter(c => {
        const searchMatch = !filters.search || 
            c.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
            c.case_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
            c.description?.toLowerCase().includes(filters.search.toLowerCase());
        
        const statusMatch = filters.status === "all" || c.status === filters.status;
        const priorityMatch = filters.priority === "all" || c.priority === filters.priority;
        
        return searchMatch && statusMatch && priorityMatch;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading cases...</div>
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
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-100 mb-2">Case Management</h1>
                            <p className="text-slate-400">Track and manage criminal investigations</p>
                        </div>
                        <Button
                            onClick={() => {
                                setEditingCase(null);
                                setShowForm(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Case
                        </Button>
                    </div>

                    <CaseFilters filters={filters} onFilterChange={setFilters} />
                </motion.div>

                {filteredCases.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <FolderOpen className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-400 mb-2">No cases found</h3>
                        <p className="text-slate-500 mb-6">
                            {filters.search || filters.status !== "all" || filters.priority !== "all" 
                                ? "Try adjusting your filters" 
                                : "Create your first case to get started"}
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredCases.map((caseItem) => (
                            <CaseCard key={caseItem.id} caseItem={caseItem} />
                        ))}
                    </div>
                )}

                <AnimatePresence>
                    {showForm && (
                        <CaseFormWithNotifications
                            caseData={editingCase}
                            onSubmit={handleSubmit}
                            onCancel={() => {
                                setShowForm(false);
                                setEditingCase(null);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}