import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Edit, Calendar, MapPin, User, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import StatusBadge from "../components/cases/StatusBadge";
import PriorityBadge from "../components/cases/PriorityBadge";
import EvidenceCard from "../components/evidence/EvidenceCard";
import EvidenceForm from "../components/evidence/EvidenceForm";
import EvidenceDetailView from "../components/evidence/EvidenceDetailView";
import CaseForm from "../components/cases/CaseForm";
import CaseNotesLog from "../components/notes/CaseNotesLog";

export default function CaseDetail() {
    const [showEvidenceForm, setShowEvidenceForm] = useState(false);
    const [showCaseForm, setShowCaseForm] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id');

    const queryClient = useQueryClient();

    const { data: caseItem, isLoading: caseLoading } = useQuery({
        queryKey: ['case', caseId],
        queryFn: async () => {
            const cases = await base44.entities.Case.filter({ id: caseId });
            return cases[0];
        },
        enabled: !!caseId,
    });

    const { data: evidence = [] } = useQuery({
        queryKey: ['evidence', caseId],
        queryFn: () => base44.entities.Evidence.filter({ case_id: caseId }, '-created_date'),
        enabled: !!caseId,
    });

    const createEvidenceMutation = useMutation({
        mutationFn: (data) => base44.entities.Evidence.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidence', caseId] });
            setShowEvidenceForm(false);
        },
    });

    const updateCaseMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Case.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            setShowCaseForm(false);
        },
    });

    if (caseLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-amber-500 text-lg">Loading case details...</div>
            </div>
        );
    }

    if (!caseItem) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-slate-400 text-lg">Case not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Link to={createPageUrl('Cases')}>
                        <Button variant="ghost" className="text-slate-400 hover:text-slate-100 mb-6">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Cases
                        </Button>
                    </Link>

                    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mb-6">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-sm font-mono text-slate-500">#{caseItem.case_number}</span>
                                        <StatusBadge status={caseItem.status} />
                                        <PriorityBadge priority={caseItem.priority} />
                                    </div>
                                    <CardTitle className="text-3xl text-slate-100 mb-3">
                                        {caseItem.title}
                                    </CardTitle>
                                    <p className="text-slate-400">
                                        {caseItem.description}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setShowCaseForm(true)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Case
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                                {caseItem.assigned_officer && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg">
                                            <User className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Assigned Officer</div>
                                            <div className="text-slate-300">{caseItem.assigned_officer}</div>
                                        </div>
                                    </div>
                                )}
                                {caseItem.location && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg">
                                            <MapPin className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Location</div>
                                            <div className="text-slate-300">{caseItem.location}</div>
                                        </div>
                                    </div>
                                )}
                                {caseItem.date_opened && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg">
                                            <Calendar className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Date Opened</div>
                                            <div className="text-slate-300">
                                                {format(new Date(caseItem.date_opened), 'MMMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-6">
                        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-6 h-6 text-amber-500" />
                                        <CardTitle className="text-2xl text-slate-100">
                                            Evidence ({evidence.length})
                                        </CardTitle>
                                    </div>
                                    <Button
                                        onClick={() => setShowEvidenceForm(true)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Evidence
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {evidence.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                                        <p className="text-slate-500">No evidence added yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {evidence.map((item) => (
                                            <EvidenceCard 
                                                key={item.id} 
                                                evidence={item}
                                                onViewDetails={setSelectedEvidence}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <CaseNotesLog caseId={caseId} />
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showEvidenceForm && (
                        <EvidenceForm
                            caseId={caseId}
                            onSubmit={(data) => createEvidenceMutation.mutate(data)}
                            onCancel={() => setShowEvidenceForm(false)}
                        />
                    )}
                    {showCaseForm && (
                        <CaseForm
                            caseData={caseItem}
                            onSubmit={(data) => updateCaseMutation.mutate({ id: caseItem.id, data })}
                            onCancel={() => setShowCaseForm(false)}
                        />
                    )}
                    {selectedEvidence && (
                        <EvidenceDetailView
                            evidence={selectedEvidence}
                            onClose={() => setSelectedEvidence(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}